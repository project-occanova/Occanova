import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {notifyVendor,reviewNotificationKind,markNotificationsRead} from '../src/lib/vendor-notifications';
import {workspaceVersion} from '../src/lib/workspace-version';
import type {Vendor} from '../src/lib/types';

function fixture(){const state=initialState();state.users.push({id:'owner',email:'account@example.com',phone:'',passwordHash:'unused',role:'vendor',verified:true});const vendor:Vendor={...state.vendors[0],id:'real-vendor',userId:'owner',sample:false,status:'pending',published:false};state.vendors.push(vendor);return{state,vendor,owner:state.users[0]};}
test('submission and approval updates belong to the account and preserve unread history',()=>{
 const {state,vendor,owner}=fixture();const receipt=notifyVendor(state,vendor,'submitted',1000)!;assert.equal(receipt.email,'account@example.com');assert.equal(owner.notifications?.length,1);assert.equal(owner.notifications?.[0].readAt,undefined);
 vendor.status='approved';vendor.published=true;const approval=notifyVendor(state,vendor,'approved',2000)!;assert.equal(approval.notice.href,`/vendors/${vendor.slug}`);assert.equal(owner.notifications?.length,2);
 markNotificationsRead(owner,[approval.notice.id,'another-account-notice'],3000);assert.equal(owner.notifications?.[0].readAt,new Date(3000).toISOString());assert.equal(owner.notifications?.[1].readAt,undefined);
 markNotificationsRead(owner,[approval.notice.id],4000);assert.equal(owner.notifications?.[0].readAt,new Date(3000).toISOString());
});
test('repeat saves do not generate another approval; publication and changes requested have distinct updates',()=>{
 assert.equal(reviewNotificationKind({status:'approved',published:true},{status:'approved',published:true}),undefined);
 assert.equal(reviewNotificationKind({status:'pending',published:false},{status:'approved',published:true}),'approved');
 assert.equal(reviewNotificationKind({status:'approved',published:false},{status:'approved',published:true}),'visibility');
 assert.equal(reviewNotificationKind({status:'pending',published:false},{status:'rejected',published:false}),'changes-requested');
 const {state,vendor,owner}=fixture();vendor.remarks='Please add your full business details';notifyVendor(state,vendor,'changes-requested');assert.match(owner.notifications![0].message,/full business details/);
 vendor.sample=true;assert.equal(notifyVendor(state,vendor,'approved'),undefined);
});
test('notice history is bounded and workspace updates are scoped to the signed-in vendor',()=>{
 const {state,vendor,owner}=fixture();const first=workspaceVersion(state,owner);for(let i=0;i<35;i++)notifyVendor(state,vendor,'submitted',i);assert.equal(owner.notifications?.length,30);assert.notEqual(workspaceVersion(state,owner),first);
 const current=workspaceVersion(state,owner);state.vendors[0].status='pending';assert.equal(workspaceVersion(state,owner),current);
 markNotificationsRead(owner,[owner.notifications![0].id]);assert.notEqual(workspaceVersion(state,owner),current);
});
