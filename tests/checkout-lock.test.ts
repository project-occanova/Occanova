import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {claimCheckout,commitCheckout} from '../src/lib/checkout-lock';
import type {VendorSubscription} from '../src/lib/types';
test('parallel tabs cannot claim the same AutoPay setup or overwrite another attempt',()=>{
 const state=initialState();state.users.push({id:'vendor',email:'fixture@example.com',phone:'',passwordHash:'hash',role:'vendor',verified:true});
 assert.equal(claimCheckout(state,'vendor','vendor','first',1000),undefined);
 assert.throws(()=>claimCheckout(state,'vendor','vendor','second',1001),/already in progress/);
 const prepared:VendorSubscription={plan:'starter',status:'created',gatewayId:'sub_new',updatedAt:new Date().toISOString()};
 assert.throws(()=>commitCheckout(state,'vendor','vendor','second',undefined,prepared),/Billing changed/);
 assert.equal(state.users[0].subscription,undefined);
 assert.equal(claimCheckout(state,'vendor','vendor','second',121001),undefined);
 assert.throws(()=>commitCheckout(state,'vendor','vendor','first',undefined,prepared),/Billing changed/);
 commitCheckout(state,'vendor','vendor','second',undefined,prepared);assert.equal((state.users[0].subscription as VendorSubscription|undefined)?.gatewayId,'sub_new');assert.equal(state.users[0].checkoutLock,undefined);
});
