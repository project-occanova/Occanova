import {randomInt,randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {hasMobileOtp,mobileOtpEnabled,readOnlyDeployment} from '@/lib/config';
import {currentRegistration} from '@/lib/registration-session';
import {changeRegistrationPhone} from '@/lib/registration';
import {MobileOtpDeliveryError,consumeMobileChallenge,normalizeIndianMobile,saveMobileChallenge,sendMobileOtp} from '@/lib/mobile-otp';
import {rateLimited} from '@/lib/rate-limit';
import {mutate} from '@/lib/store';

export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const phoneSchema=z.string().trim().max(20).regex(/^\+?[0-9 ()-]+$/).transform(normalizeIndianMobile).refine(Boolean);

export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 const action=(await params).action;
 if(!['send','verify','change'].includes(action))return fail('Not found',404);
 if(readOnlyDeployment())return fail('Registration is temporarily unavailable.',503);
 const expected=process.env.NEXT_PUBLIC_SITE_URL||`${req.nextUrl.protocol}//${req.headers.get('host')}`;
 if(req.headers.get('origin')!==new URL(expected).origin)return fail('Invalid request origin',403);
 if(Number(req.headers.get('content-length')||0)>1000)return fail('Request too large',413);
 try{
  const pending=await currentRegistration();
  if(!pending||!pending.mobileVerificationRequired||pending.completedUserId)return fail('Log in with your email to continue registration.',401);
  if(!mobileOtpEnabled())return fail('Mobile verification is temporarily unavailable. Please try again later.',503);
  const raw=await req.text();if(raw.length>1000)return fail('Request too large',413);
  const body=JSON.parse(raw||'{}');
  if(action==='change'){
   if(await rateLimited(`registration-phone-change:${pending.id}`,3,60*60*1000))return fail('Too many number changes. Please try again in an hour.',429);
   const phone=phoneSchema.parse(body.phone);
   const changed=await mutate(state=>changeRegistrationPhone(state,pending.id,phone));
   return NextResponse.json({ok:true,phone:changed.phone,message:'Mobile number updated. Send a new verification code.'});
  }
  if(pending.phoneVerified)return NextResponse.json({ok:true,verified:true,message:'Your mobile number is already verified.'});
  const phone=normalizeIndianMobile(pending.phone);
  if(!phone)return fail('Enter a valid Indian mobile number before continuing.',400);
  if(action==='send'){
   if(await rateLimited(`mobile-send:${pending.id}`,3,10*60*1000))return fail('Too many verification requests. Please wait 10 minutes and try again.',429);
   if(await rateLimited(`mobile-phone:${phone}`,5,60*60*1000))return fail('Too many verification requests for this number. Please try again in an hour.',429);
   const code=String(randomInt(100000,1000000));
   const hash=await mutate(state=>{
    const row=state.registrations.find(item=>item.id===pending.id&&!item.completedUserId);
    if(!row?.verified||normalizeIndianMobile(row.phone)!==phone||row.phoneVerified)throw Error('Registration changed. Refresh and try again.');
    return saveMobileChallenge(state,row.id,phone,code);
   });
   if(hasMobileOtp()){
    try{await sendMobileOtp(phone,code);}catch(error){await mutate(state=>{state.tokens=state.tokens.filter(row=>!(row.userId===pending.id&&row.kind==='mobile'&&row.hash===hash));});throw error;}
    return NextResponse.json({ok:true,message:'A six-digit verification code was sent by SMS.'});
   }
   return NextResponse.json({ok:true,message:'A verification code was created for this local preview.',previewCode:code});
  }
  const code=z.string().regex(/^\d{6}$/).parse(body.code);
  if(await rateLimited(`mobile-check:${pending.id}`,5,10*60*1000))return fail('Too many incorrect attempts. Please wait 10 minutes and request a new code.',429);
  const approved=await mutate(state=>{
   const row=state.registrations.find(item=>item.id===pending.id&&!item.completedUserId);
   if(!row?.verified||normalizeIndianMobile(row.phone)!==phone)throw Error('Registration changed. Refresh and try again.');
   if(!consumeMobileChallenge(state,row.id,phone,code))return false;
   row.phoneVerified=true;row.phoneVerifiedAt=new Date().toISOString();
   state.audit.unshift({id:randomUUID(),actor:row.email,action:'Registration mobile number verified',target:'Pending vendor account',remarks:'Verified by one-time SMS code',at:row.phoneVerifiedAt});
   return true;
  });
  if(!approved)return fail('The verification code is incorrect or expired.',400);
  return NextResponse.json({ok:true,verified:true,message:'Mobile number verified. You can now set up AutoPay.'});
 }catch(error){
  if(error instanceof z.ZodError||error instanceof SyntaxError)return fail('Enter a valid mobile number or six-digit code.',400);
  if(error instanceof MobileOtpDeliveryError)return fail(error.message,503);
  if(error instanceof Error&&['An account already uses this mobile number.','The mobile number cannot be changed after AutoPay setup starts. Contact Occanova support.','Registration changed. Refresh and try again.','Enter a valid Indian mobile number.'].includes(error.message))return fail(error.message,409);
  console.error('Registration mobile verification failed',error instanceof Error?error.name:'unknown');
  return fail('Mobile verification could not be completed. Please try again.',500);
 }
}
