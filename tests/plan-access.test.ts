import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertPlanAccess,assertPortfolioLimit,listingWithinPlan,planAccess,portfolioLimit} from '../src/lib/plan-access';
import {planIds} from '../src/lib/plans';
import {profileSchema} from '../src/lib/validation';
import {initialState} from '../src/lib/seed';
import {publicVendors} from '../src/lib/directory';
import type {VendorSubscription} from '../src/lib/types';
const now=Date.parse('2026-09-28T00:00:00Z');
const trial:VendorSubscription={plan:'starter',status:'authenticated',trialEndsAt:'2026-11-28T00:00:00Z',updatedAt:new Date(now).toISOString()};

test('the selected plan has the same portfolio limit during trial and paid access',()=>{
 for(const [index,plan] of planIds.entries()){
  const selected={...trial,plan};const limit=[10,25,50,100][index];
  assert.equal(portfolioLimit(selected),limit);assert.equal(planAccess(selected,now,true).allowed,true);
  assert.doesNotThrow(()=>assertPortfolioLimit(selected,limit));assert.throws(()=>assertPortfolioLimit(selected,limit+1),/allows up to/);
  assert.equal(portfolioLimit({...selected,status:'active'}),limit);
 }
});
test('unapproved, cancelled, failed, expired and ended trials cannot receive plan access',()=>{
 for(const status of ['selected','created','cancelled','pending','halted','completed','expired'] as const)assert.equal(planAccess({...trial,status},now,true).allowed,false);
 for(const trialEndsAt of [undefined,'invalid',new Date(now).toISOString(),'2026-09-27T00:00:00Z'])assert.equal(planAccess({...trial,trialEndsAt},now,true).allowed,false);
 assert.equal(planAccess({...trial,status:'active'},now,true).allowed,true);
 assert.equal(planAccess(undefined,now,true).allowed,true);assert.equal(portfolioLimit(undefined),12);
});
test('profile payloads cannot assign themselves another subscription plan or higher quota',()=>{
 const vendor=initialState().vendors[0];const payload={...vendor,email:'fixture@example.com',phone:'+919876543210',whatsapp:'+919876543210',plan:'premium',subscription:{...trial,plan:'premium'},portfolioLimit:100};
 const parsed=profileSchema.parse(payload);assert.equal('plan' in parsed,false);assert.equal('subscription' in parsed,false);assert.equal('portfolioLimit' in parsed,false);
});
test('the server access assertion fails closed even if billing credentials are unavailable',()=>{
 const original=process.env.SUBSCRIPTIONS_ENABLED;process.env.SUBSCRIPTIONS_ENABLED='true';
 try{assert.throws(()=>assertPlanAccess({...trial,status:'cancelled'}),/not active/);}finally{if(original===undefined)delete process.env.SUBSCRIPTIONS_ENABLED;else process.env.SUBSCRIPTIONS_ENABLED=original;}
});
test('a downgrade cannot leave an over-limit listing public or delete the existing photos',()=>{
 const original=process.env.SUBSCRIPTIONS_ENABLED;process.env.SUBSCRIPTIONS_ENABLED='true';
 try{
  const state=initialState(),vendor={...state.vendors[0],id:'fixture',userId:'fixture-user',sample:false,gallery:Array.from({length:11},(_,i)=>`photo${i}`)};
  const user={id:vendor.userId,email:'fixture@example.com',phone:'',passwordHash:'x',role:'vendor' as const,verified:true,subscription:{...trial,status:'active' as const}};
  assert.equal(publicVendors([vendor],{},[user]).length,0);assert.equal(vendor.gallery.length,11);
  vendor.gallery.pop();assert.equal(publicVendors([vendor],{},[user]).length,1);
  assert.equal(listingWithinPlan({...trial,trialEndsAt:'2026-09-27T00:00:00Z'},1,now),false);
 }finally{if(original===undefined)delete process.env.SUBSCRIPTIONS_ENABLED;else process.env.SUBSCRIPTIONS_ENABLED=original;}
});
