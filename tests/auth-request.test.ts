import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authRequest,AuthRequestError} from '../src/lib/auth-request';

test('authentication requests have bounded waiting and actionable recovery for ambiguous network failures',async()=>{
 const original=globalThis.fetch;let sawSignal=false;
 globalThis.fetch=async(_url,init)=>{sawSignal=init?.signal instanceof AbortSignal;throw Error('Internal network detail');};
 try{
  await assert.rejects(()=>authRequest('reset',{token:'fixture'}),e=>e instanceof AuthRequestError&&e.status===0&&/new password/.test(e.message)&&!e.message.includes('Internal'));
  await assert.rejects(()=>authRequest('forgot',{email:'qa@example.com'}),/inbox and spam/);
  await assert.rejects(()=>authRequest('verify',{token:'fixture'}),/Try logging in/);
  assert.equal(sawSignal,true);
 }finally{globalThis.fetch=original;}
});
test('authentication failures preserve safe server messages and refuse non-JSON gateway responses',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json({error:'Please wait before requesting again.'},{status:429});
  await assert.rejects(()=>authRequest('resend',{}),e=>e instanceof AuthRequestError&&e.status===429&&e.message==='Please wait before requesting again.');
  globalThis.fetch=async()=>new Response('<html>Gateway failed</html>',{status:502});
  await assert.rejects(()=>authRequest('forgot',{}),/contact info@occanova.com/);
 }finally{globalThis.fetch=original;}
});
