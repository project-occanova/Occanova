import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncSubscription,type RazorpaySubscription} from '../src/lib/subscriptions';
import type {VendorSubscription} from '../src/lib/types';
const selected:VendorSubscription={plan:'starter',status:'created',gatewayId:'sub_fixture',gatewayPlanId:'plan_fixture',trialEndsAt:'2026-11-28T10:00:00Z',updatedAt:'2026-09-28T10:00:00Z'};
const remote:RazorpaySubscription={id:'sub_fixture',plan_id:'plan_fixture',status:'authenticated',start_at:Date.parse(selected.trialEndsAt!)/1000,paid_count:0,quantity:1,total_count:96};
test('lost Checkout callback recovery records trial use and cancellation cannot erase it',()=>{
 const recovered=syncSubscription(selected,remote,1000);assert.equal(recovered.status,'authenticated');assert.equal(recovered.trialUsedAt,new Date(1000).toISOString());
 const cancelled=syncSubscription(recovered,{...remote,status:'cancelled'},2000);assert.equal(cancelled.trialUsedAt,recovered.trialUsedAt);
 assert.equal(selected.status,'created');assert.equal(selected.trialUsedAt,undefined);
});
test('gateway recovery validates ownership, selected plan and agreed schedule',()=>{
 for(const change of [{id:'sub_other'},{plan_id:'plan_other'},{start_at:0},{start_at:null},{quantity:2},{total_count:1},{status:'unknown'}])assert.throws(()=>syncSubscription(selected,{...remote,...change}),/do not match/);
 assert.equal(syncSubscription(selected,{...remote,status:'created'}).trialUsedAt,undefined);
 assert.ok(syncSubscription(selected,{...remote,status:'cancelled',paid_count:1}).trialUsedAt);
});
