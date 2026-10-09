import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {changeCustomerSetupPhone,createCustomer,customerEnquiries,setSavedCustomerVendor} from '../src/lib/customer';
import {verifyEmail} from '../src/lib/email-verification';
import {matchesLoginIdentity} from '../src/lib/login-identity';
import {consumeMobileChallenge,saveMobileChallenge} from '../src/lib/mobile-otp';

function customer(){
 const state=initialState();
 const user=createCustomer(state,{name:'Ananya Rao',email:' ANANYA@Example.com ',phone:'98765 43210',passwordHash:'test-hash',verificationHash:'email-token'});
 return {state,user};
}

test('customer signup keeps vendor identities reserved and requires both verifications for mobile login',()=>{
 const {state,user}=customer();
 assert.equal(user.email,'ananya@example.com');assert.equal(user.phone,'+919876543210');assert.equal(user.role,'customer');
 assert.equal(user.verified,false);assert.equal(user.phoneVerified,false);
 assert.equal(matchesLoginIdentity(user,user.email),true);assert.equal(matchesLoginIdentity(user,user.phone),false);
 verifyEmail(state,'email-token','unused');assert.equal(user.verified,true);assert.equal(matchesLoginIdentity(user,user.phone),false);
 saveMobileChallenge(state,user.id,user.phone,'123456');assert.equal(consumeMobileChallenge(state,user.id,user.phone,'123456'),true);
 user.phoneVerified=true;assert.equal(matchesLoginIdentity(user,'9876543210'),true);
 assert.throws(()=>createCustomer(state,{name:'Other',email:'other@example.com',phone:user.phone,passwordHash:'hash',verificationHash:'other'}),/already uses/);
 assert.throws(()=>createCustomer(state,{name:'Other',email:'ANANYA@example.com',phone:'+919876543211',passwordHash:'hash',verificationHash:'other'}),/already uses/);
});

test('a customer can correct an unverified phone without retaining the old OTP',()=>{
 const {state,user}=customer();user.verified=true;
 saveMobileChallenge(state,user.id,user.phone,'123456');
 changeCustomerSetupPhone(state,user.id,'9876543211');
 assert.equal(user.phone,'+919876543211');assert.equal(consumeMobileChallenge(state,user.id,user.phone,'123456'),false);
 state.users.push({id:'vendor',email:'vendor@example.com',phone:'9876543212',passwordHash:'hash',role:'vendor',verified:true});
 assert.throws(()=>changeCustomerSetupPhone(state,user.id,'9876543212'),/already uses/);
 user.phoneVerified=true;assert.throws(()=>changeCustomerSetupPhone(state,user.id,'9876543213'),/no longer available/);
});

test('only approved real vendors can be saved and only account-linked enquiries appear',()=>{
 const {state,user}=customer();user.verified=true;user.phoneVerified=true;
 assert.throws(()=>setSavedCustomerVendor(state,user.id,'sample-1',true),/not available/);
 const vendor={...state.vendors[0],id:'real-vendor',userId:'vendor-owner',slug:'real-vendor',sample:false};
 state.vendors.push(vendor);
 state.users.push({id:'vendor-owner',email:'vendor@example.com',phone:'9876543212',passwordHash:'hash',role:'vendor',verified:true});
 assert.equal(setSavedCustomerVendor(state,user.id,vendor.id,true),true);
 assert.equal(setSavedCustomerVendor(state,user.id,vendor.id,true),true);assert.deepEqual(user.savedVendorIds,[vendor.id]);
 assert.equal(setSavedCustomerVendor(state,user.id,vendor.id,false),false);
 vendor.status='pending';assert.throws(()=>setSavedCustomerVendor(state,user.id,vendor.id,true),/not available/);
 const enquiry={id:'one',vendorId:vendor.id,name:user.name!,contact:user.email,city:'Shillong',date:'2027-01-01',service:'Planning',message:'Please help with our event.',consent:true as const,status:'new' as const,createdAt:'2026-10-09T00:00:00.000Z'};
 state.enquiries.push({...enquiry,customerId:user.id},{...enquiry,id:'anonymous'});
 assert.deepEqual(customerEnquiries(state.enquiries,user.id).map(row=>row.id),['one']);
});
