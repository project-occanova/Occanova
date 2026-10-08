import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {startRegistration,activateRegistration,changeRegistrationPhone} from '../src/lib/registration';
import {consumeMobileChallenge,saveMobileChallenge} from '../src/lib/mobile-otp';
import {prepareSubscription,trialEnd,type RazorpaySubscription} from '../src/lib/subscriptions';
import type {VendorSubscription} from '../src/lib/types';
const now=Date.parse('2026-09-28T10:00:00Z');
const input={email:'registration@example.com',phone:'+919876543210',passwordHash:'hashed-password',plan:'starter' as const,autopayConsent:true,verificationHash:'hashed-token',mobileVerificationRequired:true};
function fixture(){
 const state=initialState();const pending=startRegistration(state,input,now);pending.verified=true;pending.phoneVerified=true;pending.phoneVerifiedAt=new Date(now).toISOString();
 pending.subscription={plan:'starter',status:'created',gatewayId:'sub_test',gatewayPlanId:'plan_test',trialEndsAt:'2026-11-28T10:00:00Z',updatedAt:new Date(now).toISOString()};
 const remote:RazorpaySubscription={id:'sub_test',plan_id:'plan_test',status:'authenticated',start_at:Math.floor(Date.parse(pending.subscription.trialEndsAt!)/1000),paid_count:0,quantity:1,total_count:96,notes:{occanova_registration_id:pending.id}};
 return {state,pending,remote};
}
test('registration requires explicit AutoPay consent and creates no vendor account or session',()=>{
 const state=initialState();assert.throws(()=>startRegistration(state,{...input,autopayConsent:false},now),/Agree/);assert.equal(state.registrations.length,0);
 startRegistration(state,input,now);assert.equal(state.registrations.length,1);assert.equal(state.users.length,0);assert.equal(state.sessions.length,0);assert.equal(state.registrations[0].subscription,undefined);
});
test('email verification alone and non-authorized mandates cannot activate registration',()=>{
 for(const status of ['created','cancelled','expired','pending','halted']){const {state,pending,remote}=fixture();assert.throws(()=>activateRegistration(state,pending.id,{...remote,status},now));assert.equal(state.users.length,0);}
 const {state,pending,remote}=fixture();pending.verified=false;assert.throws(()=>activateRegistration(state,pending.id,remote,now),/Verify/);assert.equal(state.users.length,0);
 const missingMobile=fixture();missingMobile.pending.phoneVerified=false;assert.throws(()=>activateRegistration(missingMobile.state,missingMobile.pending.id,missingMobile.remote,now),/mobile/);assert.equal(missingMobile.state.users.length,0);
});
test('gateway ownership, plan, debit schedule and cycle count are checked before activation',()=>{
 for(const change of [{id:'sub_other'},{plan_id:'plan_other'},{start_at:0},{start_at:now/1000},{quantity:2},{total_count:1},{notes:{occanova_registration_id:'other'}}]){const {state,pending,remote}=fixture();assert.throws(()=>activateRegistration(state,pending.id,{...remote,...change},now));assert.equal(state.users.length,0);}
});
test('authenticated mandate activates once even when callback and webhook repeat',()=>{
 const {state,pending,remote}=fixture();pending.verificationEmail={status:'accepted',attemptedAt:new Date(now).toISOString(),providerId:'verification-reference'};const first=activateRegistration(state,pending.id,remote,now);const second=activateRegistration(state,pending.id,{...remote,status:'active'},now+1000);
 assert.equal(first.id,second.id);assert.equal(state.users.length,1);assert.equal(first.subscription?.trialUsedAt,new Date(now).toISOString());assert.equal(first.role,'vendor');assert.equal(first.verified,true);assert.equal(first.phoneVerified,true);assert.equal(first.phoneVerifiedAt,pending.phoneVerifiedAt);assert.equal(state.sessions.length,0);assert.deepEqual(first.verificationEmail,pending.verificationEmail);
});
test('changing a pending mobile number invalidates its OTP and checks uniqueness',()=>{
 const state=initialState();const pending=startRegistration(state,input,now);pending.verified=true;
 saveMobileChallenge(state,pending.id,pending.phone,'123456',now);
 changeRegistrationPhone(state,pending.id,'+91 98765 43211');
 assert.equal(pending.phone,'+919876543211');assert.equal(state.tokens.length,0);
 assert.equal(consumeMobileChallenge(state,pending.id,pending.phone,'123456',now+1),false);
 state.users.push({id:'other',email:'other@example.com',phone:'+919876543212',passwordHash:'hash',role:'vendor',verified:true});
 assert.throws(()=>changeRegistrationPhone(state,pending.id,'9876543212'),/already uses/);
 pending.subscription={plan:'starter',status:'created',gatewayId:'sub_started',updatedAt:new Date(now).toISOString()};
 assert.throws(()=>changeRegistrationPhone(state,pending.id,'9876543213'),/cannot be changed/);
});
test('previous in-flight registrations can finish and verify mobile in the dashboard',()=>{
 const {state,pending,remote}=fixture();pending.mobileVerificationRequired=undefined;pending.phoneVerified=false;
 const user=activateRegistration(state,pending.id,remote,now);assert.equal(user.phoneVerified,false);
});
test('duplicate email or phone cannot produce another registration or active account',()=>{
 for(const identity of ['email','phone'] as const){const {state,pending,remote}=fixture();assert.throws(()=>startRegistration(state,{...input,[identity]:pending[identity]},now),/already in progress/);
 state.users.push({id:'other',email:identity==='email'?input.email:'other@example.com',phone:identity==='phone'?input.phone:'+918765432109',passwordHash:'hash',role:'vendor',verified:true});assert.throws(()=>activateRegistration(state,pending.id,remote,now),/already uses/);assert.equal(state.users.length,1);}
});
test('registration can restart after recovery expires; a gateway-linked registration is retained',()=>{
 const state=initialState();startRegistration(state,input,now);assert.throws(()=>startRegistration(state,input,now+86400001),/already in progress/);const fresh=startRegistration(state,input,now+30*86400000+1);assert.equal(state.registrations.length,1);fresh.subscription={plan:'starter',status:'created',gatewayId:'sub_keep',updatedAt:new Date(now).toISOString()};
 assert.throws(()=>startRegistration(state,input,now+65*86400000),/already in progress/);assert.equal(state.registrations[0].subscription!.gatewayId,'sub_keep');
});
test('checkout creation uses server price and two months from setup; reuse, retry and remaining trial are safe',async t=>{
 const originalFetch=globalThis.fetch;const keys=['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_PLAN_STARTER','RAZORPAY_PLAN_PRO'];const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 Object.assign(process.env,{RAZORPAY_KEY_ID:'rzp_test_mock',RAZORPAY_KEY_SECRET:'mock-secret',RAZORPAY_PLAN_STARTER:'plan_starter',RAZORPAY_PLAN_PRO:'plan_pro'});
 let existing:VendorSubscription|undefined;let previous:RazorpaySubscription|undefined;let amount=19900;let calls:string[]=[];let post:Record<string,unknown>={};
 globalThis.fetch=async(url,init)=>{const path=String(url).split('/v1/')[1];calls.push(`${init?.method} ${path}`);const body=init?.body?JSON.parse(String(init.body)):{};
 let result:unknown;
 if(path?.startsWith('plans/'))result={id:path.split('/')[1],period:'monthly',interval:1,item:{amount,currency:'INR'}};
 else if(init?.method==='GET')result=previous;
 else if(path.endsWith('/cancel'))result={...previous,status:'cancelled'};
 else{post=body;result={id:'sub_new',plan_id:body.plan_id,status:'created',start_at:body.start_at,paid_count:0,quantity:1,total_count:96,expire_by:body.expire_by,notes:body.notes};}
 return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
 await t.test('fresh checkout schedules two calendar months from setup',async()=>{const before=trialEnd(new Date()).getTime();existing=await prepareSubscription('starter',undefined,{occanova_registration_id:'pending'});const after=trialEnd(new Date()).getTime();const scheduled=Date.parse(existing.trialEndsAt!);assert.ok(scheduled>=before-1000&&scheduled<=after);assert.equal(post.total_count,96);assert.equal(post.quantity,1);assert.ok(Number(post.expire_by)<=Date.now()/1000+1800);assert.equal('amount' in post,false);});
 await t.test('retry reuses unexpired subscription without creating another mandate',async()=>{calls=[];previous={id:existing!.gatewayId!,plan_id:'plan_starter',status:'created',start_at:Date.parse(existing!.trialEndsAt!)/1000,paid_count:0,quantity:1,total_count:96,expire_by:Date.now()/1000+1000};assert.equal((await prepareSubscription('starter',existing,{})).gatewayId,existing!.gatewayId);assert.deepEqual(calls,['GET subscriptions/sub_new']);});
 await t.test('changing plan cancels old unfinished checkout before replacement',async()=>{calls=[];amount=49900;await prepareSubscription('pro',existing,{});assert.deepEqual(calls,['GET subscriptions/sub_new','POST subscriptions/sub_new/cancel','GET plans/plan_pro','POST subscriptions']);});
 await t.test('already authorized mandate cannot silently be replaced',async()=>{previous!.status='authenticated';calls=[];await assert.rejects(()=>prepareSubscription('pro',existing,{}),/already authorized/);assert.equal(calls.length,1);});
 await t.test('incorrect gateway plan price fails closed',async()=>{calls=[];amount=100;await assert.rejects(()=>prepareSubscription('starter',undefined,{}),/agreed price/);assert.deepEqual(calls,['GET plans/plan_starter']);});
  await t.test('re-authorizing preserves remaining trial and never grants a fresh trial',async()=>{amount=19900;previous!.status='cancelled';const end=new Date(Date.now()+86400000).toISOString();await prepareSubscription('starter',{...existing!,trialUsedAt:new Date().toISOString(),trialEndsAt:end},{});assert.equal(post.start_at,Math.floor(Date.parse(end)/1000));await prepareSubscription('starter',{...existing!,trialUsedAt:new Date().toISOString(),trialEndsAt:new Date(Date.now()-86400000).toISOString()},{});assert.ok(Number(post.start_at)<=Date.now()/1000+600);});
  await t.test('historical paid subscriptions cannot obtain a fresh trial when the marker is missing',async()=>{const prepared=await prepareSubscription('starter',{...existing!,trialUsedAt:undefined,paidCount:1,trialEndsAt:new Date(Date.now()-86400000).toISOString()},{});assert.ok(prepared.trialUsedAt);assert.ok(Number(post.start_at)<=Date.now()/1000+600);});
 }finally{globalThis.fetch=originalFetch;for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}}
});
