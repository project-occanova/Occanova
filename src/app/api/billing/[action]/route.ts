import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {mutate} from '@/lib/store';
import {rateLimited} from '@/lib/rate-limit';
import {billingEnabled,isPlanId,knownStatus,razorpay,prepareSubscription,validSignature,type RazorpaySubscription} from '@/lib/subscriptions';
export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});

export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 const action=(await params).action;
 if(!['checkout','confirm','cancel','status'].includes(action))return fail('Not found',404);
 if(process.env.OCCANOVA_READ_ONLY==='true')return fail('This site is read-only.',503);
 const origin=req.headers.get('origin');
 const expected=process.env.NEXT_PUBLIC_SITE_URL||`${req.nextUrl.protocol}//${req.headers.get('host')}`;
 if(!origin||origin!==new URL(expected).origin)return fail('Invalid request origin',403);
 const user=await currentUser();
 if(!user||user.role!=='vendor'||!user.verified)return fail('Please sign in to your verified vendor account.',401);
 if(!billingEnabled())return fail('Subscriptions are not open yet.',503);
 if(Number(req.headers.get('content-length')||0)>3000)return fail('Request too large',413);
 let body:unknown;
 try{body=await req.json();}catch{return fail('Invalid request',400);}
 try{
  if(action==='status'){
   const selected=user.subscription;
   if(!selected?.gatewayId)return fail('No subscription to check.',404);
   if(await rateLimited(`billing-status:${user.id}`,2,30000))return fail('Please wait a moment before checking again.',429);
   const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${selected.gatewayId}`);
   if(remote.id!==selected.gatewayId||remote.plan_id!==selected.gatewayPlanId||!knownStatus(remote.status))return fail('Subscription details do not match.',409);
   await mutate(state=>{const account=state.users.find(item=>item.id===user.id);if(!account?.subscription||account.subscription.gatewayId!==remote.id)return;account.subscription.status=remote.status as typeof account.subscription.status;account.subscription.paidCount=remote.paid_count;account.subscription.updatedAt=new Date().toISOString();});
   return NextResponse.json({ok:true,status:remote.status});
  }
  if(action==='checkout'){
   const {plan}=z.object({plan:z.string()}).parse(body);
   if(!isPlanId(plan))return fail('Choose a valid plan.');
   if(await rateLimited(`billing-checkout:${user.id}`,1,30000))return fail('Please wait a moment before retrying.',429);
   const prepared=await prepareSubscription(plan,user.subscription,{occanova_vendor_id:user.id,occanova_plan:plan});
   await mutate(state=>{const account=state.users.find(item=>item.id===user.id);if(!account)throw Error('Vendor account missing.');if(account.subscription?.gatewayId!==user.subscription?.gatewayId)throw Error('Billing changed. Refresh and try again.');account.subscription=prepared;});
   return NextResponse.json({key:process.env.RAZORPAY_KEY_ID,subscriptionId:prepared.gatewayId,trialEndsAt:prepared.trialEndsAt});
  }
  if(action==='confirm'){
   const {paymentId,subscriptionId,signature}=z.object({paymentId:z.string().regex(/^pay_[A-Za-z0-9]+$/),subscriptionId:z.string().regex(/^sub_[A-Za-z0-9]+$/),signature:z.string().regex(/^[a-f0-9]{64}$/i)}).parse(body);
   const selected=user.subscription;
   if(!selected?.gatewayId||selected.gatewayId!==subscriptionId)return fail('Subscription does not belong to this vendor.',403);
   if(!validSignature(`${paymentId}|${selected.gatewayId}`,signature,process.env.RAZORPAY_KEY_SECRET||''))return fail('Payment signature was invalid.',403);
   const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${selected.gatewayId}`);
   if(remote.plan_id!==selected.gatewayPlanId||!['authenticated','active'].includes(remote.status))return fail('Razorpay has not confirmed the mandate yet.',409);
   await mutate(state=>{const account=state.users.find(item=>item.id===user.id);if(!account?.subscription||account.subscription.gatewayId!==remote.id)return;account.subscription.status=remote.status as 'authenticated'|'active';account.subscription.trialUsedAt??=new Date().toISOString();account.subscription.paidCount=remote.paid_count;account.subscription.updatedAt=new Date().toISOString();});
   return NextResponse.json({ok:true,status:remote.status});
  }
  const selected=user.subscription;
  if(!selected?.gatewayId)return fail('No subscription to cancel.',404);
  if(await rateLimited(`billing-cancel:${user.id}`,2,60000))return fail('Please wait a moment before retrying.',429);
  const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${selected.gatewayId}`);
  if(remote.plan_id!==selected.gatewayPlanId)return fail('Subscription plan mismatch.',409);
  const cancelled=['cancelled','expired','completed'].includes(remote.status)?remote:await razorpay<RazorpaySubscription>('POST',`subscriptions/${selected.gatewayId}/cancel`,{cancel_at_cycle_end:false});
  await mutate(state=>{const account=state.users.find(item=>item.id===user.id);if(!account?.subscription||account.subscription.gatewayId!==selected.gatewayId)return;account.subscription.status=knownStatus(cancelled.status)?cancelled.status as typeof account.subscription.status:'cancelled';account.subscription.updatedAt=new Date().toISOString();});
  return NextResponse.json({ok:true,status:cancelled.status});
 }catch(error){
  if(error instanceof z.ZodError)return fail('Check the subscription details.');
  console.error('Billing request failed',error);
  return fail('Subscription request failed. Please try again or contact support.',502);
 }
}
