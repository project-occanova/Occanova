'use client';
import Link from 'next/link';
import {useState} from 'react';
import {subscriptionPlans,type PlanId} from '@/lib/plans';
import {reviewLabels} from '@/lib/review-labels';
import type {AccountBillingState,AdminPlanReport,AdminPlanRow} from '@/lib/admin-plans';

const billingLabels:Record<AccountBillingState,string>={trial:'Free trial',active:'Active subscription',attention:'Needs attention',ended:'Subscription ended',none:'No subscription'};
const pageSize=20;
function billingDetail(row:AdminPlanRow){
 if(row.unknownPlan)return 'Unrecognised plan — check account';
 if(row.billing==='trial')return 'AutoPay authorized';
 if(row.status==='authenticated')return 'Trial ended — awaiting activation';
 if(row.status==='created'||row.status==='selected')return 'AutoPay setup incomplete';
 if(row.status==='pending'||row.status==='halted')return 'Payment needs attention';
 return row.status?row.status.charAt(0).toUpperCase()+row.status.slice(1):'Legacy account';
}

export function AdminPlans({report}:{report:AdminPlanReport}){
 const [plan,setPlan]=useState<PlanId|'all'|'none'>('all');
 const [billing,setBilling]=useState('');const [query,setQuery]=useState('');const [page,setPage]=useState(0);
 const needle=query.trim().toLowerCase();
 const filtered=report.rows.filter(row=>(plan==='all'||(plan==='none'?!row.plan:row.plan===plan))&&(!billing||row.billing===billing)&&(!needle||[row.business,row.email,row.phone,row.category,row.city].some(v=>v?.toLowerCase().includes(needle))));
 const lastPage=Math.max(0,Math.ceil(filtered.length/pageSize)-1),currentPage=Math.min(page,lastPage);
 const shown=filtered.slice(currentPage*pageSize,(currentPage+1)*pageSize);
 function choosePlan(value:typeof plan){setPlan(value);setPage(0);}
 return <section id="subscriptions" className="panel workspace-section admin-plan-overview" aria-labelledby="admin-plans-heading">
  <div className="workspace-section-heading"><div><h2 id="admin-plans-heading">Plans & vendors</h2><p>See how many vendor accounts use each plan, then select a plan to view its vendors.</p></div><span>{report.rows.length} vendor accounts</span></div>
  <div className="admin-plan-cards">{report.plans.map(total=><button type="button" key={total.id} aria-pressed={plan===total.id} onClick={()=>choosePlan(total.id)}>
   <span>{subscriptionPlans[total.id].name}</span><strong>{total.total}</strong><small>vendor accounts</small>
   <div><span>{total.trial} in trial</span><span>{total.active} active</span><span>{total.other} other statuses</span></div>
  </button>)}</div>
  <p className="quiet-note">Counts include created vendor accounts only. Unfinished registrations and sample listings are excluded. “Active” is the subscription status, not a revenue total; cancelled and incomplete setups remain visible under their assigned plan.</p>
  <div className="admin-plan-toolbar">
   <label>Search vendors<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Business, email, phone or city"/></label>
   <label>Plan<select aria-label="Plan" value={plan} onChange={e=>choosePlan(e.target.value as typeof plan)}><option value="all">All plans ({report.rows.length})</option>{report.plans.map(p=><option key={p.id} value={p.id}>{subscriptionPlans[p.id].name} ({p.total})</option>)}<option value="none">No recognised plan ({report.unassigned})</option></select></label>
   <label>Subscription status<select aria-label="Subscription status" value={billing} onChange={e=>{setBilling(e.target.value);setPage(0);}}><option value="">All subscription statuses</option>{Object.entries(billingLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <button type="button" className="button outline small" onClick={()=>{choosePlan('all');setQuery('');setBilling('');}}>Clear filters</button>
  </div>
  <p className="admin-plan-results" role="status">{filtered.length} matching vendor accounts{filtered.length>0?` · Showing ${currentPage*pageSize+1}–${Math.min((currentPage+1)*pageSize,filtered.length)}`:''}</p>
  {shown.length?<div className="table-wrap responsive-table"><table><thead><tr><th>Vendor / contact</th><th>Plan</th><th>Subscription</th><th>Business profile</th></tr></thead><tbody>{shown.map(row=><tr key={row.id}>
   <td data-label="Vendor / contact"><strong>{row.business||'Profile not created'}</strong><small>{row.email}</small>{row.phone&&<small>{row.phone}</small>}{!row.verified&&<small>Email not verified</small>}</td>
   <td data-label="Plan">{row.plan?subscriptionPlans[row.plan].name:row.unknownPlan?'Unknown plan':'No plan / legacy'}{row.plan&&<small>₹{subscriptionPlans[row.plan].monthlyRupees}/month · GST included</small>}</td>
   <td data-label="Subscription"><strong className={'admin-billing-state '+row.billing}>{billingLabels[row.billing]}</strong><small>{billingDetail(row)}</small>{row.trialEndsAt&&<small>Trial {row.billing==='trial'?'ends':'end date'}: {new Date(row.trialEndsAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})}</small>}</td>
   <td data-label="Business profile">{row.vendorId?<><span>{row.review&&reviewLabels[row.review]}</span><small>{row.category} · {row.city}</small><Link prefetch={false} className="button outline small" href={'/admin/vendors/'+row.vendorId}>View vendor</Link></>:<span>Awaiting profile creation</span>}</td>
  </tr>)}</tbody></table></div>:<div className="empty-state compact"><h3>No vendors match.</h3><p>Choose another plan or clear the filters.</p></div>}
  {filtered.length>pageSize&&<nav className="admin-plan-pagination" aria-label="Vendor plan list pages"><button type="button" className="button outline small" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous</button><span>Page {currentPage+1} of {lastPage+1}</span><button type="button" className="button outline small" disabled={currentPage===lastPage} onClick={()=>setPage(currentPage+1)}>Next</button></nav>}
 </section>;
}
