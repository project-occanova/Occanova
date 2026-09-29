import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {initialState} from '../src/lib/seed';

test('a failed setup save cancels only a new mandate and preserves a replacement lock',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'occanova-checkout-test-')),file=path.join(dir,'preview.json');
 const keys=['OCCANOVA_PREVIEW_FILE','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_PLAN_STARTER'];const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));const originalFetch=globalThis.fetch;
 Object.assign(process.env,{OCCANOVA_PREVIEW_FILE:file,RAZORPAY_KEY_ID:'rzp_test_fixture',RAZORPAY_KEY_SECRET:'fixture',RAZORPAY_PLAN_STARTER:'plan_fixture'});
 try{
  const {setupSubscription}=await import('../src/lib/subscription-setup');
  for(const reuse of [false,true])await t.test(reuse?'an existing mandate is never cancelled by failed retry cleanup':'an uncommitted new mandate is cancelled',async()=>{
   const state=initialState();const start=Math.floor((Date.now()+86400000)/1000);const remote={id:'sub_fixture',plan_id:'plan_fixture',status:'created',start_at:start,paid_count:0,quantity:1,total_count:96,expire_by:Date.now()/1000+1000};
   state.users.push({id:'vendor',email:'fixture@example.com',phone:'',passwordHash:'hash',role:'vendor',verified:true,...(reuse?{subscription:{plan:'starter' as const,status:'created' as const,gatewayId:remote.id,gatewayPlanId:remote.plan_id,trialEndsAt:new Date(start*1000).toISOString(),updatedAt:new Date().toISOString()}}:{})});await writeFile(file,JSON.stringify(state));let cancellations=0;
   globalThis.fetch=async(input,init)=>{
    const url=String(input);if(url.endsWith('/cancel')){cancellations++;return Response.json({...remote,status:'cancelled'});}
    if(url.includes('/plans/'))return Response.json({id:'plan_fixture',period:'monthly',interval:1,item:{amount:19900,currency:'INR'}});
    const current=JSON.parse(await readFile(file,'utf8'));current.users[0].checkoutLock={key:'replacement',expires:Date.now()+120000};await writeFile(file,JSON.stringify(current));
    const body=init?.body?JSON.parse(String(init.body)):{};
    return Response.json({...remote,...(reuse?{}:{start_at:body.start_at,expire_by:body.expire_by})});
   };
   await assert.rejects(()=>setupSubscription('vendor','vendor','starter',{occanova_vendor_id:'vendor'}),/Billing changed/);
   const saved=JSON.parse(await readFile(file,'utf8'));assert.equal(cancellations,reuse?0:1);assert.equal(saved.users[0].checkoutLock.key,'replacement');assert.equal(saved.users[0].subscription?.gatewayId,reuse?'sub_fixture':undefined);
  });
 }finally{globalThis.fetch=originalFetch;for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}await unlink(file);await rmdir(dir);}
});
