import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {startRegistration,activateRegistration} from '../src/lib/registration';
import {registrationCanResume} from '../src/lib/email-verification';
import {registerSchema} from '../src/lib/validation';
import {workspaceVersion} from '../src/lib/workspace-version';
import {billingConfigured,billingMode,type RazorpaySubscription} from '../src/lib/subscriptions';

const input={email:'new@example.com',phone:'+919876543210',passwordHash:'hash',plan:'starter' as const,autopayConsent:true,verificationHash:'token',mobileVerificationRequired:true};
test('Vercel production refuses test billing keys while a local test checkout remains supported',()=>{
 const keys=['VERCEL','VERCEL_ENV','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','RAZORPAY_PLAN_STARTER','RAZORPAY_PLAN_GROWTH','RAZORPAY_PLAN_PRO','RAZORPAY_PLAN_PREMIUM'];const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  Object.assign(process.env,{VERCEL:'1',VERCEL_ENV:'production',RAZORPAY_KEY_ID:'rzp_test_fixture',RAZORPAY_KEY_SECRET:'fixture',RAZORPAY_WEBHOOK_SECRET:'fixture'});for(const plan of ['STARTER','GROWTH','PRO','PREMIUM'])process.env[`RAZORPAY_PLAN_${plan}`]='plan_fixture';
  assert.equal(billingMode(),'test');assert.equal(billingConfigured(),false);process.env.VERCEL='0';assert.equal(billingConfigured(),true);process.env.VERCEL='1';process.env.RAZORPAY_KEY_ID='rzp_live_fixture';assert.equal(billingMode(),'live');assert.equal(billingConfigured(),true);
 }finally{for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});
test('signup normalizes email, validates Indian phone and rejects filled bot fields',()=>{
 const fields={email:'  VENDOR@Example.com  ',phone:'98765 43210',password:'LongPassword123',consent:true,autopayConsent:true,plan:'starter'};
 const parsed=registerSchema.parse(fields);assert.equal(parsed.email,'vendor@example.com');assert.equal(parsed.phone,'+919876543210');
 assert.equal(registerSchema.safeParse({...fields,website:'https://bot.invalid'}).success,false);
 assert.equal(registerSchema.safeParse({...fields,phone:'1234567890'}).success,false);
 assert.equal(registerSchema.safeParse({...fields,phone:'abc9876543210'}).success,false);
});
test('legacy Indian phone formats cannot bypass duplicate signup or mandate activation checks',()=>{
 for(const phone of ['9876543210','91 98765 43210','+91 (98765) 43210']){
  const state=initialState();state.users.push({id:'legacy',email:'legacy@example.com',phone,passwordHash:'hash',role:'vendor',verified:true});
  assert.throws(()=>startRegistration(state,input),/already uses/);assert.equal(state.registrations.length,0);
  const other=initialState(),pending=startRegistration(other,input);pending.verified=true;pending.phoneVerified=true;const start=Math.floor((Date.now()+86400000)/1000);
  pending.subscription={plan:'starter',status:'created',gatewayId:'sub_fixture',gatewayPlanId:'plan_fixture',trialEndsAt:new Date(start*1000).toISOString(),updatedAt:new Date().toISOString()};
  other.users.push(state.users[0]);const remote:RazorpaySubscription={id:'sub_fixture',plan_id:'plan_fixture',status:'authenticated',start_at:start,paid_count:0,quantity:1,total_count:96,notes:{occanova_registration_id:pending.id}};
  assert.throws(()=>activateRegistration(other,pending.id,remote),/already uses/);assert.equal(other.users.length,1);
 }
});
test('pending registration phone formats and mixed-case legacy emails cannot create duplicate setup',()=>{
 const state=initialState();const pending=startRegistration(state,input);pending.phone='98765 43210';pending.email='NEW@Example.com';
 assert.throws(()=>startRegistration(state,input),/already in progress/);assert.equal(state.registrations.length,1);
});
test('unfinished setup can resume during recovery, and a gateway mandate is never orphaned',()=>{
 const now=Date.now(),state=initialState(),pending=startRegistration(state,input,now);
 assert.equal(registrationCanResume(pending,now+29*86400000),true);
 assert.equal(registrationCanResume(pending,now+31*86400000),false);
 pending.subscription={plan:'starter',status:'created',gatewayId:'sub_fixture',gatewayPlanId:'plan_fixture',trialEndsAt:new Date(now+60*86400000).toISOString(),updatedAt:new Date(now).toISOString()};
 assert.equal(registrationCanResume(pending,now+31*86400000),true);
});
test('admin workspace version tracks signup progress without changing another vendor workspace',()=>{
 const state=initialState(),admin={id:'admin',email:'admin@example.com',phone:'',passwordHash:'hash',role:'admin' as const,verified:true},vendor={...admin,id:'vendor',role:'vendor' as const};
 const initial=workspaceVersion(state,admin),privateVersion=workspaceVersion(state,vendor);const pending=startRegistration(state,input);
 assert.notEqual(workspaceVersion(state,admin),initial);assert.equal(workspaceVersion(state,vendor),privateVersion);
 const started=workspaceVersion(state,admin);pending.verified=true;assert.notEqual(workspaceVersion(state,admin),started);
});
