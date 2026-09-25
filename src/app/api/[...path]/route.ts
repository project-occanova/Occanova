import { NextRequest,NextResponse } from 'next/server';
import { randomInt,randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { mutate,readState } from '@/lib/store';
import { currentUser,hashPassword,checkPassword,token,digest,cookieOptions,portalAllowed } from '@/lib/auth';
import { registerSchema,enquirySchema,profileSchema,adminVendorProfileSchema,vendorLifecycleSchema } from '@/lib/validation';
import { slugify,publicVendors,publicVendorProfile } from '@/lib/directory';
import {backendReady,hasDatabase,hasEmail,hasMobileOtp,hasStorage,localPreview,mobileOtpEnabled,publicIntakeEnabled,readOnlyDeployment} from '@/lib/config';
import {rateLimited} from '@/lib/rate-limit';
import {sendEnquiryNotifications,sendResetEmail,sendVerificationEmail} from '@/lib/email';
import {cleanupOrphanedUploads,createDownload,deleteUploads,validVendorKey,vendorStorageKeys} from '@/lib/storage';
import {checkMobileOtp,normalizeIndianMobile,sendMobileOtp} from '@/lib/mobile-otp';
export const runtime='nodejs';
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function GET(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
 const route=(await params).path.join('/');
 if(route==='health')return NextResponse.json({ok:true,database:hasDatabase(),email:hasEmail(),mobileOtp:hasMobileOtp(),storage:hasStorage(),writable:backendReady()&&!readOnlyDeployment(),intake:publicIntakeEnabled()});
 if(route==='maintenance/storage'){
  if(!hasStorage())return NextResponse.json({ok:true,skipped:true,reason:'Private file storage is not configured.'});
  const secret=process.env.CRON_SECRET;if(!secret)return fail('Maintenance is not configured.',503);
  if(req.headers.get('authorization')!==`Bearer ${secret}`)return fail('Access denied',401);
  const state=await readState();const referenced=new Set(state.vendors.flatMap(vendorStorageKeys));
  return NextResponse.json({ok:true,...await cleanupOrphanedUploads(referenced,new Date(Date.now()-24*60*60*1000))});
 }
 const s=await readState();
 if(route==='media'){
  if(!hasStorage())return fail('Private file storage is not configured.',503);
  const key=req.nextUrl.searchParams.get('key')||'';if(!validVendorKey(key))return fail('Invalid file key',400);
  const [,ownerId,kind]=key.split('/');const user=await currentUser();const vendor=s.vendors.find(x=>x.userId===ownerId);const privileged=user&&(user.role==='admin'||user.id===ownerId);
  if(kind==='document'&&!privileged)return fail('Access denied',403);
  const path=`/api/media?key=${encodeURIComponent(key)}`;if(!privileged&&!(vendor?.status==='approved'&&vendor.published&&(vendor.image===path||vendor.gallery.includes(path))))return fail('File not found',404);
  const response=NextResponse.redirect(await createDownload(key),302);response.headers.set('Cache-Control','private, no-store');return response;
 }
 if(route==='vendors')return NextResponse.json(publicVendors(s.vendors,Object.fromEntries(req.nextUrl.searchParams)).map(publicVendorProfile));
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
  if(route==='auth/register') {
   const v=registerSchema.parse(b);const t=token();
   const id=await mutate(s=>{if(s.users.some(u=>u.email===v.email||normalizeIndianMobile(u.phone)===v.phone))throw Error('An account already uses this email or phone.');const id=randomUUID();s.users.push({id,email:v.email,phone:v.phone,passwordHash:hashPassword(v.password),role:'vendor',verified:false,phoneVerified:false});s.tokens.push({hash:digest(t),userId:id,kind:'verify',expires:Date.now()+86400000});return id;});
   let delivered=false;if(hasEmail()){try{await sendVerificationEmail(v.email,t);delivered=true;}catch{/* The account remains recoverable through resend once delivery returns. */}}
   const directVerification=localPreview()||!hasEmail();
   return NextResponse.json({ok:true,id,message:directVerification?'Account created. Use the secure verification link below to activate it.':delivered?'Account created. Check your email to verify your address.':'Account created, but email delivery was delayed. Request a new verification link.',verificationUrl:directVerification?`/verify?token=${t}`:undefined});
  }
  if(route==='auth/verify') { const value=z.string().length(64).parse(b.token);await mutate(s=>{const t=s.tokens.find(t=>t.hash===digest(value)&&t.kind==='verify'&&t.expires>Date.now());if(!t)throw Error('This verification link has expired or was already used.');s.users.find(u=>u.id===t.userId)!.verified=true;s.tokens=s.tokens.filter(x=>x!==t);});return NextResponse.json({ok:true}); }
  if(route==='auth/login') {
   const v=z.object({identity:z.string().trim().min(1).max(160),password:z.string().min(1).max(128),admin:z.boolean().optional().default(false)}).parse(b);const s=await readState();const mobile=normalizeIndianMobile(v.identity);const user=s.users.find(u=>u.email===v.identity.toLowerCase()||(mobile&&normalizeIndianMobile(u.phone)===mobile));
   if(!user||!checkPassword(v.password,user.passwordHash))return fail('Email/mobile or password is incorrect.',401);
   if(!portalAllowed(user.role,v.admin))return fail(v.admin?'Administrator access is required.':'Use the separate administrator sign-in page.',403);
   if(!user.verified)return fail('Verify your email before signing in.',403);
   const vendor=user.role==='vendor'?s.vendors.find(x=>x.userId===user.id):undefined;
   if(vendor?.status==='inactive'||vendor?.status==='suspended')return fail('This vendor account is inactive. Contact Occanova support.',403);
   const t=token();await mutate(s=>{s.sessions=s.sessions.filter(x=>x.expires>Date.now());s.sessions.push({hash:digest(t),userId:user.id,expires:Date.now()+7*86400000});});(await cookies()).set('occanova_session',t,cookieOptions);return NextResponse.json({ok:true,redirect:user.role==='admin'?'/admin':'/dashboard'});
  }
  if(route==='auth/logout'){const value=(await cookies()).get('occanova_session')?.value;await mutate(s=>{s.sessions=s.sessions.filter(x=>x.hash!==digest(value??''));});(await cookies()).delete('occanova_session');return NextResponse.json({ok:true});}
  if(route==='auth/forgot') {if(!hasEmail()&&!localPreview())return fail('Password reset email is not available yet. Please contact Occanova support.',503);const email=z.string().email().transform(x=>x.toLowerCase()).parse(b.email);const t=token();let found=false;await mutate(s=>{const user=s.users.find(u=>u.email===email);if(user){found=true;s.tokens=s.tokens.filter(x=>!(x.userId===user.id&&x.kind==='reset'));s.tokens.push({hash:digest(t),userId:user.id,kind:'reset',expires:Date.now()+1800000});}});if(found)await sendResetEmail(email,t);return NextResponse.json({ok:true,message:'If an account exists, a password reset link has been sent.',verificationUrl:found&&localPreview()?`/reset-password?token=${t}`:undefined});}
  if(route==='auth/resend') {if(!hasEmail()&&!localPreview())return fail('Verification email is not available yet. Register again with a different email or contact Occanova support.',503);const email=z.string().email().transform(x=>x.toLowerCase()).parse(b.email);const t=token();let found=false;await mutate(s=>{const user=s.users.find(u=>u.email===email&&!u.verified);if(user){found=true;s.tokens=s.tokens.filter(x=>!(x.userId===user.id&&x.kind==='verify'));s.tokens.push({hash:digest(t),userId:user.id,kind:'verify',expires:Date.now()+86400000});}});if(found)await sendVerificationEmail(email,t);return NextResponse.json({ok:true,message:'If an unverified account exists, a new verification link has been sent.',verificationUrl:found&&localPreview()?`/verify?token=${t}`:undefined});}
  if(route==='auth/reset'){const v=z.object({token:z.string().length(64),password:z.string().min(10).max(128)}).parse(b);await mutate(s=>{const t=s.tokens.find(x=>x.hash===digest(v.token)&&x.kind==='reset'&&x.expires>Date.now());if(!t)throw Error('This reset link is invalid or expired.');s.users.find(u=>u.id===t.userId)!.passwordHash=hashPassword(v.password);s.sessions=s.sessions.filter(x=>x.userId!==t.userId);s.tokens=s.tokens.filter(x=>x!==t);});return NextResponse.json({ok:true});}
  if(route==='enquiries') {const v=enquirySchema.parse(b);const saved=await mutate(s=>{const vendor=publicVendors(s.vendors).find(x=>x.id===v.vendorId&&!x.sample);if(!vendor)throw Error('This vendor is unavailable.');const {website,...data}=v;void website;const enquiry={...data,id:randomUUID(),status:'new' as const,createdAt:new Date().toISOString()};s.enquiries.push(enquiry);return {enquiry,vendor};});let delivered=true;try{await sendEnquiryNotifications(saved.enquiry,saved.vendor);}catch{delivered=false;}return NextResponse.json({ok:true,id:saved.enquiry.id,message:localPreview()?'Enquiry saved in this local preview. No notification was sent.':delivered?'Your enquiry has been sent to the vendor.':'Your enquiry was saved. The email notification is delayed.'});}
  const user=await currentUser();if(!user)return fail('Please sign in.',401);
  if(route==='auth/mobile/send'){
   if(user.role!=='vendor')return fail('Vendor access required',403);
   if(user.phoneVerified)return NextResponse.json({ok:true,verified:true,message:'Your mobile number is already verified.'});
   if(await rateLimited(`mobile-send:${user.id}`,3,10*60*1000))return fail('Too many verification requests. Please wait 10 minutes and try again.',429);
   const phone=normalizeIndianMobile(user.phone);if(!phone)return fail('Your account does not have a valid Indian mobile number.',400);
   if(hasMobileOtp())await sendMobileOtp(phone);
   else if(localPreview()){
    const code=String(randomInt(100000,1000000));
    await mutate(s=>{s.tokens=s.tokens.filter(x=>!(x.userId===user.id&&x.kind==='mobile'));s.tokens.push({hash:digest(`${user.id}:${code}`),userId:user.id,kind:'mobile',expires:Date.now()+10*60*1000});});
    return NextResponse.json({ok:true,message:'A verification code was created for this local preview.',previewCode:code});
   }else return fail('Mobile verification is not configured yet.',503);
   return NextResponse.json({ok:true,message:'A six-digit verification code was sent by SMS.'});
  }
  if(route==='auth/mobile/verify'){
   if(user.role!=='vendor')return fail('Vendor access required',403);
   if(user.phoneVerified)return NextResponse.json({ok:true,verified:true,message:'Your mobile number is already verified.'});
   if(await rateLimited(`mobile-check:${user.id}`,5,10*60*1000))return fail('Too many incorrect attempts. Please wait 10 minutes and request a new code.',429);
   const code=z.string().regex(/^\d{6}$/,'Enter the six-digit verification code.').parse(b.code);
   const phone=normalizeIndianMobile(user.phone);if(!phone)return fail('Your account does not have a valid Indian mobile number.',400);
   let approved=false;
   if(hasMobileOtp())approved=await checkMobileOtp(phone,code);
   else if(localPreview()){
    const state=await readState();approved=state.tokens.some(x=>x.userId===user.id&&x.kind==='mobile'&&x.hash===digest(`${user.id}:${code}`)&&x.expires>Date.now());
   }else return fail('Mobile verification is not configured yet.',503);
   if(!approved)return fail('The verification code is incorrect or expired.',400);
   await mutate(s=>{const account=s.users.find(x=>x.id===user.id);if(!account)throw Error('Access denied');account.phoneVerified=true;account.phoneVerifiedAt=new Date().toISOString();s.tokens=s.tokens.filter(x=>!(x.userId===user.id&&x.kind==='mobile'));s.audit.unshift({id:randomUUID(),actor:user.email,action:'Mobile number verified',target:'Vendor account',remarks:'Verified by one-time SMS code',at:new Date().toISOString()});});
   return NextResponse.json({ok:true,verified:true,message:'Mobile number verified successfully.'});
  }
  if(route==='profile') {if(user.role!=='vendor')return fail('Vendor access required',403);if(b.submit===true&&mobileOtpEnabled()&&!user.phoneVerified)return fail('Verify your mobile number before submitting your profile for review.',403);const v=profileSchema.parse(b);const coverage=[...new Set([v.city,...(v.locations??[])])];const owned=(value:string,kind?:string)=>{if(!value)return true;if(!value.startsWith('/api/media?'))return false;const key=new URL(value,'http://local').searchParams.get('key')||'';return validVendorKey(key)&&key.startsWith(`vendors/${user.id}/`)&&(!kind||key.includes(`/${kind}/`));};if(!owned(v.image,'logo')||v.gallery.some(x=>!owned(x,'portfolio'))||v.documents.some(x=>!owned(x,'document')))return fail('Invalid uploaded file reference',403);const result=await mutate(s=>{const category=s.categories.find(x=>x.active&&x.name===v.category);if(!category||!category.services?.includes(v.service)||!coverage.every(location=>s.locations.some(x=>x.active&&x.name===location)))throw Error('Choose an active category, specialisation, and location.');let vendor=s.vendors.find(x=>x.userId===user.id);if(vendor?.status==='suspended'||vendor?.status==='inactive')throw Error('Contact Occanova to reactivate your account.');const previous=vendor?new Set(vendorStorageKeys(vendor)):new Set<string>();if(!vendor){vendor={id:randomUUID(),userId:user.id,slug:slugify(v.name)+'-'+randomUUID().slice(0,6),status:'draft',published:false,featured:false,priority:100,featuredStart:'',featuredEnd:'',remarks:'',sample:false,...v,locations:coverage};s.vendors.push(vendor);}else{Object.assign(vendor,v,{locations:coverage,status:'draft',published:false});}if(b.submit===true)vendor.status='pending';const retained=new Set(vendorStorageKeys(vendor));return {vendor,obsolete:[...previous].filter(key=>!retained.has(key))};});if(hasStorage()&&result.obsolete.length)try{await deleteUploads(result.obsolete);}catch(error){console.error('Upload cleanup failed; scheduled maintenance will retry.',error);}return NextResponse.json({ok:true,vendor:result.vendor});}
  if(route==='password'){const v=z.object({current:z.string().max(128),password:z.string().min(10).max(128)}).parse(b);if(!checkPassword(v.current,user.passwordHash))return fail('Current password is incorrect.');await mutate(s=>{s.users.find(x=>x.id===user.id)!.passwordHash=hashPassword(v.password);s.sessions=s.sessions.filter(x=>x.userId!==user.id);});(await cookies()).delete('occanova_session');return NextResponse.json({ok:true});}
  if(route==='enquiry-status'){const v=z.object({id:z.string(),status:z.enum(['new','contacted','closed'])}).parse(b);await mutate(s=>{const e=s.enquiries.find(x=>x.id===v.id);if(!e)throw Error('Enquiry not found');if(user.role!=='admin'&&!s.vendors.some(x=>x.id===e.vendorId&&x.userId===user.id))throw Error('Access denied');e.status=v.status;});return NextResponse.json({ok:true});}
  if(user.role!=='admin')return fail('Admin access required',403);
  if(route==='admin/vendor-profile'){const v=adminVendorProfileSchema.parse(b);const coverage=[...new Set([v.city,...(v.locations??[])])];await mutate(s=>{const category=s.categories.find(x=>x.active&&x.name===v.category);if(!category||!category.services?.includes(v.service)||!coverage.every(location=>s.locations.some(x=>x.active&&x.name===location)))throw Error('Choose an active category, specialisation, and location.');const vendor=s.vendors.find(x=>x.id===v.id);if(!vendor)throw Error('Vendor not found');const {id,...profile}=v;void id;Object.assign(vendor,profile,{locations:coverage});s.audit.unshift({id:randomUUID(),actor:user.email,action:'Vendor profile updated by administrator',target:vendor.name,remarks:'Business details corrected in the admin studio',at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  if(route==='admin/vendor-lifecycle'){const v=vendorLifecycleSchema.parse(b);await mutate(s=>{const vendor=s.vendors.find(x=>x.id===v.id);if(!vendor)throw Error('Vendor not found');if(!vendor.userId)throw Error('This listing does not have a vendor account.');if(v.action==='deactivate'){vendor.status='inactive';vendor.published=false;vendor.featured=false;s.sessions=s.sessions.filter(x=>x.userId!==vendor.userId);s.tokens=s.tokens.filter(x=>x.userId!==vendor.userId);}else{vendor.status='draft';vendor.published=false;vendor.featured=false;}s.audit.unshift({id:randomUUID(),actor:user.email,action:v.action==='deactivate'?'Vendor account deactivated':'Vendor account reactivated to draft',target:vendor.name,remarks:v.remarks,at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  if(route==='admin/vendor') {const v=z.object({id:z.string(),status:z.enum(['draft','pending','approved','rejected','suspended','inactive']),published:z.boolean(),featured:z.boolean(),priority:z.coerce.number().int().min(0).max(10000),featuredStart:z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),featuredEnd:z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),remarks:z.string().trim().min(3).max(1000)}).parse(b);if(v.featuredStart&&v.featuredEnd&&v.featuredStart>v.featuredEnd)return fail('Featured end must follow start.');await mutate(s=>{const vendor=s.vendors.find(x=>x.id===v.id);if(!vendor)throw Error('Vendor not found');const account=s.users.find(x=>x.id===vendor.userId);if(v.status==='approved'&&vendor.userId&&mobileOtpEnabled()&&!account?.phoneVerified)throw Error('Mobile verification is required before approval.');Object.assign(vendor,v,{published:v.status==='approved'&&v.published,featured:v.status==='approved'&&v.featured});if((v.status==='inactive'||v.status==='suspended')&&vendor.userId){s.sessions=s.sessions.filter(x=>x.userId!==vendor.userId);s.tokens=s.tokens.filter(x=>x.userId!==vendor.userId);}s.audit.unshift({id:randomUUID(),actor:user.email,action:`Vendor set to ${v.status}; published ${vendor.published}; featured ${vendor.featured}`,target:vendor.name,remarks:v.remarks,at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  if(route==='admin/taxonomy'){const v=z.object({type:z.enum(['categories','locations']),name:z.string().trim().min(2).max(80),active:z.boolean()}).parse(b);await mutate(s=>{const row=s[v.type].find(x=>x.slug===slugify(v.name));if(row)row.active=v.active;else s[v.type].push({name:v.name,slug:slugify(v.name),active:v.active,...(v.type==='categories'?{services:[v.name],phase:2 as const}:{})});s.audit.unshift({id:randomUUID(),actor:user.email,action:`${v.type}: ${v.active?'activated':'deactivated'}`,target:v.name,remarks:'Taxonomy updated',at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  return fail('Not found',404);
 }catch(e){
  if(e instanceof z.ZodError)return fail(e.issues[0]?.message??'Check the form fields');
  if(e instanceof SyntaxError)return fail('Invalid JSON');
  if(e&&typeof e==='object'&&'code' in e&&e.code===11000)return fail('An account already uses this email or phone.',409);
  const safe=['An account already uses','This verification link','Email/mobile or password','Verify your email','This reset link','This vendor is unavailable','This listing does not have','Choose an active','Contact Occanova','Current password','Enquiry not found','Access denied','Administrator access','Use the separate administrator','Vendor not found','Featured end','Private file storage','Choose an allowed','Public registration','Public enquiries','Mobile verification','Your account does not have','Too many verification','Too many incorrect','The verification code','The verification message','The mobile verification service','Verify your mobile'];
  if(e instanceof Error&&safe.some(x=>e.message.startsWith(x)))return fail(e.message);
  console.error('API request failed',e);return fail('Request failed. Please try again.',500);
 }
}
