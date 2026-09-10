import {createHash} from 'node:crypto';
import {mongo,mongoConfigured} from './db';
type RateLimitDoc={_id:string;count:number;expiresAt:Date};

const globals=globalThis as typeof globalThis&{occanovaLimits?:Map<string,{n:number;until:number}>};
const localLimits=globals.occanovaLimits??=new Map();

export async function rateLimited(key:string,max=30,windowMs=60000){
  const now=Date.now();
  if(!mongoConfigured()){
    for(const [k,v] of localLimits)if(v.until<now)localLimits.delete(k);
    const row=localLimits.get(key)??{n:0,until:now+windowMs};row.n++;localLimits.set(key,row);
    return row.n>max;
  }
  const bucket=Math.floor(now/windowMs);
  const id=createHash('sha256').update(`${key}:${bucket}`).digest('hex');
  const {db}=await mongo();
  const row=await db.collection<RateLimitDoc>('rateLimits').findOneAndUpdate(
    {_id:id},{$inc:{count:1},$setOnInsert:{expiresAt:new Date((bucket+2)*windowMs)}},{upsert:true,returnDocument:'after'}
  );
  return Number(row?.count??1)>max;
}
