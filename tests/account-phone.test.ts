import test from 'node:test';
import assert from 'node:assert/strict';
import {stageAccountPhone,mobileVerificationTarget,verifyAccountPhone} from '../src/lib/account-phone';
import {saveMobileChallenge} from '../src/lib/mobile-otp';
import {initialState} from '../src/lib/seed';
import {snapshotPublishedVendor} from '../src/lib/directory';
import type {User} from '../src/lib/types';

const now=Date.UTC(2026,9,8);
function fixture(){
 const state=initialState();
 const account:User={id:'vendor-1',email:'vendor@example.com',phone:'+919876543210',passwordHash:'hash',role:'vendor',verified:true,phoneVerified:true};
 state.users.push(account);
 const vendor=state.vendors[0];
 vendor.userId=account.id;vendor.phone=account.phone;vendor.whatsapp=account.phone;vendor.published=true;
 return {state,account,vendor};
}

test('a verified number stays in use until the replacement OTP succeeds',()=>{
 const {state,account,vendor}=fixture();
 vendor.publishedSnapshot=snapshotPublishedVendor(vendor);
 assert.equal(mobileVerificationTarget(account,now),'');
 const next=stageAccountPhone(state,account.id,'9898989898',now);
 assert.equal(next,'+919898989898');
 assert.equal(account.phone,'+919876543210');
 assert.equal(vendor.phone,'+919876543210');
 assert.equal(account.phoneVerified,true);
 assert.equal(mobileVerificationTarget(account,now),next);
 saveMobileChallenge(state,account.id,next,'123456',now);
 assert.equal(verifyAccountPhone(state,account.id,'000000',now),false);
 assert.equal(vendor.phone,'+919876543210');
 assert.equal(verifyAccountPhone(state,account.id,'123456',now),true);
 assert.equal(account.phone,next);
 assert.equal(vendor.phone,next);
 assert.equal(vendor.whatsapp,next);
 assert.equal(vendor.publishedSnapshot.phone,next);
 assert.equal(vendor.publishedSnapshot.whatsapp,next);
 assert.equal(account.pendingPhone,undefined);
 assert.equal(mobileVerificationTarget(account,now),'');
});

test('an unverified legacy vendor can correct the number without changing the public listing early',()=>{
 const {state,account,vendor}=fixture();account.phoneVerified=false;vendor.whatsapp='+919999999999';
 const next=stageAccountPhone(state,account.id,'+91 98989 89898',now);
 assert.equal(account.phoneVerified,false);
 assert.equal(vendor.phone,'+919876543210');
 saveMobileChallenge(state,account.id,next,'234567',now);
 assert.equal(verifyAccountPhone(state,account.id,'234567',now),true);
 assert.equal(account.phoneVerified,true);
 assert.equal(vendor.phone,next);
 assert.equal(vendor.whatsapp,'+919999999999');
});

test('duplicate and expired staged numbers cannot become login identities',()=>{
 const {state,account}=fixture();
 state.users.push({...account,id:'vendor-2',email:'other@example.com',phone:'+919898989898'});
 assert.throws(()=>stageAccountPhone(state,account.id,'9898989898',now),/already uses/);
 const next=stageAccountPhone(state,account.id,'9765432109',now);
 saveMobileChallenge(state,account.id,next,'345678',now);
 assert.equal(mobileVerificationTarget(account,now+60*60*1000+1),'');
 assert.throws(()=>verifyAccountPhone(state,account.id,'345678',now+60*60*1000+1),/Start a new/);
 assert.equal(account.phone,'+919876543210');
});
