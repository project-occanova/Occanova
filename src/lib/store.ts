import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import type {ClientSession} from 'mongodb';
import {mongo,mongoConfigured} from './db';
import {initialState} from './seed';
import type {State} from './types';

const file=path.join(process.cwd(),'data','preview.json');
const globals=globalThis as typeof globalThis&{occanovaQueue?:Promise<unknown>;occanovaSeed?:Promise<void>};
type StateList=keyof State;
type MongoDoc={_id:string;[key:string]:unknown};
type MetaDoc={_id:string;revision:number;initializedAt?:Date};
const collections:StateList[]=['vendors','users','enquiries','sessions','tokens','categories','locations','audit'];
const keys:Record<StateList,string>={vendors:'id',users:'id',enquiries:'id',sessions:'hash',tokens:'hash',categories:'slug',locations:'slug',audit:'id'};
const legacyCategories:Record<string,string>={'Venues':'Venues & Accommodation','Photography':'Photography & Media','Catering':'Catering & Food','Decor & Styling':'Decoration & Florists','Event Planners':'Event Planning & Management','Makeup & Beauty':'Makeup, Fashion & Styling','Music & Entertainment':'Artists & Entertainment'};

function normalize(state:State):State{
  const seeded=initialState();
  for(const name of collections)(state[name] as unknown[])??=(seeded[name] as unknown[]);
  const incoming=state.categories??[];
  state.categories=seeded.categories.map(base=>{
    const saved=incoming.find(x=>(legacyCategories[x.name]||x.name)===base.name);
    return saved?{...base,...saved,name:base.name,slug:base.slug,services:base.services}:{...base};
  });
  const known=new Set(state.categories.map(x=>x.name));
  state.categories.push(...incoming.filter(x=>!known.has(legacyCategories[x.name]||x.name)).map(x=>({...x,services:x.services?.length?x.services:[x.name],phase:x.phase??2})));
  state.vendors=(state.vendors??[]).map(v=>{const category=legacyCategories[v.category]||v.category;const service=v.service||state.categories.find(x=>x.name===category)?.services?.[0]||category;return {...v,category,service,documents:v.documents??[]};});
  return state;
}

async function localRead():Promise<State>{
  try{return normalize(JSON.parse(await readFile(file,'utf8')));}
  catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;return initialState();}
}

function clean<T>(doc:MongoDoc):T{
  const {_id,_order,expiresAt,...value}=doc;
  void _id;void _order;void expiresAt;
  return value as T;
}

async function mongoRead(session?:ClientSession):Promise<State>{
  const {db}=await mongo();
  const result={} as State;
  for(const name of collections){
    const docs=await db.collection<MongoDoc>(name).find({}, {session}).sort({_order:1}).toArray();
    (result[name] as unknown[]) = docs.map(clean);
  }
  return normalize(result);
}

function document(name:StateList,row:Record<string,unknown>,order:number){
  const value={...row,_id:String(row[keys[name]]),_order:order} as MongoDoc;
  if((name==='sessions'||name==='tokens')&&typeof row.expires==='number')value.expiresAt=new Date(row.expires);
  return value;
}

async function writeList(name:StateList,before:Record<string,unknown>[],after:Record<string,unknown>[],session:ClientSession){
  const {db}=await mongo();const collection=db.collection<MongoDoc>(name);const key=keys[name];
  const old=new Map(before.map(x=>[String(x[key]),x]));
  const next=new Set(after.map(x=>String(x[key])));
  const operations=after.flatMap((row,order)=>{
    const previous=old.get(String(row[key]));
    if(previous&&JSON.stringify(previous)===JSON.stringify(row)&&before.indexOf(previous)===order)return [];
    return [{replaceOne:{filter:{_id:String(row[key])},replacement:document(name,row,order),upsert:true}}];
  });
  const removed=[...old.keys()].filter(id=>!next.has(id));
  if(operations.length)await collection.bulkWrite(operations,{session,ordered:false});
  if(removed.length)await collection.deleteMany({_id:{$in:removed}},{session});
}

async function ensureMongoSeed(){
  globals.occanovaSeed??=(async()=>{
    const {client,db}=await mongo();const session=client.startSession();
    try{
      await session.withTransaction(async()=>{
        const claim=await db.collection<MetaDoc>('meta').updateOne({_id:'state'},{$setOnInsert:{revision:0,initializedAt:new Date()}},{upsert:true,session});
        if(!claim.upsertedCount)return;
        const seed=initialState();
        for(const name of collections){
          const rows=seed[name] as unknown as Record<string,unknown>[];
          if(rows.length)await db.collection<MongoDoc>(name).insertMany(rows.map((row,i)=>document(name,row,i)),{session});
        }
      },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
    }finally{await session.endSession();}
  })();
  return globals.occanovaSeed;
}

export async function readState():Promise<State>{
  if(!mongoConfigured())return localRead();
  await ensureMongoSeed();return mongoRead();
}

async function mongoMutate<T>(fn:(state:State)=>T|Promise<T>){
  await ensureMongoSeed();const {client,db}=await mongo();const session=client.startSession();
  try{return await session.withTransaction(async()=>{
    await db.collection<MetaDoc>('meta').updateOne({_id:'state'},{$inc:{revision:1}},{session});
    const before=await mongoRead(session);const after=structuredClone(before);const result=await fn(after);
    for(const name of collections)await writeList(name,before[name] as unknown as Record<string,unknown>[],after[name] as unknown as Record<string,unknown>[],session);
    return result;
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});}
  finally{await session.endSession();}
}

export async function mutate<T>(fn:(state:State)=>T|Promise<T>):Promise<T>{
  if(mongoConfigured())return mongoMutate(fn);
  const run=(globals.occanovaQueue??Promise.resolve()).then(async()=>{const state=await localRead();const result=await fn(state);await mkdir(path.dirname(file),{recursive:true});const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(state,null,2));await rename(tmp,file);return result;});
  globals.occanovaQueue=run.catch(()=>{});return run;
}
