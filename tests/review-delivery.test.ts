import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {initialState} from '../src/lib/seed';
import {notifyVendor} from '../src/lib/vendor-notifications';

test('review email failure preserves approval and unread notice; retry and duplicate delivery are safe',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'occanova-review-')),file=path.join(dir,'preview.json');const keys=['OCCANOVA_PREVIEW_FILE','RESEND_API_KEY','EMAIL_FROM'];const old=Object.fromEntries(keys.map(key=>[key,process.env[key]])),originalFetch=globalThis.fetch;
 Object.assign(process.env,{OCCANOVA_PREVIEW_FILE:file,RESEND_API_KEY:'fixture',EMAIL_FROM:'Occanova <info@example.com>'});
 try{
  const state=initialState();state.users.push({id:'owner',email:'owner@example.com',phone:'',passwordHash:'unused',role:'vendor',verified:true});const vendor={...state.vendors[0],id:'fixture-vendor',name:'QA <business>',userId:'owner',sample:false,status:'approved' as const,published:true};state.vendors.push(vendor);const notice=notifyVendor(state,vendor,'approved')!;await writeFile(file,JSON.stringify(state));
  const {deliverReviewNotification}=await import('../src/lib/review-delivery');let calls=0,fail=true;const requests:{to:string[];html:string;key:string}[]=[];
  globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://api.resend.com/emails');calls++;const body=JSON.parse(String(init!.body));requests.push({...body,key:new Headers(init!.headers).get('Idempotency-Key')});return fail?new Response('Mock failure',{status:503}):Response.json({id:'mail_fixture'});};
  assert.equal(await deliverReviewNotification('owner',notice.notice.id),'failed');let saved=JSON.parse(await readFile(file,'utf8'));assert.equal(saved.vendors.at(-1).status,'approved');assert.equal(saved.users[0].notifications[0].readAt,undefined);assert.equal(saved.users[0].notifications[0].emailStatus,'failed');
  fail=false;const outcomes=await Promise.all([deliverReviewNotification('owner',notice.notice.id),deliverReviewNotification('owner',notice.notice.id)]);assert(outcomes.includes('sent'));assert.equal(calls,2);assert.equal(requests[1].key,requests[0].key);assert.deepEqual(requests[1].to,['owner@example.com']);assert(requests[1].html.includes('QA &lt;business&gt;'));
  assert.equal(await deliverReviewNotification('owner',notice.notice.id),'unchanged');assert.equal(calls,2);saved=JSON.parse(await readFile(file,'utf8'));assert.equal(saved.users[0].notifications[0].emailStatus,'sent');
 }finally{globalThis.fetch=originalFetch;for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}await unlink(file);await rmdir(dir);}
});
