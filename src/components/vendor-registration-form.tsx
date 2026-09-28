'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Eye,EyeOff,ArrowUpRight} from 'lucide-react';
import {planIds,subscriptionPlans,type PlanId} from '@/lib/plans';
import {TrialOffer} from './trial-offer';

export function VendorRegistrationForm(){
 const[plan,setPlan]=useState<PlanId>('starter'),[autopayConsent,setAutopayConsent]=useState(false),[busy,setBusy]=useState(false),[show,setShow]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[verificationUrl,setVerificationUrl]=useState('');
 const details=subscriptionPlans[plan];
 if(message)return <div className="success-state" role="status"><h3>Verify your email next.</h3><p>{message}</p>{verificationUrl?<Link className="button" href={verificationUrl}>Verify email and continue</Link>:<p>Open the verification link in your inbox to set up AutoPay.</p>}<Link href="/resend-verification">Resend verification email</Link><Link href="/login">Resume registration</Link></div>;
 return <form className="stack-form vendor-registration-form" onSubmit={async event=>{
  event.preventDefault();setBusy(true);setError('');
  try{const data=Object.fromEntries(new FormData(event.currentTarget));const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,plan,consent:data.consent==='on',autopayConsent:data.autopayConsent==='on'})});const result=await response.json();if(!response.ok)throw Error(result.error||'Registration could not start.');setMessage(result.message);setVerificationUrl(result.verificationUrl||'');}
  catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }}>
  <TrialOffer plan={plan}/>
  <ol className="registration-steps" aria-label="Registration progress"><li aria-current="step">1. Choose a plan</li><li>2. Verify email</li><li>3. Set up AutoPay</li></ol>
  <fieldset className="plan-picker"><legend>Choose your plan for the trial</legend><p>You get the selected plan’s features and limits from day one. AutoPay authorization activates your account.</p><div className="plan-picker-grid">{planIds.map(id=><label key={id}><input type="radio" name="plan" value={id} checked={plan===id} onChange={()=>{setPlan(id);setAutopayConsent(false);}}/><span><strong>{subscriptionPlans[id].name}</strong><b>₹0 for 2 months</b><small className="plan-after-trial">Then ₹{subscriptionPlans[id].monthlyRupees}/month · GST included</small><small>Up to {subscriptionPlans[id].portfolioLimit} portfolio photos</small></span></label>)}</div></fieldset>
  <label className="field"><span>Email address</span><input name="email" type="email" required maxLength={160} autoComplete="email"/></label>
  <label className="field"><span>Indian mobile number</span><input name="phone" type="tel" required autoComplete="tel" placeholder="+91 98765 43210"/></label>
  <label className="field"><span>Password</span><div className="password-input"><input name="password" type={show?'text':'password'} required minLength={10} maxLength={128} autoComplete="new-password"/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><small>Use at least 10 characters.</small></label>
  <label className="checkbox"><input name="autopayConsent" type="checkbox" checked={autopayConsent} onChange={event=>setAutopayConsent(event.target.checked)} required/><span>I agree to set up AutoPay for ₹{details.monthlyRupees}/month, including GST, after the two-month trial. I can cancel before the first debit in my vendor studio.</span></label>
  <label className="checkbox"><input name="consent" type="checkbox" required/><span>I accept the <Link href="/terms">Terms & Conditions</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>
  <p className="quiet-note">Your vendor account is created only after successful AutoPay authorization. No monthly plan fee is taken during registration. Your payment provider may process a small authorization amount.</p>
  {error&&<p className="error" role="alert">{error}</p>}
  <button className="button" disabled={busy}>{busy?'Please wait…':'Verify email and continue'}<ArrowUpRight size={17}/></button>
  <p className="auth-bottom">Already started? <Link href="/login">Log in to continue</Link></p>
 </form>;
}
