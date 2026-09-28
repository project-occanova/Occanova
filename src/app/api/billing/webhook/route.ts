import {NextRequest,NextResponse} from 'next/server';
import {mutate,readState} from '@/lib/store';
import {activateRegistration} from '@/lib/registration';
import {billingConfigured,knownStatus,razorpay,validSignature,type RazorpaySubscription} from '@/lib/subscriptions';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
 // Provider delivery must stay available while new subscription signups are paused.
 if(!secret||!billingConfigured())return NextResponse.json({error:'Webhook is not configured.'},{status:503});
 const raw=await req.text();
 if(raw.length>100000)return NextResponse.json({error:'Request too large'},{status:413});
 if(!validSignature(raw,req.headers.get('x-razorpay-signature')||'',secret))return NextResponse.json({error:'Invalid signature'},{status:401});
 let event:{event?:string;payload?:{subscription?:{entity?:{id?:string}}}};
 try{event=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid payload'},{status:400});}
 if(!event.event?.startsWith('subscription.'))return NextResponse.json({ok:true,ignored:true});
 const id=event.payload?.subscription?.entity?.id;
 if(!id||!/^sub_[A-Za-z0-9]+$/.test(id))return NextResponse.json({error:'Missing subscription'},{status:400});
 const state=await readState();
 const owner=state.users.find(user=>user.subscription?.gatewayId===id);
 const pending=state.registrations.find(row=>row.subscription?.gatewayId===id);
 if(!owner&&!pending)return NextResponse.json({ok:true,ignored:true});
 try{
  const remote=await razorpay<RazorpaySubscription>('GET',`subscriptions/${id}`);
  if(remote.plan_id!==(owner?.subscription||pending?.subscription)?.gatewayPlanId||!knownStatus(remote.status))return NextResponse.json({error:'Subscription mismatch'},{status:409});
  await mutate(current=>{
   if(!owner&&pending){
    if(['authenticated','active'].includes(remote.status)){activateRegistration(current,pending.id,remote);return;}
    const row=current.registrations.find(item=>item.id===pending.id);if(row?.subscription&&row.subscription.gatewayId===id)row.subscription.status=remote.status as typeof row.subscription.status;
    return;
   }
   const account=current.users.find(user=>user.id===owner?.id);
   if(!account?.subscription||account.subscription.gatewayId!==id)return;
   account.subscription.status=remote.status as typeof account.subscription.status;account.subscription.paidCount=remote.paid_count;account.subscription.updatedAt=new Date().toISOString();
   if(['authenticated','active','pending','halted'].includes(remote.status))account.subscription.trialUsedAt??=new Date().toISOString();
  });
  return NextResponse.json({ok:true});
 }catch(error){console.error('Subscription webhook failed',error);return NextResponse.json({error:'Webhook processing failed'},{status:502});}
}
