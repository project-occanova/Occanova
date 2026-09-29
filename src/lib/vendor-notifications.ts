import {randomUUID} from 'node:crypto';
import type {State,Vendor,VendorNotification,User} from './types';

export function notifyVendor(state:State,vendor:Vendor,kind:VendorNotification['kind'],now=Date.now()){
 const owner=state.users.find(user=>user.id===vendor.userId&&user.role==='vendor');
 if(!owner||vendor.sample)return;
 const copy={
  submitted:{title:'Your profile is waiting for review',message:`${vendor.name} has been submitted to Occanova. We’ll notify you when there is a decision. Your listing stays private during review.`},
  approved:{title:'Your profile is approved!',message:vendor.published?`${vendor.name} is approved and published. Customers can now discover your business and send enquiries.`:`${vendor.name} is approved. Your listing is still private until Occanova publishes it.`},
  'changes-requested':{title:'Your profile needs a few changes',message:`Please update ${vendor.name} using the reviewer’s feedback below, then submit it again.${vendor.remarks?' Feedback: '+vendor.remarks:''}`},
  visibility:{title:'Your listing visibility has changed',message:vendor.published?`${vendor.name} is now published in the Occanova directory.`:`${vendor.name} is currently hidden from the public directory. Open your studio for details.${vendor.remarks?' Feedback: '+vendor.remarks:''}`},
 }[kind];
 const notice:VendorNotification={id:randomUUID(),vendorId:vendor.id,kind,...copy,href:kind==='approved'&&vendor.published?`/vendors/${vendor.slug}`:'/dashboard#review-status',createdAt:new Date(now).toISOString(),emailStatus:'pending'};
 owner.notifications=[notice,...(owner.notifications??[])].slice(0,30);
 return {userId:owner.id,email:owner.email,notice};
}
export function reviewNotificationKind(before:Pick<Vendor,'status'|'published'>,after:Pick<Vendor,'status'|'published'>):VendorNotification['kind']|undefined{
 if(after.status==='approved'&&before.status!=='approved')return 'approved';
 if(after.status==='rejected'&&before.status!=='rejected')return 'changes-requested';
 if(before.published!==after.published||(['inactive','suspended'].includes(after.status)&&before.status!==after.status))return 'visibility';
}
export function markNotificationsRead(user:User,ids:string[],now=Date.now()){
 for(const notice of user.notifications??[])if(ids.includes(notice.id))notice.readAt??=new Date(now).toISOString();
}
