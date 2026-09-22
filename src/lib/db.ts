import {MongoClient,type Db} from 'mongodb';
import {databaseUrl} from './config';

const globals=globalThis as typeof globalThis&{
  occanovaMongo?:Promise<MongoClient>;
  occanovaIndexes?:Promise<void>;
};

export function mongoConfigured(){return Boolean(databaseUrl());}

async function client(){
  const uri=databaseUrl();
  if(!uri)throw Error('A MongoDB connection URL is not configured.');
  return globals.occanovaMongo??=(new MongoClient(uri,{maxPoolSize:10,serverSelectionTimeoutMS:8000})).connect();
}

async function createIndexes(db:Db){
  await Promise.all([
    (async()=>{const users=db.collection('users');await users.createIndex({email:1},{unique:true});await users.createIndex({phone:1},{unique:true,partialFilterExpression:{phone:{$gt:''}}});})(),
    (async()=>{const vendors=db.collection('vendors');await vendors.createIndex({slug:1},{unique:true});await vendors.createIndex({userId:1},{unique:true,partialFilterExpression:{userId:{$gt:''}}});await vendors.createIndex({status:1,published:1,featured:1,priority:1});await vendors.createIndex({category:1,city:1});})(),
    db.collection('enquiries').createIndex({vendorId:1,createdAt:-1}),
    (async()=>{const sessions=db.collection('sessions');await sessions.createIndex({hash:1},{unique:true});await sessions.createIndex({expiresAt:1},{expireAfterSeconds:0});})(),
    (async()=>{const tokens=db.collection('tokens');await tokens.createIndex({hash:1},{unique:true});await tokens.createIndex({expiresAt:1},{expireAfterSeconds:0});})(),
    db.collection('categories').createIndex({slug:1},{unique:true}),
    db.collection('locations').createIndex({slug:1},{unique:true}),
    db.collection('audit').createIndex({at:-1}),
    db.collection('rateLimits').createIndex({expiresAt:1},{expireAfterSeconds:0}),
  ]);
}

export async function mongo(){
  const connected=await client();
  const db=connected.db(process.env.MONGODB_DB||'occanova');
  globals.occanovaIndexes??=createIndexes(db);
  await globals.occanovaIndexes;
  return {client:connected,db};
}
