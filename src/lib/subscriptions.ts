import {createHmac,timingSafeEqual} from 'node:crypto';
import type {VendorSubscription} from './types';
import {planIds,subscriptionPlans,type PlanId} from './plans';
export {subscriptionPlans,planIds,isPlanId} from './plans';
export type {PlanId} from './plans';

export function trialEnd(start:Date){
 const next=new Date(start);
 const day=next.getUTCDate();
 next.setUTCDate(1);
 next.setUTCMonth(next.getUTCMonth()+2);
 const last=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate();
 next.setUTCDate(Math.min(day,last));
 return next;
}

export function razorpayPlanId(plan:PlanId){
 const key=`RAZORPAY_PLAN_${plan.toUpperCase()}`;
 const value=process.env[key];
 if(!value||!/^plan_[A-Za-z0-9]+$/.test(value))throw Error(`${key} is not configured.`);
 return value;
}
export function billingMode(){return process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')?'live':process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')?'test':'unconfigured';}
export function billingConfigured(){
 if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV==='production'&&billingMode()!=='live')return false;
 return Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&process.env.RAZORPAY_WEBHOOK_SECRET&&planIds.every(plan=>/^plan_[A-Za-z0-9]+$/.test(process.env[`RAZORPAY_PLAN_${plan.toUpperCase()}`]||'')));
}
export function billingEnabled(){return process.env.SUBSCRIPTIONS_ENABLED==='true'&&billingConfigured();}

export function validSignature(body:string,signature:string,secret:string){
 if(!/^[a-f0-9]{64}$/i.test(signature)||!secret)return false;
 const expected=createHmac('sha256',secret).update(body).digest();
 return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}

export type RazorpaySubscription={id:string;plan_id:string;status:string;start_at:number|null;paid_count:number;quantity:number;total_count:number;expire_by?:number;notes?:Record<string,string>};
export function knownStatus(value:string){return ['created','authenticated','active','pending','halted','cancelled','completed','expired'].includes(value);}
export function syncSubscription(selected:VendorSubscription,remote:RazorpaySubscription,now=Date.now()):VendorSubscription{
 if(remote.id!==selected.gatewayId||remote.plan_id!==selected.gatewayPlanId||!knownStatus(remote.status)||remote.quantity!==1||remote.total_count!==96||!selected.trialEndsAt||remote.start_at!==Math.floor(Date.parse(selected.trialEndsAt)/1000))throw Error('Subscription details do not match the authorized plan and billing schedule.');
 const used=['authenticated','active','pending','halted'].includes(remote.status)||remote.paid_count>0;
 return {...selected,status:remote.status as VendorSubscription['status'],paidCount:remote.paid_count,trialUsedAt:selected.trialUsedAt||(used?new Date(now).toISOString():undefined),updatedAt:new Date(now).toISOString()};
}
export async function razorpay<T>(method:'GET'|'POST',path:string,body?:unknown):Promise<T>{
 const key=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
 if(!key||!secret)throw Error('Razorpay credentials are not configured.');
 const response=await fetch(`https://api.razorpay.com/v1/${path}`,{
  method,headers:{Authorization:`Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,'Content-Type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(10000),
 });
 const result=await response.json();
 if(!response.ok)throw Error(`Razorpay request failed (${response.status}): ${String(result?.error?.description||'Unknown error')}`);
 return result as T;
}

export async function prepareSubscription(plan:PlanId,existing:VendorSubscription|undefined,notes:Record<string,string>){
 if(existing?.gatewayId){
  const previous=await razorpay<RazorpaySubscription>('GET',`subscriptions/${existing.gatewayId}`);
  if(previous.plan_id!==existing.gatewayPlanId)throw Error('Saved subscription plan mismatch.');
  if(['authenticated','active','pending','halted'].includes(previous.status))throw Error('This mandate is already authorized. Refresh to continue.');
  if(previous.status==='created'){
   if(existing.plan===plan&&(!previous.expire_by||previous.expire_by>Date.now()/1000))return existing;
   await razorpay('POST',`subscriptions/${previous.id}/cancel`,{cancel_at_cycle_end:false});
  }
 }
 const planId=razorpayPlanId(plan);
 const gatewayPlan=await razorpay<{id:string;period:string;interval:number;item:{amount:number;currency:string}}>('GET',`plans/${planId}`);
 if(gatewayPlan.id!==planId||gatewayPlan.period!=='monthly'||gatewayPlan.interval!==1||gatewayPlan.item?.amount!==subscriptionPlans[plan].monthlyRupees*100||gatewayPlan.item?.currency!=='INR')throw Error('The Razorpay plan does not match the agreed price.');
 const now=new Date();
 const trialUsedAt=existing?.trialUsedAt||(['authenticated','active','pending','halted'].includes(existing?.status||'')||Number(existing?.paidCount)>0?now.toISOString():undefined);
 const firstCharge=trialUsedAt?(existing?.trialEndsAt&&Date.parse(existing.trialEndsAt)>now.getTime()+600000?new Date(existing.trialEndsAt):new Date(now.getTime()+600000)):trialEnd(now);
 const created=await razorpay<RazorpaySubscription>('POST','subscriptions',{plan_id:planId,total_count:96,quantity:1,customer_notify:process.env.NODE_ENV==='production',start_at:Math.floor(firstCharge.getTime()/1000),expire_by:Math.floor(now.getTime()/1000)+1800,notes});
 if(!/^sub_[A-Za-z0-9]+$/.test(created.id)||created.plan_id!==planId||created.status!=='created'||created.start_at!==Math.floor(firstCharge.getTime()/1000))throw Error('Razorpay returned an unexpected subscription.');
 return {plan,status:'created',gatewayId:created.id,gatewayPlanId:planId,trialEndsAt:new Date(created.start_at*1000).toISOString(),trialUsedAt,paidCount:0,updatedAt:now.toISOString()} satisfies VendorSubscription;
}
