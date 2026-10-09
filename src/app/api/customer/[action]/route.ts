import {randomInt,randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {checkPassword,cookieOptions,currentUser,digest,hashPassword,token} from '@/lib/auth';
import {hasEmail,hasMobileOtp,localPreview,mobileOtpEnabled,publicIntakeEnabled,readOnlyDeployment} from '@/lib/config';
import {createCustomer,changeCustomerSetupPhone,setSavedCustomerVendor} from '@/lib/customer';
import {customerSetupCookie,customerSetupCookieOptions,currentCustomerSetup} from '@/lib/customer-session';
import {EmailSendError,sendCustomerVerificationEmail} from '@/lib/email';
import {emailVerificationStatus,issueEmailVerification,recordVerificationEmail,registrationCanResume,revokeEmailVerification,verifyEmail} from '@/lib/email-verification';
import {matchesLoginIdentity,matchesUnverifiedMobile} from '@/lib/login-identity';
import {MobileOtpDeliveryError,consumeMobileChallenge,normalizeIndianMobile,saveMobileChallenge,sendMobileOtp} from '@/lib/mobile-otp';
import {rateLimited} from '@/lib/rate-limit';
import {mutate,readState} from '@/lib/store';

export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const emailSchema=z.string().trim().email().max(160).transform(value=>value.toLowerCase());
const phoneSchema=z.string().trim().max(20).regex(/^\+?[0-9 ()-]+$/,'Enter a valid Indian mobile number.').transform(normalizeIndianMobile).refine(Boolean,'Enter a valid Indian mobile number.');
const registerSchema=z.object({name:z.string().trim().min(2).max(80),email:emailSchema,phone:phoneSchema,password:z.string().min(10).max(128),consent:z.literal(true),website:z.string().max(0).optional()});
const activeCustomer=(user:Awaited<ReturnType<typeof currentUser>>)=>user?.role==='customer'&&user.verified&&user.phoneVerified?user:null;

export async function GET(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 if((await params).action!=='saved')return fail('Not found',404);
 const user=activeCustomer(await currentUser());
 const vendorId=req.nextUrl.searchParams.get('vendorId')||'';
 return NextResponse.json({authenticated:Boolean(user),saved:Boolean(user?.savedVendorIds?.includes(vendorId))},{headers:{'Cache-Control':'private, no-store'}});
}

export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 const action=(await params).action;
 if(!['register','verify','resend','login','mobile-send','mobile-verify','mobile-change','save','profile'].includes(action))return fail('Not found',404);
 if(readOnlyDeployment())return fail('Customer accounts are temporarily unavailable.',503);
 const expected=process.env.NEXT_PUBLIC_SITE_URL||`${req.nextUrl.protocol}//${req.headers.get('host')}`;
 if(req.headers.get('origin')!==new URL(expected).origin)return fail('Invalid request origin',403);
 if(Number(req.headers.get('content-length')||0)>4000)return fail('Request too large',413);
 try{
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]??'local';
  if(await rateLimited(`customer:${ip}:${action}`,12))return fail('Too many requests. Please try again in a minute.',429);
  const raw=await req.text();if(raw.length>4000)return fail('Request too large',413);
  const body=JSON.parse(raw||'{}');

  if(action==='register'){
   if(!publicIntakeEnabled())return fail('Customer registration is temporarily unavailable.',503);
   if(!mobileOtpEnabled()||(!hasEmail()&&!localPreview()))return fail('Email or mobile verification is temporarily unavailable.',503);
   const input=registerSchema.parse(body),value=token();
   if(await rateLimited(`account-email:${digest(input.email)}`,3,15*60*1000))return fail('Too many email requests. Please wait 15 minutes.',429);
   await mutate(state=>createCustomer(state,{name:input.name,email:input.email,phone:input.phone,passwordHash:hashPassword(input.password),verificationHash:digest(value)}));
   let sent=false;
   try{const providerId=await sendCustomerVerificationEmail(input.email,value);sent=Boolean(providerId)||localPreview();await mutate(state=>recordVerificationEmail(state,input.email,{status:'accepted',attemptedAt:new Date().toISOString(),providerId}));}
   catch(error){console.error('Customer verification email failed',error instanceof EmailSendError?error.source:'unknown');await mutate(state=>recordVerificationEmail(state,input.email,{status:'failed',attemptedAt:new Date().toISOString()}));}
   return NextResponse.json({ok:true,email:input.email,emailDelivery:localPreview()?'preview':sent?'sent':'delayed',verificationUrl:localPreview()?`/customer/verify?token=${value}`:undefined,message:sent?'Account saved. Check Inbox, Spam and Promotions for your email verification link. Then sign in to verify your mobile number.':'Account saved, but the email could not be sent. Request a new verification link; your account remains inactive.'});
  }

  if(action==='resend'){
   const email=emailSchema.parse(body.email),state=await readState();
   const customer=state.users.find(row=>row.role==='customer'&&row.email.trim().toLowerCase()===email);
   if(!customer)return NextResponse.json({ok:true,status:'not_found',message:'No customer account was found for this email. Check the spelling or create an account.'});
   const status=emailVerificationStatus(state,email);
   if(status==='already_verified')return NextResponse.json({ok:true,status,message:'Your email is already verified. Log in with your email and password to finish mobile verification.'});
   if(!hasEmail()&&!localPreview())return fail('Verification email is temporarily unavailable.',503);
   if(await rateLimited(`account-email:${digest(email)}`,3,15*60*1000))return fail('Too many email requests. Please wait 15 minutes.',429);
   const value=token(),hash=digest(value);
   await mutate(current=>issueEmailVerification(current,email,hash));
   try{const providerId=await sendCustomerVerificationEmail(email,value);await mutate(current=>recordVerificationEmail(current,email,{status:'accepted',attemptedAt:new Date().toISOString(),providerId}));}
   catch(error){await mutate(current=>{revokeEmailVerification(current,hash);recordVerificationEmail(current,email,{status:'failed',attemptedAt:new Date().toISOString()});});console.error('Customer resend failed',error instanceof EmailSendError?error.source:'unknown');return fail('We could not send the verification email. Earlier unexpired links still work. Please try again.',503);}
   return NextResponse.json({ok:true,status:localPreview()?'preview':'sent',message:'A new verification link is ready. Check Inbox, Spam and Promotions.',verificationUrl:localPreview()?`/customer/verify?token=${value}`:undefined});
  }

  if(action==='verify'){
   const value=z.string().regex(/^[a-f0-9]{64}$/).parse(body.token),hash=digest(value),state=await readState();
   const link=state.tokens.find(row=>row.kind==='verify'&&row.hash===hash&&row.expires>Date.now());
   if(!state.users.some(row=>row.id===link?.userId&&row.role==='customer'))return fail('This customer verification link is invalid or expired. Request a new link.',400);
   const result=await mutate(current=>verifyEmail(current,hash,digest(token())));
   return NextResponse.json({ok:true,alreadyVerified:result.alreadyVerified,redirect:'/customer/login',message:result.alreadyVerified?'Your email is already verified. Log in to continue.':'Email verified. Log in to verify your mobile number.'});
  }

  if(action==='login'){
   const input=z.object({identity:z.string().trim().min(1).max(160),password:z.string().min(1).max(128)}).parse(body);
   const state=await readState();
   const user=state.users.find(row=>row.role==='customer'&&matchesLoginIdentity(row,input.identity));
   if(!user){
    const unverified=state.users.find(row=>row.role==='customer'&&matchesUnverifiedMobile(row,input.identity)&&checkPassword(input.password,row.passwordHash));
    return fail(unverified?'Sign in with your email and password first. Mobile login works after OTP verification.':'Email/mobile or password is incorrect.',unverified?403:401);
   }
   if(!checkPassword(input.password,user.passwordHash))return fail('Email/mobile or password is incorrect.',401);
   if(!user.verified)return fail('Verify your email before signing in. You can request a new link below.',403);
   const value=token(),hash=digest(value),jar=await cookies();
   if(!user.phoneVerified){
    await mutate(current=>{current.tokens=current.tokens.filter(row=>!(row.userId===user.id&&row.kind==='customer-setup'));current.tokens.push({hash,userId:user.id,kind:'customer-setup',expires:Date.now()+30*60*1000});});
    jar.set(customerSetupCookie,value,customerSetupCookieOptions);
    return NextResponse.json({ok:true,redirect:'/customer/verify-mobile'});
   }
   await mutate(current=>{current.sessions=current.sessions.filter(row=>row.expires>Date.now());current.sessions.push({hash,userId:user.id,expires:Date.now()+7*86400000});});
   jar.set('occanova_session',value,cookieOptions);
   return NextResponse.json({ok:true,redirect:'/customer'});
  }

  if(action==='mobile-send'||action==='mobile-verify'||action==='mobile-change'){
   const user=await currentCustomerSetup();
   if(!user)return fail('Log in with your email to finish customer mobile verification.',401);
   if(!mobileOtpEnabled())return fail('Mobile verification is temporarily unavailable.',503);
   if(action==='mobile-change'){
    const phone=phoneSchema.parse(body.phone);
    if(await rateLimited(`customer-phone-change:${user.id}`,3,60*60*1000))return fail('Too many number changes. Please try again in an hour.',429);
    const changed=await mutate(state=>changeCustomerSetupPhone(state,user.id,phone));
    return NextResponse.json({ok:true,phone:changed.phone,message:'Mobile number updated. Send a new OTP.'});
   }
   const phone=normalizeIndianMobile(user.phone);
   if(!phone)return fail('Enter a valid Indian mobile number.',400);
   if(action==='mobile-send'){
    if(await rateLimited(`customer-mobile-send:${user.id}`,3,10*60*1000)||await rateLimited(`mobile-phone:${phone}`,5,60*60*1000))return fail('Too many OTP requests. Please wait before trying again.',429);
    const code=String(randomInt(100000,1000000));
    const hash=await mutate(state=>{const current=state.users.find(row=>row.id===user.id&&row.role==='customer'&&row.verified&&!row.phoneVerified&&row.phone===phone);if(!current)throw Error('Customer setup changed. Refresh and try again.');return saveMobileChallenge(state,user.id,phone,code);});
    if(hasMobileOtp())try{await sendMobileOtp(phone,code);}catch(error){await mutate(state=>{state.tokens=state.tokens.filter(row=>!(row.userId===user.id&&row.kind==='mobile'&&row.hash===hash));});throw error;}
    return NextResponse.json({ok:true,message:hasMobileOtp()?'A six-digit OTP was sent to your mobile number.':'A local preview OTP is ready.',previewCode:hasMobileOtp()?undefined:code});
   }
   const code=z.string().regex(/^\d{6}$/).parse(body.code);
   if(await rateLimited(`customer-mobile-check:${user.id}`,5,10*60*1000))return fail('Too many incorrect OTP attempts. Wait 10 minutes and request a new code.',429);
   const sessionValue=token(),setupValue=(await cookies()).get(customerSetupCookie)?.value;
   const verified=await mutate(state=>{
    const current=state.users.find(row=>row.id===user.id&&row.role==='customer'&&row.verified&&!row.phoneVerified&&row.phone===phone);
    if(!current)throw Error('Customer setup changed. Refresh and try again.');
    if(state.users.some(row=>row.id!==user.id&&normalizeIndianMobile(row.phone)===phone)||state.registrations.some(row=>!row.completedUserId&&registrationCanResume(row)&&normalizeIndianMobile(row.phone)===phone))throw Error('Another account already uses this mobile number.');
    if(!consumeMobileChallenge(state,user.id,phone,code))return false;
    current.phoneVerified=true;current.phoneVerifiedAt=new Date().toISOString();
    state.tokens=state.tokens.filter(row=>!(row.userId===user.id&&row.kind==='customer-setup'&&row.hash===digest(setupValue??'')));
    state.sessions.push({hash:digest(sessionValue),userId:user.id,expires:Date.now()+7*86400000});
    state.audit.unshift({id:randomUUID(),actor:current.email,action:'Customer mobile verified',target:current.id,remarks:'Verified with one-time SMS code',at:current.phoneVerifiedAt});
    return true;
   });
   if(!verified)return fail('The OTP is incorrect or expired.',400);
   const jar=await cookies();jar.delete(customerSetupCookie);jar.set('occanova_session',sessionValue,cookieOptions);
   return NextResponse.json({ok:true,redirect:'/customer',message:'Mobile number verified. Your customer account is ready.'});
  }

  const user=activeCustomer(await currentUser());
  if(!user)return fail('Sign in to your verified customer account.',401);
  if(action==='save'){
   const input=z.object({vendorId:z.string().min(1).max(100),saved:z.boolean()}).parse(body);
   const saved=await mutate(state=>setSavedCustomerVendor(state,user.id,input.vendorId,input.saved));
   return NextResponse.json({ok:true,saved});
  }
  if(action==='profile'){
   const input=z.object({name:z.string().trim().min(2).max(80)}).parse(body);
   await mutate(state=>{const account=state.users.find(row=>row.id===user.id&&row.role==='customer');if(!account)throw Error('Customer account not found.');account.name=input.name;});
   return NextResponse.json({ok:true,message:'Your name was updated.'});
  }
  return fail('Not found',404);
 }catch(error){
  if(error instanceof z.ZodError||error instanceof SyntaxError)return fail(error instanceof z.ZodError?error.issues[0]?.message||'Check your details.':'Invalid request.',400);
  if(error instanceof MobileOtpDeliveryError)return fail(error.message,503);
  if(error instanceof Error&&['An account or registration already uses','Another account already uses','This vendor is not available','Your shortlist is full','Customer setup','Enter a valid Indian mobile number','Sign in to your verified customer account'].some(prefix=>error.message.startsWith(prefix)))return fail(error.message,409);
  console.error('Customer API failed',error instanceof Error?error.name:'unknown');
  return fail('Something went wrong. Please try again or contact info@occanova.com.',500);
 }
}
