import {MongoClient,type Db} from 'mongodb';

const globals=globalThis as typeof globalThis&{
  occanovaMongo?:Promise<MongoClient>;
  occanovaIndexes?:Promise<void>;
};

export function mongoConfigured(){return Boolean(process.env.MONGODB_URI);}

async function client(){
  const uri=process.env.MONGODB_URI;
  if(!uri)throw Error('MONGODB_URI is not configured.');
  return globals.occanovaMongo??=(new MongoClient(uri,{maxPoolSize:10,serverSelectionTimeoutMS:8000})).connect();
}

async function createIndexes(db:Db){
  await db.collection('users').createIndex({email:1},{unique:true});
  await db.collection('users').createIndex({phone:1},{unique:true,partialFilterExpression:{phone:{$gt:''}}});
  await db.collection('vendors').createIndex({slug:1},{unique:true});
  await db.collection('vendors').createIndex({userId:1},{unique:true,partialFilterExpression:{userId:{$gt:''}}});
  await db.collection('vendors').createIndex({status:1,published:1,featured:1,priority:1});
  await db.collection('vendors').createIndex({category:1,city:1});
  await db.collection('enquiries').createIndex({vendorId:1,createdAt:-1});
  await db.collection('sessions').createIndex({hash:1},{unique:true});
  await db.collection('sessions').createIndex({expiresAt:1},{expireAfterSeconds:0});
  await db.collection('tokens').createIndex({hash:1},{unique:true});
  await db.collection('tokens').createIndex({expiresAt:1},{expireAfterSeconds:0});
  await db.collection('categories').createIndex({slug:1},{unique:true});
  await db.collection('locations').createIndex({slug:1},{unique:true});
  await db.collection('audit').createIndex({at:-1});
  await db.collection('rateLimits').createIndex({expiresAt:1},{expireAfterSeconds:0});
}

export async function mongo(){
  const connected=await client();
  const db=connected.db(process.env.MONGODB_DB||'occanova');
  globals.occanovaIndexes??=createIndexes(db);
  await globals.occanovaIndexes;
  return {client:connected,db};
}
