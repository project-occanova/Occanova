import {NextRequest,NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {readOnlyDeployment} from '@/lib/config';
import {rateLimited} from '@/lib/rate-limit';
import {recentVendorUploads,storeUpload,vendorStorageKeys,type UploadKind} from '@/lib/storage';
import {readState} from '@/lib/store';
import {assertPlanAccess,portfolioLimit,PlanAccessError} from '@/lib/plan-access';

export const runtime='nodejs';
const SERVER_UPLOAD_MAX=4_000_000;
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
const uploadKinds=new Set<UploadKind>(['logo','portfolio','document']);

export async function GET(){
  try{
    const user=await currentUser();
    if(!user)return fail('Please sign in.',401);
    if(user.role!=='vendor')return fail('Vendor access required',403);
    const [uploads,state]=await Promise.all([recentVendorUploads(user.id),readState()]);
    const saved=new Set(state.vendors.filter(vendor=>vendor.userId===user.id).flatMap(vendorStorageKeys));
    return NextResponse.json({uploads:uploads.filter(upload=>!saved.has(upload.key)).map(({key,...upload})=>upload)},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    console.error('Recent uploads lookup failed',error);
    return fail('Recent uploads are temporarily unavailable. Please try again.',500);
  }
}

export async function POST(req:NextRequest){
  try{
    if(readOnlyDeployment())return fail('This public preview is read-only until production services are connected.',503);
    const origin=req.headers.get('origin');
    const expectedOrigin=process.env.NEXT_PUBLIC_SITE_URL||`${req.nextUrl.protocol}//${req.headers.get('host')}`;
    if(!origin||origin!==new URL(expectedOrigin).origin)return fail('Invalid request origin',403);
    if(Number(req.headers.get('content-length')||0)>4_250_000)return fail('This protected upload path supports files up to 4 MB.',413);

    const user=await currentUser();
    if(!user)return fail('Please sign in.',401);
    if(user.role!=='vendor')return fail('Vendor access required',403);
    assertPlanAccess(user.subscription);
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]??'local';
    if(await rateLimited(`${ip}:upload:${user.id}`,12))return fail('Too many uploads. Please try again in a minute.',429);

    const data=await req.formData();
    const kind=data.get('kind');
    const file=data.get('file');
    if(typeof kind!=='string'||!uploadKinds.has(kind as UploadKind))return fail('Choose a valid upload type.');
    if(kind==='portfolio'){
      const saved=(await readState()).vendors.find(vendor=>vendor.userId===user.id)?.gallery.length??0;
      const limit=portfolioLimit(user.subscription);
      if(saved>=limit)return fail(`Your plan allows up to ${limit} portfolio photos. Save any photo removals before uploading more.`,400);
    }
    if(!(file instanceof File)||file.size<1)return fail('Choose a file to upload.');
    if(file.size>SERVER_UPLOAD_MAX)return fail('This protected upload path supports files up to 4 MB.',413);
    const result=await storeUpload(user.id,kind as UploadKind,file.type,file.size,new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ok:true,...result});
  }catch(error){
    if(error instanceof PlanAccessError)return fail(error.message,error.status);
    const safe=['Private file storage','Choose an allowed'];
    if(error instanceof Error&&safe.some(message=>error.message.startsWith(message)))return fail(error.message);
    console.error('Protected upload failed',error);
    return fail('The file upload failed. Please try again.',500);
  }
}
