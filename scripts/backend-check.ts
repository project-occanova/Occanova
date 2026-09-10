import {backendReady,hasDatabase,hasEmail,hasStorage} from '../src/lib/config';
import {mongo} from '../src/lib/db';
import {readState} from '../src/lib/store';

if(!hasDatabase())throw Error('Set MONGODB_URI before running the backend check.');
const {db}=await mongo();
await db.command({ping:1});
const state=await readState();
console.log(JSON.stringify({database:'connected',email:hasEmail()?'configured':'missing',storage:hasStorage()?'configured':'optional/missing',writable:backendReady(),vendors:state.vendors.length,categories:state.categories.length,locations:state.locations.length},null,2));
