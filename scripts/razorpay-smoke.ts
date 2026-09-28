import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {razorpay,razorpayPlanId,trialEnd,type RazorpaySubscription} from '../src/lib/subscriptions';

async function main(){
 const env=parseEnv(await readFile('.env.local','utf8'));
 if(!/^rzp_test_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID||'')||!env.RAZORPAY_KEY_SECRET)throw Error('This check only accepts Test Mode credentials from .env.local.');
 for(const [name,value] of Object.entries(env))if(name.startsWith('RAZORPAY_'))process.env[name]=value;
 const planId=razorpayPlanId('starter');
 const firstCharge=Math.floor(trialEnd(new Date()).getTime()/1000);
 let subscription:RazorpaySubscription|undefined;
 try{
  subscription=await razorpay<RazorpaySubscription>('POST','subscriptions',{plan_id:planId,total_count:96,quantity:1,customer_notify:false,start_at:firstCharge,expire_by:Math.floor(Date.now()/1000)+86400,notes:{occanova_test:'api-smoke-check'}});
  console.log(`Created temporary Test Mode subscription: ${subscription.id}`);
  if(!/^sub_[A-Za-z0-9]+$/.test(subscription.id)||subscription.plan_id!==planId||subscription.status!=='created'||subscription.start_at!==firstCharge||subscription.paid_count!==0)throw Error('Unexpected subscription schedule or status.');
  const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${subscription.id}`);
  if(remote.start_at!==firstCharge||remote.paid_count!==0)throw Error('Saved subscription does not match the requested trial.');
  console.log(`Verified first paid cycle: ${new Date(firstCharge*1000).toISOString()}; paid cycles: 0.`);
 }finally{
  if(subscription?.id&&/^sub_[A-Za-z0-9]+$/.test(subscription.id)){
   const cancelled=await razorpay<RazorpaySubscription>('POST',`subscriptions/${subscription.id}/cancel`,{cancel_at_cycle_end:false});
   const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${subscription.id}`);
   if(cancelled.status!=='cancelled'||remote.status!=='cancelled')throw Error(`Check temporary subscription ${subscription.id}: cancellation was not confirmed.`);
   console.log('Temporary subscription cancelled and cancellation verified.');
  }
 }
 console.log('Gateway creation, future trial schedule and immediate cancellation passed. Checkout mandate authorization and webhook delivery remain to be tested.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Test subscription check failed.');process.exitCode=1;});
