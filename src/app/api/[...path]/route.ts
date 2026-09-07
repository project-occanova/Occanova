import { NextRequest,NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { mutate,readState } from '@/lib/store';
import { currentUser,hashPassword,checkPassword,token,digest,cookieOptions } from '@/lib/auth';
import { registerSchema,enquirySchema,profileSchema } from '@/lib/validation';
import { slugify,publicVendors } from '@/lib/directory';
import type { Vendor } from '@/lib/types';
export const runtime='nodejs';
const globals=globalThis as typeof globalThis & {occanovaLimits?:Map<string,{n:number;until:number}>};
const limits=globals.occanovaLimits??=new Map();
function limited(key:string,max=30){const now=Date.now();for(const [k,v] of limits)if(v.until<now)limits.delete(k);const row=limits.get(key)??{n:0,until:now+60000};row.n++;limits.set(key,row);return row.n>max;}
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function GET(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
 const route=(await params).path.join('/');const s=await readState();
 if(route==='vendors')return NextResponse.json(publicVendors(s.vendors,Object.fromEntries(req.nextUrl.searchParams)).map(({userId,remarks,owner,...publicProfile})=>publicProfile));
 return fail('Not found',404);
}
export async function POST(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
 try {
  const route=(await params).path.join('/');
  const origin=req.headers.get('origin');
  const expectedOrigin=process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.headers.get('host')}`;
  if(!origin || origin!==new URL(expectedOrigin).origin)return fail('Invalid request origin',403);
  if(Number(req.headers.get('content-length')||0)>16000)return fail('Request too large',413);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]??'local';
  if(limited(ip+route,route.startsWith('auth/')?10:30))return fail('Too many requests. Please try again in a minute.',429);
  const raw=await req.text();if(raw.length>16000)return fail('Request too large',413);
  const b=JSON.parse(raw||'{}');
  if(route==='auth/register') {
   const v=registerSchema.parse(b);const t=token();
   const id=await mutate(s=>{if(s.users.some(u=>u.email===v.email||u.phone===v.phone))throw Error('An account already uses this email or phone.');const id=randomUUID();s.users.push({id,email:v.email,phone:v.phone,passwordHash:hashPassword(v.password),role:'vendor',verified:false});s.tokens.push({hash:digest(t),userId:id,kind:'verify',expires:Date.now()+86400000});return id;});
   return NextResponse.json({ok:true,id,message:'Account created. Email delivery is not configured in this local preview.',previewUrl:process.env.LOCAL_PREVIEW==='true'?`/verify?token=${t}`:undefined});
  }
  if(route==='auth/verify') { const value=z.string().length(64).parse(b.token);await mutate(s=>{const t=s.tokens.find(t=>t.hash===digest(value)&&t.kind==='verify'&&t.expires>Date.now());if(!t)throw Error('This verification link has expired or was already used.');s.users.find(u=>u.id===t.userId)!.verified=true;s.tokens=s.tokens.filter(x=>x!==t);});return NextResponse.json({ok:true}); }
  if(route==='auth/login') {
   const v=z.object({identity:z.string().min(1).max(160),password:z.string().min(1).max(128)}).parse(b);const s=await readState();const user=s.users.find(u=>u.email===v.identity.toLowerCase()||u.phone===v.identity);
   if(!user||!checkPassword(v.password,user.passwordHash))return fail('Email/mobile or password is incorrect.',401);
   if(!user.verified)return fail('Verify your email before signing in.',403);
   const t=token();await mutate(s=>{s.sessions=s.sessions.filter(x=>x.expires>Date.now());s.sessions.push({hash:digest(t),userId:user.id,expires:Date.now()+7*86400000});});(await cookies()).set('occanova_session',t,cookieOptions);return NextResponse.json({ok:true,redirect:user.role==='admin'?'/admin':'/dashboard'});
  }
  if(route==='auth/logout'){const value=(await cookies()).get('occanova_session')?.value;await mutate(s=>{s.sessions=s.sessions.filter(x=>x.hash!==digest(value??''));});(await cookies()).delete('occanova_session');return NextResponse.json({ok:true});}
  if(route==='auth/forgot') {const email=z.string().email().transform(x=>x.toLowerCase()).parse(b.email);const t=token();let found=false;await mutate(s=>{const user=s.users.find(u=>u.email===email);if(user){found=true;s.tokens=s.tokens.filter(x=>!(x.userId===user.id&&x.kind==='reset'));s.tokens.push({hash:digest(t),userId:user.id,kind:'reset',expires:Date.now()+1800000});}});return NextResponse.json({ok:true,message:'If an account exists, a reset link will be sent when email delivery is configured.',previewUrl:found&&process.env.LOCAL_PREVIEW==='true'?`/reset-password?token=${t}`:undefined});}
  if(route==='auth/reset'){const v=z.object({token:z.string().length(64),password:z.string().min(10).max(128)}).parse(b);await mutate(s=>{const t=s.tokens.find(x=>x.hash===digest(v.token)&&x.kind==='reset'&&x.expires>Date.now());if(!t)throw Error('This reset link is invalid or expired.');s.users.find(u=>u.id===t.userId)!.passwordHash=hashPassword(v.password);s.sessions=s.sessions.filter(x=>x.userId!==t.userId);s.tokens=s.tokens.filter(x=>x!==t);});return NextResponse.json({ok:true});}
  if(route==='enquiries') {const v=enquirySchema.parse(b);const id=await mutate(s=>{const vendor=publicVendors(s.vendors).find(x=>x.id===v.vendorId);if(!vendor)throw Error('This vendor is unavailable.');const id=randomUUID();const {website,...data}=v;s.enquiries.push({...data,id,status:'new',createdAt:new Date().toISOString()});return id;});return NextResponse.json({ok:true,id,message:'Enquiry saved in this local preview. No notification was sent.'});}
  const user=await currentUser();if(!user)return fail('Please sign in.',401);
  if(route==='profile') {if(user.role!=='vendor')return fail('Vendor access required',403);const v=profileSchema.parse(b);const result=await mutate(s=>{if(!s.categories.some(x=>x.active&&x.name===v.category)||!s.locations.some(x=>x.active&&x.name===v.city))throw Error('Choose an active service and location.');let vendor=s.vendors.find(x=>x.userId===user.id);if(vendor?.status==='suspended'||vendor?.status==='inactive')throw Error('Contact Occanova to reactivate your account.');if(!vendor){vendor={id:randomUUID(),userId:user.id,slug:slugify(v.name)+'-'+randomUUID().slice(0,6),image:'',gallery:[],status:'draft',published:false,featured:false,priority:100,featuredStart:'',featuredEnd:'',remarks:'',sample:false,...v,locations:[v.city]};s.vendors.push(vendor);}else{Object.assign(vendor,v,{locations:[v.city],status:'draft',published:false});}if(b.submit===true)vendor.status='pending';return vendor;});return NextResponse.json({ok:true,vendor:result});}
  if(route==='password'){const v=z.object({current:z.string().max(128),password:z.string().min(10).max(128)}).parse(b);if(!checkPassword(v.current,user.passwordHash))return fail('Current password is incorrect.');await mutate(s=>{s.users.find(x=>x.id===user.id)!.passwordHash=hashPassword(v.password);s.sessions=s.sessions.filter(x=>x.userId!==user.id);});(await cookies()).delete('occanova_session');return NextResponse.json({ok:true});}
  if(route==='enquiry-status'){const v=z.object({id:z.string(),status:z.enum(['new','contacted','closed'])}).parse(b);await mutate(s=>{const e=s.enquiries.find(x=>x.id===v.id);if(!e)throw Error('Enquiry not found');if(user.role!=='admin'&&!s.vendors.some(x=>x.id===e.vendorId&&x.userId===user.id))throw Error('Access denied');e.status=v.status;});return NextResponse.json({ok:true});}
  if(user.role!=='admin')return fail('Admin access required',403);
  if(route==='admin/vendor') {const v=z.object({id:z.string(),status:z.enum(['draft','pending','approved','rejected','suspended','inactive']),published:z.boolean(),featured:z.boolean(),priority:z.coerce.number().int().min(0).max(10000),featuredStart:z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),featuredEnd:z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),remarks:z.string().trim().min(3).max(1000)}).parse(b);if(v.featuredStart&&v.featuredEnd&&v.featuredStart>v.featuredEnd)return fail('Featured end must follow start.');await mutate(s=>{const vendor=s.vendors.find(x=>x.id===v.id);if(!vendor)throw Error('Vendor not found');Object.assign(vendor,v,{published:v.status==='approved'&&v.published,featured:v.status==='approved'&&v.featured});s.audit.unshift({id:randomUUID(),actor:user.email,action:`Vendor set to ${v.status}; published ${vendor.published}; featured ${vendor.featured}`,target:vendor.name,remarks:v.remarks,at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  if(route==='admin/taxonomy'){const v=z.object({type:z.enum(['categories','locations']),name:z.string().trim().min(2).max(80),active:z.boolean()}).parse(b);await mutate(s=>{const row=s[v.type].find(x=>x.slug===slugify(v.name));if(row)row.active=v.active;else s[v.type].push({name:v.name,slug:slugify(v.name),active:v.active});s.audit.unshift({id:randomUUID(),actor:user.email,action:`${v.type}: ${v.active?'activated':'deactivated'}`,target:v.name,remarks:'Taxonomy updated',at:new Date().toISOString()});});return NextResponse.json({ok:true});}
  return fail('Not found',404);
 }catch(e){if(e instanceof z.ZodError)return fail(e.issues[0]?.message??'Check the form fields');if(e instanceof SyntaxError)return fail('Invalid JSON');return fail(e instanceof Error?e.message:'Request failed');}
}
