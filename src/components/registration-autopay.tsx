'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {planIds,subscriptionPlans,type PlanId} from '@/lib/plans';
import {openSubscriptionCheckout} from '@/lib/razorpay-checkout';
import {TrialOffer} from './trial-offer';

export function RegistrationAutopay({plan:initial,email,phone,enabled,trialEndsAt:initialDate,hasCheckout:initialCheckout=false,testMode=false}:{plan:PlanId;email:string;phone:string;enabled:boolean;trialEndsAt?:string;hasCheckout?:boolean;testMode?:boolean}){
 const router=useRouter();const[plan,setPlan]=useState(initial),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[trialEndsAt,setTrialEndsAt]=useState(initialDate),[hasCheckout,setHasCheckout]=useState(initialCheckout);
 const details=subscriptionPlans[plan];
 async function send(action:string,body:unknown={}){const response=await fetch(`/api/registration/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.error||'AutoPay setup could not be confirmed.');return result;}
 async function complete(action:string,body:unknown={}){const result=await send(action,body);if(result.redirect){router.replace(result.redirect);router.refresh();}}
 async function authorize(){
  setBusy(true);setError('');
  try{
   const result=await send('checkout',{plan,consent});
   if(result.redirect){router.replace(result.redirect);router.refresh();setBusy(false);return;}
   setTrialEndsAt(result.trialEndsAt);setHasCheckout(true);
   await openSubscriptionCheckout({key:result.key,subscriptionId:result.subscriptionId,email,phone,description:`${details.name} · ₹${details.monthlyRupees}/month including GST after two months free`,onClose:()=>setBusy(false),onFailure:()=>{setError('Authorization failed. Your vendor account has not been activated. Please retry.');setBusy(false);},onConfirm:async response=>{
    setBusy(true);try{await complete('confirm',{paymentId:response.razorpay_payment_id,subscriptionId:result.subscriptionId,signature:response.razorpay_signature});}catch(error){setError((error as Error).message+' Use Check authorization status if you already completed Checkout.');}finally{setBusy(false);}
   }});
  }catch(error){setError((error as Error).message);setBusy(false);}
 }
 return <section className="registration-autopay">
  <TrialOffer plan={plan}/>
  <ol className="registration-steps" aria-label="Registration progress"><li>1. Plan selected</li><li>2. Email verified</li><li aria-current="step">3. Set up AutoPay</li></ol>
  {testMode&&<p className="notice">Test Mode — use Razorpay test payment details. This setup does not take a live subscription payment.</p>}
  <p>Email verified for <strong>{email}</strong>. Complete AutoPay authorization to create your vendor account.</p>
  <fieldset className="plan-picker"><legend>Confirm your plan</legend><div className="plan-picker-grid">{planIds.map(id=><label key={id}><input type="radio" name="plan" checked={plan===id} disabled={busy} onChange={()=>{setPlan(id);setConsent(false);setError('');setTrialEndsAt(undefined);}}/><span><strong>{subscriptionPlans[id].name}</strong><b>₹{subscriptionPlans[id].monthlyRupees}/month</b><small>GST included</small></span></label>)}</div></fieldset>
  <div className="subscription-summary"><strong>{details.name}</strong><span>₹0 plan fee during your trial</span><small>Then ₹{details.monthlyRupees}/month, including GST, through AutoPay.</small>{trialEndsAt&&<small>First scheduled debit: {new Date(trialEndsAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'})}</small>}</div>
  <label className="checkbox"><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/><span>I authorize ₹{details.monthlyRupees}/month, including GST, after the two-month trial. I can cancel before the scheduled debit in my vendor studio.</span></label>
  <p className="quiet-note">The trial schedule is created when you open AutoPay setup. Confirm the first debit date in Razorpay Checkout. A small authorization amount may be processed by your payment provider. Closing or failing Checkout leaves registration incomplete.</p>
  <div className="registration-actions"><button type="button" className="button" disabled={!enabled||!consent||busy} onClick={authorize}>{busy?'Setting up…':'Set up AutoPay & activate account'}</button>{hasCheckout&&<button type="button" className="button outline" disabled={busy||!enabled} onClick={async()=>{setBusy(true);setError('');try{await complete('status');}catch(error){setError((error as Error).message);}finally{setBusy(false);}}}>Check authorization status</button>}</div>
  {!enabled&&<p className="notice">AutoPay setup is temporarily unavailable. Your registration is saved, and your vendor account remains inactive.</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  <p className="quiet-note">Need to return later? <Link href="/login">Log in to resume registration.</Link></p>
 </section>;
}
