import {isPlanId,planIds,type PlanId} from './plans';
import type {State,VendorSubscription,VendorStatus} from './types';

export type AccountBillingState='trial'|'active'|'attention'|'ended'|'none';
export type AdminPlanRow={
 id:string;email:string;phone:string;verified:boolean;plan:PlanId|null;unknownPlan:boolean;
 billing:AccountBillingState;status:VendorSubscription['status']|null;trialEndsAt:string|null;
 vendorId:string|null;business:string|null;category:string|null;city:string|null;review:VendorStatus|null;
};
export type AdminPlanReport={rows:AdminPlanRow[];plans:{id:PlanId;total:number;trial:number;active:number;other:number}[];unassigned:number};

// Project only the fields needed by the admin UI; never serialize account records.
export function adminPlanReport(state:Pick<State,'users'|'vendors'>,now=Date.now()):AdminPlanReport{
 const profiles=new Map(state.vendors.filter(v=>!v.sample).map(v=>[v.userId,v]));
 const rows:AdminPlanRow[]=state.users.filter(u=>u.role==='vendor').map(u=>{
  const subscription=u.subscription,profile=profiles.get(u.id);
  const plan=subscription&&isPlanId(subscription.plan)?subscription.plan:null;
  const trial=!!plan&&subscription?.status==='authenticated'&&Date.parse(subscription.trialEndsAt||'')>now;
  const billing:AccountBillingState=!subscription?'none':!plan?'attention':trial?'trial':subscription.status==='active'?'active':['cancelled','completed','expired'].includes(subscription.status)?'ended':'attention';
  return {id:u.id,email:u.email,phone:u.phone,verified:u.verified,plan,unknownPlan:!!subscription&&!plan,billing,status:subscription?.status||null,
   trialEndsAt:subscription?.trialEndsAt&&Number.isFinite(Date.parse(subscription.trialEndsAt))?subscription.trialEndsAt:null,
   vendorId:profile?.id||null,business:profile?.name||null,category:profile?.category||null,city:profile?.city||null,review:profile?.status||null};
 }).sort((a,b)=>(a.business||a.email).localeCompare(b.business||b.email));
 const plans=planIds.map(id=>({id,total:0,trial:0,active:0,other:0}));
 const totals=new Map(plans.map(p=>[p.id,p]));
 for(const row of rows){const total=row.plan&&totals.get(row.plan);if(total){total.total++;if(row.billing==='trial')total.trial++;else if(row.billing==='active')total.active++;else total.other++;}}
 return {rows,plans,unassigned:rows.filter(r=>!r.plan).length};
}
