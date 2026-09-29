'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {planIds,subscriptionPlans,type PlanId} from '@/lib/plans';
import type {VendorSubscription} from '@/lib/types';
import type {PlanAccess} from '@/lib/plan-access';

import {openSubscriptionCheckout} from '@/lib/razorpay-checkout';
import {checkoutFailureIssue,type AutopayIssue} from '@/lib/autopay-feedback';
import {AutopayFeedback} from './autopay-feedback';

async function send(action:string,body:unknown){
 const response=await fetch(`/api/billing/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||'Subscription request failed.');
 return result;
}
export function SubscriptionPanel({subscription,enabled,email,phone,portfolioCount=0,access}:{subscription?:VendorSubscription;enabled:boolean;email:string;phone:string;portfolioCount?:number;access?:PlanAccess}){
 const router=useRouter();
 const checkoutActive=useRef(false);
 const [plan,setPlan]=useState<PlanId>(subscription?.plan||'starter');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [issue,setIssue]=useState<AutopayIssue>();
 const authorized=subscription&&['authenticated','active','pending','halted'].includes(subscription.status);
 const planDetails=subscriptionPlans[plan];
 async function authorize(){
  if(checkoutActive.current)return;checkoutActive.current=true;setBusy(true);setError('');setIssue(undefined);setNotice('');
  try{
   const result=await send('checkout',{plan});
   await openSubscriptionCheckout({key:result.key,subscriptionId:result.subscriptionId,email,phone,description:`${planDetails.name} · ₹${planDetails.monthlyRupees}/month, including GST, after trial`,onClose:()=>{checkoutActive.current=false;setBusy(false);},onFailure:response=>{setIssue(checkoutFailureIssue(response,result.subscriptionId));},onConfirm:async response=>{
    setBusy(true);
    try{await send('confirm',{paymentId:response.razorpay_payment_id,subscriptionId:result.subscriptionId,signature:response.razorpay_signature});setIssue(undefined);setNotice('AutoPay authorized. Your plan is ready.');router.refresh();}
    catch(e){setError((e as Error).message+' We will also check the Razorpay webhook.');}
    finally{checkoutActive.current=false;setBusy(false);}
   }});
  }catch(e){setError((e as Error).message);checkoutActive.current=false;setBusy(false);}
 }
 async function cancel(){
  if(!window.confirm('Cancel AutoPay now? Future charges will stop and your listing may become hidden.'))return;
  setBusy(true);setError('');
  try{await send('cancel',{});setNotice('AutoPay was cancelled.');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function checkStatus(){setBusy(true);setError('');setNotice('');try{const result=await send('status',{});setIssue(undefined);setNotice(`Latest Razorpay billing status: ${result.status}.`);router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section id="subscription" className="panel workspace-section subscription-panel">
  <div className="workspace-section-heading"><div><h2>Plan & billing</h2><p>Choose your vendor plan and manage your monthly AutoPay mandate.</p></div><span className="status">{subscription?.status||'Not selected'}</span></div>
  <div className="subscription-summary"><strong>{subscription?subscriptionPlans[subscription.plan].name:'Choose a plan'}</strong><span>{subscription?`₹${subscriptionPlans[subscription.plan].monthlyRupees}/month, including GST, after trial`:'Two months free'}</span>{subscription?.trialEndsAt&&<small>First scheduled charge: {new Date(subscription.trialEndsAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'})}</small>}</div>
  {subscription&&<div className="plan-usage"><span><strong>{portfolioCount} / {subscriptionPlans[subscription.plan].portfolioLimit}</strong> portfolio photos</span>{access?.trial&&<span>2-month free trial · selected plan limits apply</span>}</div>}
  {subscription&&portfolioCount>subscriptionPlans[subscription.plan].portfolioLimit&&<p className="error" role="alert">Your profile exceeds this plan’s photo limit and is hidden from search. Remove extra photos and save your profile to continue.</p>}
  {access&&!access.allowed&&<p className="notice plan-lock-note" role="status">{access.reason}</p>}
  {subscription?.status==='halted'&&<p className="error">Razorpay has halted this mandate. Please contact support to restore billing.</p>}
  {!authorized&&<><div className="billing-plan-grid">{planIds.map(id=>{const entry=subscriptionPlans[id];return <label key={id} className={plan===id?'selected':''}><input type="radio" name="billing-plan" checked={plan===id} disabled={busy} onChange={()=>setPlan(id)}/><strong>{entry.name}</strong><b>₹{entry.monthlyRupees}<small>/month</small></b><span>{entry.description}</span><small>Up to {entry.portfolioLimit} portfolio photos</small></label>;})}</div><p className="quiet-note">All monthly prices include GST. Your trial schedule is created when you open AutoPay setup. Reauthorizing keeps any remaining trial time. The exact first debit date appears in Razorpay Checkout before you authorize. A small mandate authorization amount may be processed by your payment provider.</p><button type="button" className="button" disabled={!enabled||busy} onClick={authorize}>{busy?'Please wait…':'Authorize AutoPay'}</button>{!enabled&&<p className="notice">Subscription checkout is being configured. Your selected plan is saved; no charge or mandate has been created.</p>}</>}
  {authorized&&<><div className="subscription-actions"><p>AutoPay is {subscription?.status}. To change plans, cancel this mandate and authorize a new one. A new trial is not granted.</p><button type="button" className="button outline" disabled={busy||!enabled} onClick={cancel}>{busy?'Please wait…':'Cancel AutoPay'}</button></div></>}{subscription?.gatewayId&&<button type="button" className="button outline" disabled={busy||!enabled} onClick={checkStatus}>Check billing status</button>}
  {issue&&<AutopayFeedback issue={issue} email={email}/>}{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
 </section>;
}
