import {isPlanId,subscriptionPlans} from './plans';
import type {VendorSubscription} from './types';

export type PlanAccess={allowed:boolean;trial:boolean;reason:string};
export class PlanAccessError extends Error{constructor(message:string,public status=403){super(message);}}
export function portfolioLimit(subscription?:VendorSubscription){
 // Existing accounts without a subscription retain their legacy allowance.
 if(!subscription)return 12;
 return isPlanId(subscription.plan)?subscriptionPlans[subscription.plan].portfolioLimit:0;
}
export function planAccess(subscription?:VendorSubscription,now=Date.now(),required=process.env.SUBSCRIPTIONS_ENABLED==='true'):PlanAccess{
 if(!subscription)return {allowed:true,trial:false,reason:''};
 if(!isPlanId(subscription.plan))return {allowed:false,trial:false,reason:'Your plan is not recognised. Please contact Occanova.'};
 if(!required)return {allowed:true,trial:false,reason:''};
 if(subscription.status==='active')return {allowed:true,trial:false,reason:''};
 if(subscription.status==='authenticated'){
  if(subscription.trialEndsAt&&Date.parse(subscription.trialEndsAt)>now)return {allowed:true,trial:true,reason:''};
  return {allowed:false,trial:false,reason:'Your free trial has ended. Confirm your subscription in Plan & billing to continue.'};
 }
 return {allowed:false,trial:false,reason:'Your subscription is not active. Authorize your plan in Plan & billing before uploading or saving your profile.'};
}
export function assertPlanAccess(subscription?:VendorSubscription){const access=planAccess(subscription);if(!access.allowed)throw new PlanAccessError(access.reason);}
export function assertPortfolioLimit(subscription:VendorSubscription|undefined,count:number){
 const limit=portfolioLimit(subscription);
 if(!Number.isSafeInteger(count)||count<0||count>limit)throw new PlanAccessError(`Your ${subscription&&isPlanId(subscription.plan)?subscriptionPlans[subscription.plan].name+' plan':'account'} allows up to ${limit} portfolio photos. Remove extra photos before saving.`,400);
}
export function listingWithinPlan(subscription:VendorSubscription|undefined,count:number,now=Date.now()){
 return planAccess(subscription,now).allowed&&count<=portfolioLimit(subscription);
}
