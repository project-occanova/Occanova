import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sendVerificationEmail} from '../src/lib/email';

test('verification email is sent to the exact registration address and returns confirmed provider acceptance',async()=>{
 const originalFetch=globalThis.fetch,keys=['RESEND_API_KEY','EMAIL_FROM','LOCAL_PREVIEW'],old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 Object.assign(process.env,{RESEND_API_KEY:'fixture',EMAIL_FROM:'Occanova <info@example.com>',LOCAL_PREVIEW:'false'});
 try{
  let attempts=0;
  globalThis.fetch=async(input,init)=>{attempts++;assert.equal(String(input),'https://api.resend.com/emails');const body=JSON.parse(String(init?.body));assert.deepEqual(body.to,['vendor@example.com']);assert.match(body.text,/\/verify\?token=/);assert.match(body.text,/resend-verification/);return Response.json({id:'provider-reference'});};
  assert.equal(await sendVerificationEmail('vendor@example.com','a'.repeat(64)),'provider-reference');assert.equal(attempts,1);
  globalThis.fetch=async()=>Response.json({});await assert.rejects(sendVerificationEmail('vendor@example.com','b'.repeat(64)),/could not be confirmed/);
  globalThis.fetch=async()=>new Response('mock send failure',{status:503});await assert.rejects(sendVerificationEmail('vendor@example.com','c'.repeat(64)),/could not send/);
  globalThis.fetch=async()=>{throw Error('mock timeout');};await assert.rejects(sendVerificationEmail('vendor@example.com','d'.repeat(64)),/timeout/);
 }finally{globalThis.fetch=originalFetch;for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}}
});
