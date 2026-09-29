import {createHash} from 'node:crypto';
import type {State,User} from './types';
export function workspaceVersion(state:State,user:User){
 const vendor=state.vendors.find(row=>row.userId===user.id);
 const data=user.role==='admin'?[state.audit[0]?.id,state.vendors.map(row=>[row.id,row.status,row.published,row.submittedAt,row.reviewedAt]),state.enquiries.map(row=>[row.id,row.status])]:[vendor?.status,vendor?.published,vendor?.submittedAt,vendor?.reviewedAt,vendor?.remarks,user.subscription?.updatedAt,user.notifications?.map(row=>[row.id,row.readAt]),state.enquiries.filter(row=>row.vendorId===vendor?.id).map(row=>[row.id,row.status])];
 return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
