'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {planIds,subscriptionPlans,type PlanId} from '@/lib/plans';
import {openSubscriptionCheckout} from '@/lib/razorpay-checkout';
import {TrialOffer} from './trial-offer';
import {autopayIssue,checkoutFailureIssue,responseIssue,type AutopayIssue} from '@/lib/autopay-feedback';
import {AutopayFeedback} from './autopay-feedback';

class SetupRequestError extends Error{constructor(public issue:AutopayIssue){super(issue.message);}}

export function RegistrationAutopay({plan:initial,email,phone,enabled,trialEndsAt:initialDate,hasCheckout:initialCheckout=false,testMode=false}:{plan:PlanId;email:string;phone:string;enabled:boolean;trialEndsAt?:string;hasCheckout?:boolean;testMode?:boolean}){
 const router=useRouter();const active=useRef(false);const[plan,setPlan]=useState(initial),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[issue,setIssue]=useState<AutopayIssue>(),[notice,setNotice]=useState(''),[trialEndsAt,setTrialEndsAt]=useState(initialDate),[hasCheckout,setHasCheckout]=useState(initialCheckout),[checkoutPlan,setCheckoutPlan]=useState(initial),[retrySeconds,setRetrySeconds]=useState(0);
 useEffect(()=>{if(!retrySeconds)return;const timer=setTimeout(()=>setRetrySeconds(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[retrySeconds]);
 const details=subscriptionPlans[plan];
 function report(error:unknown,fallback:AutopayIssue=autopayIssue('confirmation_unavailable')){const next=error instanceof SetupRequestError?error.issue:fallback;setIssue(previous=>({...next,paymentId:next.paymentId||fallback.paymentId||previous?.paymentId,subscriptionId:next.subscriptionId||fallback.subscriptionId||previous?.subscriptionId}));if(next.retryAfter)setRetrySeconds(next.retryAfter);}
 function release(){active.current=false;setBusy(false);}
 async function send(action:string,body:unknown={}){const response=await fetch(`/api/registration/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});const result=await response.json();if(!response.ok)throw new SetupRequestError(responseIssue(result,response.status));return result;}
 async function complete(action:string,body:unknown={}){const result=await send(action,body);if(result.redirect){router.replace(result.redirect);router.refresh();}}
 async function checkStatus(){if(active.current||retrySeconds)return;active.current=true;setBusy(true);setNotice('');try{await complete('status');}catch(error){report(error);}finally{release();}}
 async function authorize(){
  if(active.current||retrySeconds)return;active.current=true;setBusy(true);setIssue(undefined);setNotice('');let checkoutReady=false;
  try{
   const result=await send('checkout',{plan,consent});
   if(result.redirect){router.replace(result.redirect);router.refresh();release();return;}
   setTrialEndsAt(result.trialEndsAt);setHasCheckout(true);setCheckoutPlan(plan);setNotice('');
   checkoutReady=true;let failed=false;
   await openSubscriptionCheckout({key:result.key,subscriptionId:result.subscriptionId,email,phone,description:`${details.name} · ₹${details.monthlyRupees}/month including GST after two months free`,onClose:()=>{release();if(!failed)setNotice('AutoPay setup was closed. Your registration is saved. If you already authorized in your bank app, check authorization status before retrying.');},onFailure:response=>{failed=true;setIssue(checkoutFailureIssue(response,result.subscriptionId));},onConfirm:async response=>{
    active.current=true;setBusy(true);setIssue(undefined);setNotice('');try{await complete('confirm',{paymentId:response.razorpay_payment_id,subscriptionId:result.subscriptionId,signature:response.razorpay_signature});}catch(error){report(error,autopayIssue('confirmation_unavailable',{paymentId:response.razorpay_payment_id,subscriptionId:result.subscriptionId}));}finally{release();}
   }});
  }catch(error){report(error,autopayIssue(checkoutReady?'checkout_unavailable':'confirmation_unavailable'));release();}
 }
 return <section className="registration-autopay">
  <TrialOffer plan={plan}/>
  <ol className="registration-steps" aria-label="Registration progress"><li>1. Plan selected</li><li>2. Email verified</li><li aria-current="step">3. Set up AutoPay</li></ol>
  {testMode&&<p className="notice">Test Mode — use Razorpay test payment details. This setup does not take a live subscription payment.</p>}
  <p>Email verified for <strong>{email}</strong>. Complete AutoPay authorization to create your vendor account.</p>
  <fieldset className="plan-picker"><legend>Confirm your plan</legend><div className="plan-picker-grid">{planIds.map(id=><label key={id}><input type="radio" name="plan" checked={plan===id} disabled={busy} onChange={()=>{setPlan(id);setConsent(false);setNotice('');}}/><span><strong>{subscriptionPlans[id].name}</strong><b>₹{subscriptionPlans[id].monthlyRupees}/month</b><small>GST included</small></span></label>)}</div></fieldset>
  <div className="subscription-summary"><strong>{details.name}</strong><span>₹0 plan fee during your trial</span><small>Then ₹{details.monthlyRupees}/month, including GST, through AutoPay.</small>{trialEndsAt&&plan===checkoutPlan&&<small>First scheduled debit: {new Date(trialEndsAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'})}</small>}</div>
  <label className="checkbox"><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/><span>I authorize ₹{details.monthlyRupees}/month, including GST, after the two-month trial. I can cancel before the scheduled debit in my vendor studio.</span></label>
  <p className="quiet-note">The trial schedule is created when you open AutoPay setup. Confirm the first debit date in Razorpay Checkout. A small authorization amount may be processed by your payment provider. Closing or failing Checkout leaves registration incomplete.</p>
  {issue&&<AutopayFeedback issue={issue} email={email}/>}
  {retrySeconds>0&&<p className="notice" role="status">Try again in {retrySeconds} seconds.</p>}
  <div className="registration-actions"><button type="button" className={issue?.recovery==='status'&&hasCheckout?'button outline':'button'} disabled={!enabled||!consent||busy||retrySeconds>0||issue?.recovery==='login'||issue?.recovery==='support'||(issue?.recovery==='status'&&hasCheckout)} onClick={authorize}>{busy?'Please wait…':issue?.code==='setup_expired'?'Start fresh AutoPay setup':'Set up AutoPay & activate account'}</button>{hasCheckout&&<button type="button" className={issue?.recovery==='status'?'button':'button outline'} disabled={busy||!enabled||retrySeconds>0||issue?.recovery==='login'} onClick={checkStatus}>Check authorization status</button>}</div>
  {!enabled&&<p className="notice">AutoPay setup is temporarily unavailable. Your registration is saved, and your vendor account remains inactive.</p>}
  {hasCheckout&&plan!==checkoutPlan&&<p className="notice">Your previous checkout uses {subscriptionPlans[checkoutPlan].name} at ₹{subscriptionPlans[checkoutPlan].monthlyRupees}/month, including GST. Check authorization status for that plan if you already approved it. Opening new setup replaces an unfinished checkout with {details.name}; an authorized mandate keeps its agreed plan.</p>}
  {notice&&<p className="notice" role="status">{notice}</p>}
  <p className="quiet-note">Need to return later? <Link href="/login">Log in to resume registration.</Link> For help, email <a href="mailto:info@occanova.com">info@occanova.com</a>.</p>
 </section>;
}
