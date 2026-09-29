import {hasEmail} from './config';
import {sendVendorUpdateEmail} from './email';
import {mutate} from './store';

export async function deliverReviewNotification(userId:string,id:string){
 const claimed=await mutate(state=>{
  const owner=state.users.find(user=>user.id===userId);
  const notice=owner?.notifications?.find(row=>row.id===id);
  if(!owner||!notice||notice.emailStatus==='sent')return;
  if(notice.emailClaimedAt&&Date.parse(notice.emailClaimedAt)>Date.now()-60000)return;
  notice.emailClaimedAt=new Date().toISOString();
  return {email:owner.email,notice:structuredClone(notice)};
 });
 if(!claimed)return 'unchanged';
 let status:'sent'|'failed'|'skipped'=hasEmail()?'sent':'skipped';
 if(status==='sent')try{await sendVendorUpdateEmail(claimed.email,claimed.notice);}catch{status='failed';}
 await mutate(state=>{const notice=state.users.find(user=>user.id===userId)?.notifications?.find(row=>row.id===id);if(notice&&notice.emailClaimedAt===claimed.notice.emailClaimedAt){notice.emailStatus=status;delete notice.emailClaimedAt;}});
 return status;
}
