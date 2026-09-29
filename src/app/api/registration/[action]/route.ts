import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {currentUser} from '@/lib/auth';
import {currentRegistration,finishRegistrationSession} from '@/lib/registration-session';
import {activateRegistration} from '@/lib/registration';
import {mutate} from '@/lib/store';
import {rateLimited} from '@/lib/rate-limit';
import {billingEnabled,isPlanId,razorpay,validSignature,RazorpayRequestError,type RazorpaySubscription} from '@/lib/subscriptions';
import {setupSubscription} from '@/lib/subscription-setup';
import {autopayIssue,registrationStatusIssue,type AutopayCode,type AutopayIssue} from '@/lib/autopay-feedback';
export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const recovery=(issue:AutopayIssue,status:number,billingStatus?:string)=>NextResponse.json({ok:false,...issue,status:billingStatus,error:issue.message},{status,headers:issue.retryAfter?{'Retry-After':String(issue.retryAfter)}:undefined});
const recover=(code:AutopayCode,status:number)=>recovery(autopayIssue(code),status);

export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 const action=(await params).action;
 if(!['checkout','confirm','status'].includes(action))return fail('Not found',404);
 if(!billingEnabled()||process.env.OCCANOVA_READ_ONLY==='true')return recover('setup_unavailable',503);
 const expected=process.env.NEXT_PUBLIC_SITE_URL||`${req.nextUrl.protocol}//${req.headers.get('host')}`;
 if(req.headers.get('origin')!==new URL(expected).origin)return fail('Invalid request origin',403);
 if(Number(req.headers.get('content-length')||0)>3000)return fail('Request too large',413);
 try{
 const pending=await currentRegistration();
 if(!pending){const user=await currentUser();if(user?.role==='vendor'&&user.subscription?.trialUsedAt)return NextResponse.json({ok:true,redirect:'/dashboard'});return recover('session_expired',401);}
 if(pending.completedUserId){await finishRegistrationSession(pending.completedUserId);return NextResponse.json({ok:true,redirect:'/dashboard'});}
  const raw=await req.text();if(raw.length>3000)return fail('Request too large',413);
  const body=JSON.parse(raw||'{}');
  if(action==='checkout'){
   const input=z.object({plan:z.string(),consent:z.literal(true)}).parse(body);
   if(!isPlanId(input.plan))return recover('invalid_request',400);
   if(await rateLimited(`registration-checkout:${pending.id}`,1,30000))return recovery({...autopayIssue('rate_limited'),retryAfter:30},429);
   if(pending.subscription?.gatewayId){
    const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${pending.subscription.gatewayId}`);
    if(['authenticated','active'].includes(remote.status)){const user=await mutate(state=>activateRegistration(state,pending.id,remote));await finishRegistrationSession(user.id);return NextResponse.json({ok:true,redirect:'/dashboard'});}
   }
   const record=await setupSubscription('registration',pending.id,input.plan,{occanova_registration_id:pending.id,occanova_plan:input.plan});
   return NextResponse.json({key:process.env.RAZORPAY_KEY_ID,subscriptionId:record.gatewayId,trialEndsAt:record.trialEndsAt});
  }
  const selected=pending.subscription;
  if(!selected?.gatewayId)return recover('authorization_pending',409);
  if(action==='confirm'){
   const input=z.object({paymentId:z.string().regex(/^pay_[A-Za-z0-9]+$/),subscriptionId:z.string().regex(/^sub_[A-Za-z0-9]+$/),signature:z.string().regex(/^[a-f0-9]{64}$/i)}).parse(body);
   if(input.subscriptionId!==selected.gatewayId||!validSignature(`${input.paymentId}|${selected.gatewayId}`,input.signature,process.env.RAZORPAY_KEY_SECRET||''))return recover('confirmation_invalid',403);
  }
  if(await rateLimited(`registration-confirm:${pending.id}`,10,60000))return recovery({...autopayIssue('rate_limited'),retryAfter:60},429);
  const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${selected.gatewayId}`);
  if(!['authenticated','active'].includes(remote.status))return recovery({...registrationStatusIssue(remote.status,remote.expire_by),subscriptionId:selected.gatewayId},409,remote.status);
  const user=await mutate(state=>activateRegistration(state,pending.id,remote));
  await finishRegistrationSession(user.id);
  return NextResponse.json({ok:true,redirect:'/dashboard'});
 }catch(error){
  if(error instanceof z.ZodError||error instanceof SyntaxError)return recover('invalid_request',400);
  const reference=randomUUID();
  // Log a support reference and category without credentials or provider response bodies.
  console.error('Registration AutoPay failed',{reference,action,category:error instanceof RazorpayRequestError?`gateway_${error.status}`:error instanceof Error?error.name:'unknown'});
  const message=error instanceof Error?error.message:'';
  const code:AutopayCode=message==='AutoPay setup is already in progress. Wait a moment before retrying.'?'setup_busy':message==='This mandate is already authorized. Refresh to continue.'?'confirmation_unavailable':error instanceof RazorpayRequestError&&[401,403].includes(error.status)?'setup_unavailable':error instanceof RazorpayRequestError?'gateway_unavailable':'confirmation_unavailable';
  return recovery({...autopayIssue(code,{reference}),retryAfter:code==='setup_busy'?120:undefined},code==='setup_busy'?409:code==='setup_unavailable'?503:502);
 }
}
