import { NextRequest,NextResponse,after } from 'next/server';
import { randomInt,randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { mutate,readPublicDirectory,readState } from '@/lib/store';
import { currentUser,hashPassword,checkPassword,token,digest,cookieOptions,portalAllowed } from '@/lib/auth';
import { registerSchema,enquirySchema,profileSchema,draftProfileSchema,adminVendorProfileSchema,vendorLifecycleSchema } from '@/lib/validation';
import { slugify,publicVendors,publicVendorProfile } from '@/lib/directory';
import {backendReady,hasDatabase,hasEmail,hasMobileOtp,hasStorage,localPreview,mobileOtpEnabled,publicIntakeEnabled,readOnlyDeployment} from '@/lib/config';
import {rateLimited} from '@/lib/rate-limit';
import {EmailSendError,sendEnquiryNotifications,sendResetEmail,sendVerificationEmail} from '@/lib/email';
import {cleanupOrphanedUploads,createDownload,deleteUploads,validVendorKey,vendorStorageKeys} from '@/lib/storage';
import {MobileOtpDeliveryError,mobileOtpHash,normalizeIndianMobile,sendMobileOtp} from '@/lib/mobile-otp';
import {billingEnabled,billingMode} from '@/lib/subscriptions';
import {assertPlanAccess,assertPortfolioLimit,PlanAccessError} from '@/lib/plan-access';
import {startRegistration} from '@/lib/registration';
import {registrationCookie,registrationCookieOptions} from '@/lib/registration-session';
import {matchesLoginIdentity} from '@/lib/login-identity';
import {issuePasswordReset,resetAccountPassword,revokePasswordReset} from '@/lib/password-reset';
import {validationFeedback} from '@/lib/form-feedback';
import {notifyVendor,reviewNotificationKind,markNotificationsRead} from '@/lib/vendor-notifications';
import {deliverReviewNotification} from '@/lib/review-delivery';
import {workspaceVersion} from '@/lib/workspace-version';
import {emailVerificationStatus,issueEmailVerification,recordVerificationEmail,revokeEmailVerification,verificationRecoveryMessage,verifyEmail} from '@/lib/email-verification';
export const runtime='nodejs';
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function GET(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
 const route=(await params).path.join('/');
 if(route==='health')return NextResponse.json({ok:true,database:hasDatabase(),email:hasEmail(),mobileOtp:hasMobileOtp(),mobileOtpEnabled:mobileOtpEnabled(),subscriptions:billingEnabled(),billingMode:billingMode(),storage:hasStorage(),writable:backendReady()&&!readOnlyDeployment(),intake:publicIntakeEnabled()});
 if(route==='workspace-status'){
  const value=(await cookies()).get('occanova_session')?.value;if(!value)return fail('Please sign in.',401);
  const state=await readState();const session=state.sessions.find(row=>row.hash===digest(value)&&row.expires>Date.now());const user=state.users.find(row=>row.id===session?.userId);
  if(!user)return fail('Please sign in.',401);
  return NextResponse.json({version:workspaceVersion(state,user)},{headers:{'Cache-Control':'private, no-store'}});
 }
 if(route==='maintenance/storage'){
  if(!hasStorage())return NextResponse.json({ok:true,skipped:true,reason:'Private file storage is not configured.'});
  const secret=process.env.CRON_SECRET;if(!secret)return fail('Maintenance is not configured.',503);
  if(req.headers.get('authorization')!==`Bearer ${secret}`)return fail('Access denied',401);
  const state=await readState();const referenced=new Set(state.vendors.flatMap(vendorStorageKeys));
  return NextResponse.json({ok:true,...await cleanupOrphanedUploads(referenced,new Date(Date.now()-24*60*60*1000))});
 }
 if(!['media','vendors'].includes(route))return fail('Not found',404);
 if(route==='vendors'){
  const s=await readPublicDirectory();
  return NextResponse.json(publicVendors(s.vendors,Object.fromEntries(req.nextUrl.searchParams),s.users).map(publicVendorProfile));
 }
 const s=await readState();
 if(route==='media'){
  if(!hasStorage())return fail('Private file storage is not configured.',503);
  const key=req.nextUrl.searchParams.get('key')||'';if(!validVendorKey(key))return fail('Invalid file key',400);
  const [,ownerId,kind]=key.split('/');const user=await currentUser();const vendor=s.vendors.find(x=>x.userId===ownerId);const privileged=user&&(user.role==='admin'||user.id===ownerId);
  if(kind==='document'&&!privileged)return fail('Access denied',403);
  const path=`/api/media?key=${encodeURIComponent(key)}`;if(!privileged&&!(vendor&&publicVendors([vendor],{},s.users).length&&(vendor.image===path||vendor.gallery.includes(path))))return fail('File not found',404);
  const response=NextResponse.redirect(await createDownload(key),302);response.headers.set('Cache-Control','private, no-store');return response;
 }
 return fail('Not found',404);
}
export async function POST(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
 try {
  if(readOnlyDeployment())return fail('This public preview is read-only until production services are connected.',503);
  const route=(await params).path.join('/');
  const origin=req.headers.get('origin');
  const expectedOrigin=process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.headers.get('host')}`;
  if(!origin || origin!==new URL(expectedOrigin).origin)return fail('Invalid request origin',403);
  if(route==='auth/register'&&!publicIntakeEnabled())return fail('Public registration is not open yet.',503);
  if(route==='enquiries'&&!publicIntakeEnabled())return fail('Public enquiries are not open yet.',503);
  if(Number(req.headers.get('content-length')||0)>16000)return fail('Request too large',413);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]??'local';
  if(await rateLimited(ip+route,route.startsWith('auth/')?10:30))return fail('Too many requests. Please try again in a minute.',429);
  const raw=await req.text();if(raw.length>16000)return fail('Request too large',413);
  const b=JSON.parse(raw||'{}');
  // Sharing a recipient budget across public email actions prevents resend/reset spam.
  if(route==='auth/forgot'){
   const email=z.string().trim().email().max(160).transform(value=>value.toLowerCase()).parse(b.email);
   if(await rateLimited(`account-email:${digest(email)}`,3,15*60*1000))return fail('Too many email requests for this address. Please wait 15 minutes and check your inbox or spam folder.',429);
  }
  if(route==='auth/register') {
   if((!localPreview()||process.env.SUBSCRIPTIONS_ENABLED==='true')&&!billingEnabled())return fail('AutoPay registration is temporarily unavailable. Please try again later.',503);
   const v=registerSchema.parse(b);const t=token();const paid=billingEnabled();
   if(paid&&!mobileOtpEnabled())return fail('Mobile verification is temporarily unavailable. Please try again later.',503);
   if(await rateLimited(`account-email:${digest(v.email)}`,3,15*60*1000))return fail('Too many email requests for this address. Please wait 15 minutes and check your inbox or spam folder.',429);
   const id=await mutate(s=>{
    if(paid)return startRegistration(s,{email:v.email,phone:v.phone,passwordHash:hashPassword(v.password),plan:v.plan,autopayConsent:v.autopayConsent,verificationHash:digest(t),mobileVerificationRequired:true}).id;
    if(s.users.some(u=>u.email===v.email||normalizeIndianMobile(u.phone)===v.phone))throw Error('An account already uses this email or phone.');
    const id=randomUUID();s.users.push({id,email:v.email,phone:v.phone,passwordHash:hashPassword(v.password),role:'vendor',verified:false,phoneVerified:false});s.tokens.push({hash:digest(t),userId:id,kind:'verify',expires:Date.now()+86400000});return id;
   });
   let delivered=false;if(hasEmail()){const attemptedAt=new Date().toISOString();let providerId:string|undefined;let failure:EmailSendError|undefined;try{providerId=await sendVerificationEmail(v.email,t);delivered=true;}catch(error){failure=error instanceof EmailSendError?error:new EmailSendError('Email send failed.','transport');console.error('Registration verification email failed:',failure.source,failure.httpStatus||'no HTTP status');}const delivery={status:delivered?'accepted' as const:'failed' as const,attemptedAt,providerId,failureSource:failure?.source,httpStatus:failure?.httpStatus};after(async()=>{try{await mutate(s=>recordVerificationEmail(s,v.email,delivery));}catch{console.error('Verification email tracking could not be saved.');}});}
   const directVerification=localPreview()||!hasEmail();
   return NextResponse.json({ok:true,id,email:v.email,emailDelivery:directVerification?'preview':delivered?'sent':'delayed',message:paid?(directVerification?'Registration saved. Verify your email and mobile number, then authorize AutoPay to activate your vendor account.':delivered?'Registration saved. Our email provider accepted the verification email; check Inbox, Spam and Promotions. Next, verify your mobile number before AutoPay.':'Registration saved, but we could not send the verification email. Request a new link below; your account remains inactive.'):directVerification?'Account created. Use the secure verification link below to activate it.':delivered?'Account created. Our email provider accepted the verification email; check Inbox, Spam and Promotions.':'Account created, but we could not send the verification email. Request a new link.',verificationUrl:directVerification?`/verify?token=${t}`:undefined});
  }
  if(route==='auth/verify') {
   if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))return fail('This verification link is incomplete or invalid. Request a new link below.');
   const sessionToken=token();const jar=await cookies();const current=jar.get(registrationCookie)?.value;
   const result=await mutate(s=>verifyEmail(s,digest(b.token),digest(sessionToken),current?digest(current):undefined));
   if(result.issueSession)jar.set(registrationCookie,sessionToken,registrationCookieOptions);
   return NextResponse.json({ok:true,alreadyVerified:result.alreadyVerified,redirect:result.pending?'/register/complete':undefined,message:result.alreadyVerified?'Your email is already verified. Log in to continue your registration or open your dashboard.':'Email verified. Log in to continue.'});
  }
  if(route==='auth/login') {
   const v=z.object({identity:z.string().trim().min(1).max(160),password:z.string().min(1).max(128),admin:z.boolean().optional().default(false)}).parse(b);const s=await readState();const user=s.users.find(u=>v.admin?u.email.trim().toLowerCase()===v.identity.toLowerCase():matchesLoginIdentity(u,v.identity));
   if(!user){
    const pending=s.registrations.find(row=>!row.completedUserId&&matchesLoginIdentity(row,v.identity));
    if(!v.admin&&pending&&checkPassword(v.password,pending.passwordHash)){
     if(!pending.verified)return fail('Verify your email before setting up AutoPay.',403);
     if(!billingEnabled())return fail('AutoPay registration is temporarily unavailable.',503);
     const t=token();await mutate(current=>{const row=current.registrations.find(item=>item.id===pending.id);if(!row)throw Error('Registration expired.');row.sessionHash=digest(t);row.expires=Date.now()+86400000;});
     (await cookies()).set(registrationCookie,t,registrationCookieOptions);return NextResponse.json({ok:true,redirect:'/register/complete'});
    }
    return fail('Email/mobile or password is incorrect.',401);
   }
   if(!checkPassword(v.password,user.passwordHash))return fail('Email/mobile or password is incorrect.',401);
   if(!portalAllowed(user.role,v.admin))return fail(v.admin?'Administrator access is required.':'Use the separate administrator sign-in page.',403);
   if(!user.verified)return fail('Verify your email before signing in.',403);
   const vendor=user.role==='vendor'?s.vendors.find(x=>x.userId===user.id):undefined;
   if(vendor?.status==='inactive'||vendor?.status==='suspended')return fail('This vendor account is inactive. Contact Occanova support.',403);
   const t=token();await mutate(s=>{s.sessions=s.sessions.filter(x=>x.expires>Date.now());s.sessions.push({hash:digest(t),userId:user.id,expires:Date.now()+7*86400000});});(await cookies()).set('occanova_session',t,cookieOptions);return NextResponse.json({ok:true,redirect:user.role==='admin'?'/admin':'/dashboard'});
  }
  if(route==='auth/logout'){const value=(await cookies()).get('occanova_session')?.value;await mutate(s=>{s.sessions=s.sessions.filter(x=>x.hash!==digest(value??''));});(await cookies()).delete('occanova_session');(await cookies()).delete(registrationCookie);return NextResponse.json({ok:true});}
  if(route==='auth/forgot') {
   if(!hasEmail()&&!localPreview())return fail('Password reset email is not available yet. Please contact Occanova support.',503);
   const email=z.string().trim().email().max(160).transform(x=>x.toLowerCase()).parse(b.email);const t=token();const hash=digest(t);
   const found=await mutate(s=>issuePasswordReset(s,email,hash));
   if(found)try{await sendResetEmail(email,t);}catch{await mutate(s=>revokePasswordReset(s,hash));return fail('We could not send the reset email. Any earlier unexpired reset link still works. Check your inbox and spam folder, or try again later.',503);}
   return NextResponse.json({ok:true,message:'If an account or unfinished registration exists for this email, a password reset link has been sent. Check your inbox and spam folder. The link works for 30 minutes.',verificationUrl:found&&localPreview()?`/reset-password?token=${t}`:undefined});
  }
  if(route==='auth/resend'||route==='auth/verification-status') {
   const email=z.string().trim().email().max(160).transform(x=>x.toLowerCase()).parse(b.email);const t=token();const hash=digest(t);
   const status= emailVerificationStatus(await readState(),email);
   if(route==='auth/verification-status')return NextResponse.json({ok:true,status,message:status==='unverified'?'Your email is not verified yet. Request a verification link to continue.':verificationRecoveryMessage(status)});
   if(status!=='unverified')return NextResponse.json({ok:true,status,message:verificationRecoveryMessage(status)});
   if(!hasEmail()&&!localPreview())return fail('Verification email is temporarily unavailable. Please try again later or contact info@occanova.com.',503);
   if(await rateLimited(`account-email:${digest(email)}`,3,15*60*1000))return fail('Too many email requests for this address. Please wait 15 minutes and check your inbox or spam folder.',429);
   const outcome=await mutate(s=>{const now=Date.now();const current=emailVerificationStatus(s,email,now);if(current==='unverified')issueEmailVerification(s,email,hash,now);return current;});
   if(outcome!=='unverified')return NextResponse.json({ok:true,status:outcome,message:verificationRecoveryMessage(outcome)});
   const attemptedAt=new Date().toISOString();let providerId:string|undefined;
   try{providerId=await sendVerificationEmail(email,t);}catch(error){
    const failure=error instanceof EmailSendError?error:new EmailSendError('Email send failed.','transport');
    console.error('Resent verification email failed:',failure.source,failure.httpStatus||'no HTTP status');
    await mutate(s=>{revokeEmailVerification(s,hash);recordVerificationEmail(s,email,{status:'failed',attemptedAt,failureSource:failure.source,httpStatus:failure.httpStatus});});
    return fail('We could not send the verification email. Any earlier unexpired link still works. Please try again later or contact info@occanova.com.',503);
   }
   after(async()=>{try{await mutate(s=>recordVerificationEmail(s,email,{status:'accepted',attemptedAt,providerId}));}catch{console.error('Verification email tracking could not be saved.');}});
   return NextResponse.json({ok:true,status:hasEmail()?'sent':'preview',message:hasEmail()?`Our email provider accepted a new verification message for ${email}. Check Inbox, Spam and Promotions. Acceptance does not guarantee inbox delivery; if it does not arrive, contact info@occanova.com.`:'A verification link is ready in this local preview. No email was sent.',verificationUrl:localPreview()?`/verify?token=${t}`:undefined});
  }
  if(route==='auth/reset'){const v=z.object({token:z.string().length(64),password:z.string().min(10).max(128)}).parse(b);await mutate(s=>resetAccountPassword(s,digest(v.token),hashPassword(v.password)));return NextResponse.json({ok:true});}
  if(route==='enquiries') {const v=enquirySchema.parse(b);const saved=await mutate(s=>{const vendor=publicVendors(s.vendors,{},s.users).find(x=>x.id===v.vendorId&&!x.sample);if(!vendor)throw Error('This vendor is unavailable.');const {website,...data}=v;void website;const enquiry={...data,id:randomUUID(),status:'new' as const,createdAt:new Date().toISOString()};s.enquiries.push(enquiry);return {enquiry,vendor};});let delivered=true;try{await sendEnquiryNotifications(saved.enquiry,saved.vendor);}catch{delivered=false;}return NextResponse.json({ok:true,id:saved.enquiry.id,message:localPreview()?'Enquiry saved in this local preview. No notification was sent.':delivered?'Your enquiry has been sent to the vendor.':'Your enquiry was saved. The email notification is delayed.'});}
  const user=await currentUser();if(!user)return fail('Please sign in.',401);
  if(route==='notifications/read'){
   const {ids}=z.object({ids:z.array(z.string().uuid()).min(1).max(30)}).parse(b);
   await mutate(state=>{const owner=state.users.find(row=>row.id===user.id);if(!owner)throw Error('Access denied');markNotificationsRead(owner,ids);});
   return NextResponse.json({ok:true});
  }
  if(route==='auth/mobile/send'){
   if(user.role!=='vendor')return fail('Vendor access required',403);
   if(user.phoneVerified)return NextResponse.json({ok:true,verified:true,message:'Your mobile number is already verified.'});
   const phone=normalizeIndianMobile(user.phone);if(!phone)return fail('Your account does not have a valid Indian mobile number.',400);
   if(!mobileOtpEnabled())return fail('Mobile verification is not configured yet.',503);
   if(await rateLimited(`mobile-send:${user.id}`,3,10*60*1000))return fail('Too many verification requests. Please wait 10 minutes and try again.',429);
   if(await rateLimited(`mobile-phone:${phone}`,5,60*60*1000))return fail('Too many verification requests for this number. Please try again in an hour.',429);
   const code=String(randomInt(100000,1000000));
   const hash=mobileOtpHash(user.id,phone,code);
   await mutate(s=>{s.tokens=s.tokens.filter(x=>!(x.userId===user.id&&x.kind==='mobile'));s.tokens.push({hash,userId:user.id,kind:'mobile',expires:Date.now()+10*60*1000});});
   if(hasMobileOtp()){
    try{await sendMobileOtp(phone,code);}catch(error){await mutate(s=>{s.tokens=s.tokens.filter(x=>!(x.userId===user.id&&x.kind==='mobile'&&x.hash===hash));});throw error;}
    return NextResponse.json({ok:true,message:'A six-digit verification code was sent by SMS.'});
   }
   return NextResponse.json({ok:true,message:'A verification code was created for this local preview.',previewCode:code});
  }
  if(route==='auth/mobile/verify'){
   if(user.role!=='vendor')return fail('Vendor access required',403);
   if(user.phoneVerified)return NextResponse.json({ok:true,verified:true,message:'Your mobile number is already verified.'});
   const code=z.string().regex(/^\d{6}$/,'Enter the six-digit verification code.').parse(b.code);
   const phone=normalizeIndianMobile(user.phone);if(!phone)return fail('Your account does not have a valid Indian mobile number.',400);
   if(!mobileOtpEnabled())return fail('Mobile verification is not configured yet.',503);
   if(await rateLimited(`mobile-check:${user.id}`,5,10*60*1000))return fail('Too many incorrect attempts. Please wait 10 minutes and request a new code.',429);
   const approved=await mutate(s=>{
    const hash=mobileOtpHash(user.id,phone,code);
    if(!s.tokens.some(x=>x.userId===user.id&&x.kind==='mobile'&&x.hash===hash&&x.expires>Date.now()))return false;
    const account=s.users.find(x=>x.id===user.id);if(!account)throw Error('Access denied');
    account.phoneVerified=true;account.phoneVerifiedAt=new Date().toISOString();
    s.tokens=s.tokens.filter(x=>!(x.userId===user.id&&x.kind==='mobile'));
    s.audit.unshift({id:randomUUID(),actor:user.email,action:'Mobile number verified',target:'Vendor account',remarks:'Verified by one-time SMS code',at:new Date().toISOString()});
    return true;
   });
   if(!approved)return fail('The verification code is incorrect or expired.',400);
   return NextResponse.json({ok:true,verified:true,message:'Mobile number verified successfully.'});
  }
  if(route==='profile') {
   if(user.role!=='vendor')return fail('Vendor access required',403);
   if(b.submit===true&&mobileOtpEnabled()&&!user.phoneVerified)return fail('Verify your mobile number before submitting your profile for review.',403);
   assertPlanAccess(user.subscription);const v=(b.submit===true?profileSchema:draftProfileSchema).parse(b);assertPortfolioLimit(user.subscription,v.gallery.length);
   if(normalizeIndianMobile(v.phone)!==normalizeIndianMobile(user.phone))return fail('The public phone number must match your account mobile number. Refresh the page and try again.',400);
   const coverage=[...new Set([v.city,...(v.locations??[])].filter(Boolean))];
   const owned=(value:string,kind?:string)=>{if(!value)return true;if(!value.startsWith('/api/media?'))return false;const key=new URL(value,'http://local').searchParams.get('key')||'';return validVendorKey(key)&&key.startsWith(`vendors/${user.id}/`)&&(!kind||key.includes(`/${kind}/`));};
   if(!owned(v.image,'logo')||v.gallery.some(x=>!owned(x,'portfolio'))||v.documents.some(x=>!owned(x,'document')))return fail('Invalid uploaded file reference',403);
   const result=await mutate(s=>{
    const account=s.users.find(x=>x.id===user.id);if(!account)throw Error('Access denied');assertPlanAccess(account.subscription);assertPortfolioLimit(account.subscription,v.gallery.length);
    if(normalizeIndianMobile(v.phone)!==normalizeIndianMobile(account.phone))throw Error('The public phone number must match your account mobile number. Refresh the page and try again.');
    const category=s.categories.find(x=>x.active&&x.name===v.category);if((v.category&&!category)||(v.service&&!category?.services?.includes(v.service))||!coverage.every(location=>s.locations.some(x=>x.active&&x.name===location)))throw Error('Choose an active category, specialisation, and location.');
    let vendor=s.vendors.find(x=>x.userId===user.id);if(vendor?.status==='suspended'||vendor?.status==='inactive')throw Error('Contact Occanova to reactivate your account.');
    const previous=vendor?new Set(vendorStorageKeys(vendor)):new Set<string>();
    const changed=!vendor||Object.entries(v).some(([key,value])=>JSON.stringify((vendor as Record<string,unknown>)[key])!==JSON.stringify(value));
    const newlySubmitted=b.submit===true&&(vendor?.status!=='pending'||changed);
    if(!vendor){vendor={id:randomUUID(),userId:user.id,slug:slugify(v.name||'vendor')+'-'+randomUUID().slice(0,6),status:'draft',published:false,featured:false,priority:100,featuredStart:'',featuredEnd:'',remarks:'',sample:false,...v,locations:coverage};s.vendors.push(vendor);}
    else Object.assign(vendor,v,{locations:coverage,status:'draft',published:false});
    let notification;
    if(b.submit===true){vendor.status='pending';vendor.remarks='';delete vendor.reviewedAt;if(newlySubmitted){vendor.submittedAt=new Date().toISOString();notification=notifyVendor(s,vendor,'submitted');s.audit.unshift({id:randomUUID(),actor:user.email,action:'Vendor profile submitted for review',target:vendor.name,remarks:'Waiting for an approval decision',at:vendor.submittedAt});}}
    const retained=new Set(vendorStorageKeys(vendor));return {vendor,obsolete:[...previous].filter(key=>!retained.has(key)),notification};
   });
   if(hasStorage()&&result.obsolete.length)try{await deleteUploads(result.obsolete);}catch(error){console.error('Upload cleanup failed; scheduled maintenance will retry.',error);}
   const emailStatus=result.notification?await deliverReviewNotification(result.notification.userId,result.notification.notice.id):undefined;
   return NextResponse.json({ok:true,vendor:result.vendor,emailStatus});
  }
  if(route==='password'){const v=z.object({current:z.string().max(128),password:z.string().min(10).max(128)}).parse(b);if(!checkPassword(v.current,user.passwordHash))return fail('Current password is incorrect.');await mutate(s=>{s.users.find(x=>x.id===user.id)!.passwordHash=hashPassword(v.password);s.sessions=s.sessions.filter(x=>x.userId!==user.id);});(await cookies()).delete('occanova_session');return NextResponse.json({ok:true});}
  if(route==='enquiry-status'){const v=z.object({id:z.string(),status:z.enum(['new','contacted','closed'])}).parse(b);await mutate(s=>{const e=s.enquiries.find(x=>x.id===v.id);if(!e)throw Error('Enquiry not found');if(user.role!=='admin'&&!s.vendors.some(x=>x.id===e.vendorId&&x.userId===user.id))throw Error('Access denied');e.status=v.status;});return NextResponse.json({ok:true});}
  if(user.role!=='admin')return fail('Admin access required',403);
  if(route==='admin/vendor-profile'){const v=adminVendorProfileSchema.parse(b);const coverage=[...new Set([v.city,...(v.locations??[])])];await mutate(s=>{const category=s.categories.find(x=>x.active&&x.name===v.category);if(!category||!category.services?.includes(v.service)||!coverage.every(location=>s.locations.some(x=>x.active&&x.name===location)))throw Error('Choose an active category, specialisation, and location.');const vendor=s.vendors.find(x=>x.id===v.id);if(!vendor)throw Error('Vendor not found');const account=s.users.find(x=>x.id===vendor.userId);if(account&&normalizeIndianMobile(v.phone)!==normalizeIndianMobile(account.phone))throw Error('A vendor account’s public phone must match its verified mobile number.');const {id,...profile}=v;void id;Object.assign(vendor,profile,{locations:coverage});s.audit.unshift({id:randomUUID(),actor:user.email,action:'Vendor profile updated by administrator',target:vendor.name,remarks:'Business details corrected in the admin studio',at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  if(route==='admin/vendor-lifecycle'){const v=vendorLifecycleSchema.parse(b);await mutate(s=>{const vendor=s.vendors.find(x=>x.id===v.id);if(!vendor)throw Error('Vendor not found');if(!vendor.userId)throw Error('This listing does not have a vendor account.');if(v.action==='deactivate'){vendor.status='inactive';vendor.published=false;vendor.featured=false;s.sessions=s.sessions.filter(x=>x.userId!==vendor.userId);s.tokens=s.tokens.filter(x=>x.userId!==vendor.userId);}else{vendor.status='draft';vendor.published=false;vendor.featured=false;}s.audit.unshift({id:randomUUID(),actor:user.email,action:v.action==='deactivate'?'Vendor account deactivated':'Vendor account reactivated to draft',target:vendor.name,remarks:v.remarks,at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  if(route==='admin/vendor') {
   const v=z.object({id:z.string(),status:z.enum(['draft','pending','approved','rejected','suspended','inactive']),published:z.boolean(),featured:z.boolean(),priority:z.coerce.number().int().min(0).max(10000),featuredStart:z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),featuredEnd:z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),remarks:z.string().trim().min(3).max(1000)}).parse(b);
   if(v.featuredStart&&v.featuredEnd&&v.featuredStart>v.featuredEnd)return fail('Featured end must follow start.');
   const notification=await mutate(s=>{
    const vendor=s.vendors.find(x=>x.id===v.id);if(!vendor)throw Error('Vendor not found');const account=s.users.find(x=>x.id===vendor.userId);
    if(v.status==='approved'&&vendor.userId&&mobileOtpEnabled()&&!account?.phoneVerified)throw Error('Mobile verification is required before approval.');
    if(v.status==='approved'&&account&&normalizeIndianMobile(vendor.phone)!==normalizeIndianMobile(account.phone))throw Error('The public phone number must match the vendor’s verified mobile number. Save the business information first.');
    if(v.status==='approved'&&vendor.userId){profileSchema.parse(vendor);assertPlanAccess(account?.subscription);assertPortfolioLimit(account?.subscription,vendor.gallery.length);}
    const before={status:vendor.status,published:vendor.published};
    Object.assign(vendor,v,{published:v.status==='approved'&&v.published,featured:v.status==='approved'&&v.featured});
    if(v.status==='approved'||v.status==='rejected')vendor.reviewedAt=new Date().toISOString();
    if((v.status==='inactive'||v.status==='suspended')&&vendor.userId){s.sessions=s.sessions.filter(x=>x.userId!==vendor.userId);s.tokens=s.tokens.filter(x=>x.userId!==vendor.userId);}
    s.audit.unshift({id:randomUUID(),actor:user.email,action:`Vendor set to ${v.status}; published ${vendor.published}; featured ${vendor.featured}`,target:vendor.name,remarks:v.remarks,at:new Date().toISOString()});
    const kind=reviewNotificationKind(before,vendor);return kind?notifyVendor(s,vendor,kind):undefined;
   });
   const emailStatus=notification?await deliverReviewNotification(notification.userId,notification.notice.id):undefined;
   return NextResponse.json({ok:true,message:notification?emailStatus==='sent'?'Decision saved. The vendor has a dashboard update and an email has been sent.':'Decision saved. The vendor has a dashboard update; email could not be sent.':'Decision saved and activity logged.',emailStatus});
  }
  if(route==='admin/vendor-notification'){
   const {id,notificationId}=z.object({id:z.string().min(1).max(100),notificationId:z.string().uuid()}).parse(b);
   if(await rateLimited(`review-email:${user.id}:${notificationId}`,2,60000))return fail('Please wait a moment before retrying the email.',429);
   const state=await readState();const vendor=state.vendors.find(row=>row.id===id);const owner=state.users.find(row=>row.id===vendor?.userId);
   if(!owner?.notifications?.some(row=>row.id===notificationId&&row.vendorId===id))return fail('Vendor update not found.',404);
   const emailStatus=await deliverReviewNotification(owner.id,notificationId);
   return NextResponse.json({ok:true,emailStatus,message:emailStatus==='sent'?'Email sent to the vendor’s registered address.':emailStatus==='unchanged'?'Email is already sent or currently being processed.':'Email could not be sent. The dashboard update remains available.'});
  }
  if(route==='admin/taxonomy'){const v=z.object({type:z.enum(['categories','locations']),name:z.string().trim().min(2).max(80),active:z.boolean(),firstService:z.string().trim().max(100).optional()}).parse(b);await mutate(s=>{const row=s[v.type].find(x=>x.slug===slugify(v.name));if(row)row.active=v.active;else {if(v.type==='categories'&&!v.firstService?.trim())throw Error('Add the first subcategory with a new category.');s[v.type].push({name:v.name,slug:slugify(v.name),active:v.active,...(v.type==='categories'?{services:[v.firstService!],phase:2 as const}:{})});}s.audit.unshift({id:randomUUID(),actor:user.email,action:`${v.type}: ${v.active?'activated':'deactivated'}`,target:v.name,remarks:'Taxonomy updated',at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  if(route==='admin/subcategory'){const v=z.object({category:z.string().min(2).max(80),name:z.string().trim().min(2).max(100)}).parse(b);await mutate(s=>{const category=s.categories.find(x=>x.slug===v.category);if(!category)throw Error('Choose an active category.');if(category.services?.some(name=>slugify(name)===slugify(v.name)))throw Error('This subcategory already exists.');category.services=[...(category.services??[]),v.name];s.audit.unshift({id:randomUUID(),actor:user.email,action:'Subcategory added',target:category.name,remarks:v.name,at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  return fail('Not found',404);
 }catch(e){
  if(e instanceof MobileOtpDeliveryError)return fail(e.message,503);
  if(e instanceof PlanAccessError)return fail(e.message,e.status);
  if(e instanceof z.ZodError)return fail(e.issues[0]?validationFeedback(e.issues[0]):'Check the form fields');
  if(e instanceof SyntaxError)return fail('Invalid JSON');
  if(e&&typeof e==='object'&&'code' in e&&e.code===11000)return fail('An account already uses this email or phone.',409);
  const safe=['Agree to recurring AutoPay','Registration is already in progress','An account already uses','This verification link','Email/mobile or password','Verify your email','This reset link','This vendor is unavailable','This listing does not have','Choose an active','Add the first subcategory','This subcategory already exists','Contact Occanova','Current password','Enquiry not found','Access denied','Administrator access','Use the separate administrator','Vendor not found','Featured end','Private file storage','Choose an allowed','Public registration','Public enquiries','Mobile verification','Your account does not have','Too many verification','Too many incorrect','The verification code','The verification message','The mobile verification service','Verify your mobile','Vendor plan authorization'];
  if(e instanceof Error&&safe.some(x=>e.message.startsWith(x)))return fail(e.message);
  console.error('API request failed',e);return fail('Request failed. Please try again.',500);
 }
}
