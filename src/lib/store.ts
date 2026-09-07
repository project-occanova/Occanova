import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { initialState } from './seed';
import type { State } from './types';
const file=path.join(process.cwd(),'data','preview.json');
const globalStore=globalThis as typeof globalThis & {occanovaQueue?:Promise<unknown>};
// Local single-process preview adapter. Production must use a transactional database adapter.
export async function readState():Promise<State> { try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;return initialState();} }
export async function mutate<T>(fn:(s:State)=>T|Promise<T>):Promise<T> {
  const run=(globalStore.occanovaQueue??Promise.resolve()).then(async()=>{const s=await readState();const result=await fn(s);await mkdir(path.dirname(file),{recursive:true});const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(s,null,2));await rename(tmp,file);return result;});
  globalStore.occanovaQueue=run.catch(()=>{});return run;
}
