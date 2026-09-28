import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {planIds,subscriptionPlans} from '../src/lib/plans';
import {trialEnd,validSignature} from '../src/lib/subscriptions';
import {registerSchema} from '../src/lib/validation';
import {publicVendors} from '../src/lib/directory';
import {initialState} from '../src/lib/seed';

test('the supplied subscription prices and portfolio limits stay consistent',()=>{
 assert.deepEqual(planIds,['starter','growth','pro','premium']);
 assert.deepEqual(planIds.map(id=>subscriptionPlans[id].monthlyRupees),[199,299,499,999]);
 assert.deepEqual(planIds.map(id=>subscriptionPlans[id].portfolioLimit),[10,25,50,100]);
});

test('registration accepts a selected plan and never trusts a price from the browser',()=>{
 const payload={email:'vendor@example.com',phone:'9876543210',password:'a-secure-vendor-password',consent:true,plan:'pro',price:1};
 const result=registerSchema.parse(payload);
 assert.equal(result.plan,'pro');
 assert.equal('price' in result,false);
 assert.equal(registerSchema.safeParse({...payload,plan:'free'}).success,false);
});

test('two calendar months preserve the time and clamp month-end dates',()=>{
 assert.equal(trialEnd(new Date('2026-09-27T06:30:00.000Z')).toISOString(),'2026-11-27T06:30:00.000Z');
 assert.equal(trialEnd(new Date('2027-12-31T12:00:00.000Z')).toISOString(),'2028-02-29T12:00:00.000Z');
});

test('Razorpay signatures require the exact payload and reject malformed values',()=>{
 const secret='test-secret';
 const body='pay_test|sub_test';
 const signature=createHmac('sha256',secret).update(body).digest('hex');
 assert.equal(validSignature(body,signature,secret),true);
 assert.equal(validSignature('pay_other|sub_test',signature,secret),false);
 assert.equal(validSignature(body,'bad',secret),false);
});

test('billing-enabled discovery hides vendors whose mandate is not authorized',()=>{
 const old=process.env.SUBSCRIPTIONS_ENABLED;
 process.env.SUBSCRIPTIONS_ENABLED='true';
 try{
  const state=initialState();
  const vendor={...state.vendors[0],id:'paid-vendor',userId:'vendor-user',sample:false};
  state.users.push({id:'vendor-user',email:'vendor@example.com',phone:'+919876543210',passwordHash:'x',role:'vendor',verified:true,subscription:{plan:'starter',status:'selected',updatedAt:'2026-09-27T00:00:00.000Z'}});
  assert.equal(publicVendors([vendor],{},state.users).length,0);
  state.users[0].subscription!.status='authenticated';
  assert.equal(publicVendors([vendor],{},state.users).length,1);
  state.users[0].subscription!.status='cancelled';
  assert.equal(publicVendors([vendor],{},state.users).length,0);
 }finally{if(old===undefined)delete process.env.SUBSCRIPTIONS_ENABLED;else process.env.SUBSCRIPTIONS_ENABLED=old;}
});
