import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {currentRegistration,finishRegistrationSession} from '@/lib/registration-session';
import {activateRegistration} from '@/lib/registration';
import {mutate} from '@/lib/store';
import {rateLimited} from '@/lib/rate-limit';
import {billingEnabled,isPlanId,razorpay,validSignature,type RazorpaySubscription} from '@/lib/subscriptions';
import {setupSubscription} from '@/lib/subscription-setup';
export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});

export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 const action=(await params).action;
 if(!['checkout','confirm','status'].includes(action))return fail('Not found',404);
 if(!billingEnabled()||process.env.OCCANOVA_READ_ONLY==='true')return fail('AutoPay registration is temporarily unavailable.',503);
 const expected=process.env.NEXT_PUBLIC_SITE_URL||`${req.nextUrl.protocol}//${req.headers.get('host')}`;
 if(req.headers.get('origin')!==new URL(expected).origin)return fail('Invalid request origin',403);
 if(Number(req.headers.get('content-length')||0)>3000)return fail('Request too large',413);
 try{
 const pending=await currentRegistration();
 if(!pending){const user=await currentUser();if(user?.role==='vendor'&&user.subscription?.trialUsedAt)return NextResponse.json({ok:true,redirect:'/dashboard'});return fail('Verify your email or log in to resume registration.',401);}
 if(pending.completedUserId){await finishRegistrationSession(pending.completedUserId);return NextResponse.json({ok:true,redirect:'/dashboard'});}
  const raw=await req.text();if(raw.length>3000)return fail('Request too large',413);
  const body=JSON.parse(raw||'{}');
  if(action==='checkout'){
   const input=z.object({plan:z.string(),consent:z.literal(true)}).parse(body);
   if(!isPlanId(input.plan))return fail('Choose a valid plan.');
   if(await rateLimited(`registration-checkout:${pending.id}`,1,30000))return fail('Please wait 30 seconds before retrying.',429);
   if(pending.subscription?.gatewayId){
    const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${pending.subscription.gatewayId}`);
    if(['authenticated','active'].includes(remote.status)){const user=await mutate(state=>activateRegistration(state,pending.id,remote));await finishRegistrationSession(user.id);return NextResponse.json({ok:true,redirect:'/dashboard'});}
   }
   const record=await setupSubscription('registration',pending.id,input.plan,{occanova_registration_id:pending.id,occanova_plan:input.plan});
   return NextResponse.json({key:process.env.RAZORPAY_KEY_ID,subscriptionId:record.gatewayId,trialEndsAt:record.trialEndsAt});
  }
  const selected=pending.subscription;
  if(!selected?.gatewayId)return fail('Authorize AutoPay to finish registration.',409);
  if(action==='confirm'){
   const input=z.object({paymentId:z.string().regex(/^pay_[A-Za-z0-9]+$/),subscriptionId:z.string().regex(/^sub_[A-Za-z0-9]+$/),signature:z.string().regex(/^[a-f0-9]{64}$/i)}).parse(body);
   if(input.subscriptionId!==selected.gatewayId||!validSignature(`${input.paymentId}|${selected.gatewayId}`,input.signature,process.env.RAZORPAY_KEY_SECRET||''))return fail('Invalid AutoPay confirmation.',403);
  }
  if(await rateLimited(`registration-confirm:${pending.id}`,10,60000))return fail('Please wait before checking again.',429);
  const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${selected.gatewayId}`);
  if(!['authenticated','active'].includes(remote.status))return NextResponse.json({ok:false,status:remote.status,error:'AutoPay is not authorized yet. Complete Razorpay Checkout to activate your account.'},{status:409});
  const user=await mutate(state=>activateRegistration(state,pending.id,remote));
  await finishRegistrationSession(user.id);
  return NextResponse.json({ok:true,redirect:'/dashboard'});
 }catch(error){
  if(error instanceof z.ZodError||error instanceof SyntaxError)return fail('Check your plan and AutoPay consent.');
  console.error('Registration AutoPay failed',error);
  return fail('AutoPay setup could not be confirmed. Your account has not been activated. Retry or check the authorization status.',502);
 }
}
