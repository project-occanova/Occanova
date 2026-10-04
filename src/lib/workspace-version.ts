import {createHash} from 'node:crypto';
import type {State,User} from './types';
export function workspaceVersion(state:State,user:User){
 const vendor=state.vendors.find(row=>row.userId===user.id);
 const data=user.role==='admin'?[state.audit[0]?.id,state.vendors.map(row=>[row.id,row.name,row.category,row.city,row.status,row.published,row.submittedAt,row.reviewedAt,row.sample]),state.enquiries.map(row=>[row.id,row.status]),state.registrations.map(row=>[row.id,row.verified,row.plan,row.completedUserId,row.subscription?.status,row.verificationEmail?.status,row.verificationEmail?.attemptedAt]),state.users.filter(row=>row.role==='vendor').map(row=>[row.id,row.email,row.phone,row.verified,row.subscription?.plan,row.subscription?.status,row.subscription?.trialEndsAt,row.subscription?.updatedAt])]:[vendor?.status,vendor?.published,vendor?.submittedAt,vendor?.reviewedAt,vendor?.remarks,user.subscription?.updatedAt,user.notifications?.map(row=>[row.id,row.readAt]),state.enquiries.filter(row=>row.vendorId===vendor?.id).map(row=>[row.id,row.status])];
 return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
