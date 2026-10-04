import {NextRequest,NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {readState} from '@/lib/store';
import {lookupVerificationDelivery} from '@/lib/verification-delivery';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private, no-store'};
export async function GET(req:NextRequest){
 const admin=await currentUser();
 if(!admin)return NextResponse.json({error:'Please sign in.'},{status:401,headers:noStore});
 if(admin.role!=='admin')return NextResponse.json({error:'Administrator access is required.'},{status:403,headers:noStore});
 const id=req.nextUrl.searchParams.get('registrationId')||'';
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return NextResponse.json({error:'Choose a valid registration.'},{status:400,headers:noStore});
 const state=await readState();
 const registration=state.registrations.find(row=>row.id===id&&!row.completedUserId);
 if(!registration)return NextResponse.json({error:'Registration not found.'},{status:404,headers:noStore});
 const delivery=registration.verificationEmail;
 if(!delivery)return NextResponse.json({state:'unknown',message:'No verification email send attempt has been recorded yet.'},{headers:noStore});
 if(delivery.status==='failed')return NextResponse.json({state:'failed',message:delivery.failureSource==='provider'?`Resend rejected this send${delivery.httpStatus?` (HTTP ${delivery.httpStatus})`:''}. Check the domain/API key and Resend API logs.`:delivery.failureSource==='transport'?'The website could not reach Resend before the request timed out. Retry after the rate limit clears.':delivery.failureSource==='configuration'?'Website email configuration is missing. Check production environment variables.':'The website could not confirm the latest send. Retry after the rate limit clears.'},{headers:noStore});
 if(!delivery.providerId)return NextResponse.json({state:'unknown',message:'Resend accepted this request, but no provider reference was recorded. Check the Resend dashboard.'},{headers:noStore});
 if(!process.env.RESEND_API_KEY)return NextResponse.json({error:'Resend delivery lookup is not configured.'},{status:503,headers:noStore});
 try{return NextResponse.json(await lookupVerificationDelivery(delivery.providerId,registration.email,process.env.RESEND_API_KEY),{headers:noStore});}
 catch(error){console.error('Verification delivery lookup failed:',(error as Error).message);return NextResponse.json({error:'Could not check Resend delivery right now. Use the saved provider reference in Resend.'},{status:502,headers:noStore});}
}
