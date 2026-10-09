import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lookupVerificationDelivery,ResendLookupError,verificationDelivery} from '../src/lib/verification-delivery';
import {EmailSendError,sendVerificationEmail} from '../src/lib/email';

test('Resend acceptance is distinct from recipient delivery and suppression',()=>{
 assert.equal(verificationDelivery('sent').state,'pending');
 assert.equal(verificationDelivery('delivered').state,'delivered');
 assert.equal(verificationDelivery('opened').state,'opened');
 for(const event of ['bounced','bounced_transient','bounced_permanent','bounced_undetermined','suppressed','failed','complained'])assert.equal(verificationDelivery(event).state,'failed');
 assert.equal(verificationDelivery('unexpected').state,'unknown');
});

test('delivery lookup accepts only the saved recipient and returns no email body',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://api.resend.com/emails/email_fixture');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer fixture-key');return Response.json({id:'email_fixture',to:['VENDOR@example.com'],last_event:'suppressed',html:'private verification token'});};
  assert.deepEqual(await lookupVerificationDelivery('email_fixture','vendor@example.com','fixture-key'),verificationDelivery('suppressed'));
  await assert.rejects(lookupVerificationDelivery('../not-an-id','vendor@example.com','fixture-key'),/Invalid provider reference/);
  await assert.rejects(lookupVerificationDelivery('email_fixture','other@example.com','fixture-key'),/did not match this recipient/);
  globalThis.fetch=async()=>new Response(null,{status:401});
  await assert.rejects(lookupVerificationDelivery('email_fixture','vendor@example.com','fixture-key'),error=>error instanceof ResendLookupError&&error.status===401);
 }finally{globalThis.fetch=original;}
});

test('verification send failure retains safe provider versus transport classification',async()=>{
 const originalFetch=globalThis.fetch,originalKey=process.env.RESEND_API_KEY,originalFrom=process.env.EMAIL_FROM;
 process.env.RESEND_API_KEY='fixture-key';process.env.EMAIL_FROM='Occanova <info@example.com>';
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({message:'user@example.com was rejected',name:'validation_error'}),{status:403});
  await assert.rejects(sendVerificationEmail('user@example.com','a'.repeat(64)),error=>error instanceof EmailSendError&&error.source==='provider'&&error.httpStatus===403&&!error.message.includes('user@example.com'));
  globalThis.fetch=async()=>{throw Error('network disconnected');};
  await assert.rejects(sendVerificationEmail('user@example.com','a'.repeat(64)),error=>error instanceof EmailSendError&&error.source==='transport'&&!error.message.includes('network disconnected'));
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=originalKey;if(originalFrom===undefined)delete process.env.EMAIL_FROM;else process.env.EMAIL_FROM=originalFrom;}
});
