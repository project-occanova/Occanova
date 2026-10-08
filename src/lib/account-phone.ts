import {randomUUID} from 'node:crypto';
import {registrationRecoveryExpiry} from './email-verification';
import {consumeMobileChallenge,normalizeIndianMobile} from './mobile-otp';
import type {State,User} from './types';

export function mobileVerificationTarget(user:User,now=Date.now()){
 if(user.pendingPhone&&Number(user.pendingPhoneExpires)>now)return normalizeIndianMobile(user.pendingPhone);
 return user.phoneVerified?'':normalizeIndianMobile(user.phone);
}

export function stageAccountPhone(state:State,userId:string,phone:string,now=Date.now()){
 const account=state.users.find(row=>row.id===userId&&row.role==='vendor');
 if(!account)throw Error('Vendor access required.');
 const target=normalizeIndianMobile(phone);
 if(!target)throw Error('Enter a valid Indian mobile number.');
 if(target===normalizeIndianMobile(account.phone))throw Error(account.phoneVerified?'This number is already verified.':'This is already your account number. Send an OTP instead.');
 if(state.users.some(row=>row.id!==userId&&normalizeIndianMobile(row.phone)===target)||state.registrations.some(row=>!row.completedUserId&&(registrationRecoveryExpiry(row)>now||row.subscription?.gatewayId)&&normalizeIndianMobile(row.phone)===target))throw Error('An account or registration already uses this mobile number.');
 account.pendingPhone=target;
 account.pendingPhoneExpires=now+60*60*1000;
 state.tokens=state.tokens.filter(row=>!(row.userId===userId&&row.kind==='mobile'));
 return target;
}

export function verifyAccountPhone(state:State,userId:string,code:string,now=Date.now()){
 const account=state.users.find(row=>row.id===userId&&row.role==='vendor');
 if(!account)throw Error('Vendor access required.');
 const target=mobileVerificationTarget(account,now);
 if(!target)throw Error('Start a new mobile number change to receive an OTP.');
 if(!consumeMobileChallenge(state,userId,target,code,now))return false;
 if(account.pendingPhone&&Number(account.pendingPhoneExpires)>now){
  if(state.users.some(row=>row.id!==userId&&normalizeIndianMobile(row.phone)===target))throw Error('Another account now uses this mobile number. Choose a different number.');
  const oldPhone=account.phone;
  account.phone=target;
  for(const vendor of state.vendors.filter(row=>row.userId===userId)){
   vendor.phone=target;
   if(normalizeIndianMobile(vendor.whatsapp)===normalizeIndianMobile(oldPhone))vendor.whatsapp=target;
   if(vendor.publishedSnapshot){
    vendor.publishedSnapshot.phone=target;
    if(normalizeIndianMobile(vendor.publishedSnapshot.whatsapp)===normalizeIndianMobile(oldPhone))vendor.publishedSnapshot.whatsapp=target;
   }
  }
 }
 account.phoneVerified=true;
 account.phoneVerifiedAt=new Date(now).toISOString();
 account.pendingPhone=undefined;
 account.pendingPhoneExpires=undefined;
 state.audit.unshift({id:randomUUID(),actor:account.email,action:'Mobile number verified',target:'Vendor account',remarks:'Verified by one-time SMS code',at:account.phoneVerifiedAt});
 return true;
}
