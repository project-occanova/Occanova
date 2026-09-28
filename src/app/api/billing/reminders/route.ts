import {NextRequest,NextResponse} from 'next/server';
import {readState,mutate} from '@/lib/store';
import {sendFirstChargeReminder} from '@/lib/email';
import {billingEnabled} from '@/lib/subscriptions';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Access denied'},{status:401});
 if(!billingEnabled()||!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return NextResponse.json({ok:true,skipped:true});
 const now=Date.now(),until=now+7*86400000;
 const state=await readState();
 let sent=0,failed=0;
 for(const user of state.users){
  const sub=user.subscription;
  const due=sub?.trialEndsAt?Date.parse(sub.trialEndsAt):0;
  if(!sub?.gatewayId||sub.status!=='authenticated'||sub.reminderSentAt||!(due>now&&due<=until))continue;
  const claimed=await mutate(current=>{const record=current.users.find(item=>item.id===user.id)?.subscription;if(!record||record.status!=='authenticated'||record.reminderSentAt||!record.trialEndsAt||Date.parse(record.trialEndsAt)<=Date.now()||record.reminderClaimedAt&&Date.now()-Date.parse(record.reminderClaimedAt)<60*60*1000)return false;record.reminderClaimedAt=new Date().toISOString();return true;});
  if(!claimed)continue;
   try{await sendFirstChargeReminder(user.email,sub.plan,sub.trialEndsAt!);await mutate(current=>{const record=current.users.find(item=>item.id===user.id)?.subscription;if(record&&record.gatewayId===sub.gatewayId){record.reminderSentAt=new Date().toISOString();record.reminderClaimedAt=undefined;}});sent++;}
   catch(error){failed++;console.error('First-charge reminder failed',user.id,error);await mutate(current=>{const record=current.users.find(item=>item.id===user.id)?.subscription;if(record&&record.gatewayId===sub.gatewayId)record.reminderClaimedAt=undefined;});}
 }
 return NextResponse.json({ok:true,sent,failed});
}
