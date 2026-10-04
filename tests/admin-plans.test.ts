import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adminPlanReport} from '../src/lib/admin-plans';
import {workspaceVersion} from '../src/lib/workspace-version';
import {initialState} from '../src/lib/seed';
import type {User,VendorSubscription} from '../src/lib/types';

const now=Date.parse('2026-09-29T00:00:00Z');
function account(id:string,plan:VendorSubscription['plan']='starter',status:VendorSubscription['status']='authenticated'):User{
 return {id,email:id+'@example.com',phone:'9876543210',role:'vendor',verified:true,passwordHash:'private-password',subscription:{plan,status,trialEndsAt:new Date(now+86400000).toISOString(),updatedAt:new Date(now).toISOString(),gatewayId:'private-gateway-id'}};
}

test('plan totals count created vendor accounts, including those without a profile, and exclude administrators and unfinished signups',()=>{
 const state=initialState();state.users=[account('trial'),account('paid','growth','active'),{...account('admin','premium','active'),role:'admin'}];
 const profile={...state.vendors[0],id:'real-business',userId:'trial',name:'Real business',sample:false};
 state.vendors.push(profile,{...profile,id:'sample-business',userId:'paid',sample:true});
 state.registrations=[{id:'unfinished',email:'unfinished@example.com',phone:'',passwordHash:'secret',plan:'premium',verified:true,autopayConsentAt:new Date(now).toISOString(),expires:now+86400000}];
 const report=adminPlanReport(state,now);
 assert.equal(report.rows.length,2);assert.deepEqual(report.plans.map(p=>[p.total,p.trial,p.active,p.other]),[[1,1,0,0],[1,0,1,0],[0,0,0,0],[0,0,0,0]]);
 assert.equal(report.rows.find(r=>r.id==='trial')?.vendorId,'real-business');
 assert.equal(report.rows.find(r=>r.id==='paid')?.vendorId,null);
 const serialized=JSON.stringify(report);for(const secret of ['passwordHash','private-password','private-gateway-id','unfinished@example.com'])assert.equal(serialized.includes(secret),false);
});

test('trials, active subscriptions and unavailable billing states stay distinct without inflating active counts',()=>{
 const statuses=['selected','created','authenticated','active','pending','halted','cancelled','completed','expired'] as const;
 const state=initialState();state.users=statuses.map(status=>account(status,'pro',status));
 state.users.push({...account('expired-trial','pro'),subscription:{...account('x','pro').subscription!,trialEndsAt:new Date(now).toISOString()}});
 const report=adminPlanReport(state,now),pro=report.plans.find(p=>p.id==='pro')!;
 assert.deepEqual([pro.total,pro.trial,pro.active,pro.other],[10,1,1,8]);
 assert.equal(report.rows.find(r=>r.id==='expired-trial')?.billing,'attention');
 for(const status of ['cancelled','completed','expired'])assert.equal(report.rows.find(r=>r.id===status)?.billing,'ended');
 for(const status of ['selected','created','pending','halted'])assert.equal(report.rows.find(r=>r.id===status)?.billing,'attention');
});

test('legacy and invalid plans remain visible instead of being silently counted under a paid plan',()=>{
 const legacy=account('legacy');delete legacy.subscription;
 const invalid=account('invalid');invalid.subscription!.plan='constructor' as VendorSubscription['plan'];invalid.subscription!.trialEndsAt='invalid-date';
 const report=adminPlanReport({users:[legacy,invalid],vendors:[]},now);
 assert.equal(report.unassigned,2);assert.equal(report.plans.reduce((sum,p)=>sum+p.total,0),0);
 assert.equal(report.rows.find(r=>r.id==='legacy')?.billing,'none');
 const bad=report.rows.find(r=>r.id==='invalid')!;assert.equal(bad.unknownPlan,true);assert.equal(bad.billing,'attention');assert.equal(bad.trialEndsAt,null);
});

test('admin refresh detects plan, billing status, contact and profile changes',()=>{
 const state=initialState(),admin={...account('admin'),role:'admin' as const};state.users=[admin,account('vendor')];
 for(const change of [()=>{state.users[1].subscription!.plan='premium';},()=>{state.users[1].subscription!.status='halted';},()=>{state.users[1].email='changed@example.com';},()=>{state.vendors[0].name='Changed business';}]){
  const before=workspaceVersion(state,admin);change();assert.notEqual(workspaceVersion(state,admin),before);
 }
});
