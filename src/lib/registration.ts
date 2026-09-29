import {randomUUID} from 'node:crypto';
import type {PendingRegistration,State,User} from './types';
import type {PlanId} from './plans';
import type {RazorpaySubscription} from './subscriptions';
import {normalizeIndianMobile} from './mobile-otp';
import {registrationRecoveryExpiry} from './email-verification';

function sameIdentity(row:{email:string;phone:string},input:{email:string;phone:string}){
 const phone=normalizeIndianMobile(input.phone);
 return row.email.trim().toLowerCase()===input.email.trim().toLowerCase()||Boolean(phone)&&normalizeIndianMobile(row.phone)===phone;
}

export function startRegistration(state:State,input:{email:string;phone:string;passwordHash:string;plan:PlanId;autopayConsent:boolean;verificationHash:string},now=Date.now()){
 if(!input.autopayConsent)throw Error('Agree to recurring AutoPay before continuing.');
 state.registrations=state.registrations.filter(row=>registrationRecoveryExpiry(row)>now||row.subscription?.gatewayId||row.completedUserId);
 if(state.users.some(row=>sameIdentity(row,input)))throw Error('An account already uses this email or phone.');
 if(state.registrations.some(row=>!row.completedUserId&&sameIdentity(row,input)))throw Error('Registration is already in progress. Log in to continue, or resend your verification email.');
 const registration:PendingRegistration={id:randomUUID(),email:input.email,phone:input.phone,passwordHash:input.passwordHash,plan:input.plan,verified:false,verificationHash:input.verificationHash,verificationExpires:now+86400000,recoveryExpires:now+30*86400000,autopayConsentAt:new Date(now).toISOString(),expires:now+86400000};
 state.registrations.push(registration);
 return registration;
}

export function activateRegistration(state:State,id:string,remote:RazorpaySubscription,now=Date.now()):User{
 const pending=state.registrations.find(row=>row.id===id);
 if(!pending?.verified||!pending.autopayConsentAt||!pending.subscription)throw Error('Verify your email and authorize AutoPay before creating an account.');
 const selected=pending.subscription;
 if(remote.id!==selected.gatewayId||remote.plan_id!==selected.gatewayPlanId||!['authenticated','active'].includes(remote.status)||remote.notes?.occanova_registration_id!==pending.id)throw Error('Razorpay has not confirmed this registration mandate.');
 if(!remote.start_at||!selected.trialEndsAt||remote.start_at!==Math.floor(Date.parse(selected.trialEndsAt)/1000)||remote.quantity!==1||remote.total_count!==96)throw Error('The authorized mandate does not match the agreed billing schedule.');
 const existing=state.users.find(user=>user.id===pending.completedUserId);
 if(existing)return existing;
 if(state.users.some(user=>sameIdentity(user,pending)))throw Error('An account already uses this email or phone.');
 const user:User={id:pending.id,email:pending.email,phone:pending.phone,passwordHash:pending.passwordHash,role:'vendor',verified:true,verificationEmail:pending.verificationEmail,phoneVerified:false,subscription:{...selected,status:remote.status as 'authenticated'|'active',trialUsedAt:new Date(now).toISOString(),paidCount:remote.paid_count,updatedAt:new Date(now).toISOString()}};
 state.users.push(user);pending.completedUserId=user.id;
 return user;
}
