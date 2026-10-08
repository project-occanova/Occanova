'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {Eye,EyeOff,ArrowUpRight} from 'lucide-react';
import {planIds,subscriptionPlans,type PlanId} from '@/lib/plans';
import {TrialOffer} from './trial-offer';
import {SubmitForm} from './submit-form';
import {authRequest} from '@/lib/auth-request';
import {AuthProgress} from './auth-progress';
import {EmailInboxReminder} from './email-inbox-reminder';

export function VendorRegistrationForm(){
 const lock=useRef(false);
 const[plan,setPlan]=useState<PlanId>('starter'),[autopayConsent,setAutopayConsent]=useState(false),[busy,setBusy]=useState(false),[show,setShow]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[verificationUrl,setVerificationUrl]=useState(''),[email,setEmail]=useState(''),[emailAccepted,setEmailAccepted]=useState(false);
 const details=subscriptionPlans[plan];
 if(message)return <div className="success-state" role="status"><h3>Verify your email next.</h3><p>{message}</p><p><strong>{email}</strong></p>{emailAccepted&&<EmailInboxReminder/>}{verificationUrl?<Link className="button" href={verificationUrl}>Verify email and continue</Link>:!emailAccepted&&<p>If your verification email could not be sent, request a new link below.</p>}<Link href={'/resend-verification?email='+encodeURIComponent(email)}>Resend verification email</Link><Link href="/login">Resume registration</Link></div>;
 return <SubmitForm onEdit={()=>setError('')} className="stack-form vendor-registration-form" onSubmit={async event=>{
  event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const data=Object.fromEntries(new FormData(event.currentTarget));const result=await authRequest('register',{...data,plan,consent:data.consent==='on',autopayConsent:data.autopayConsent==='on'});setEmail(result.email||String(data.email).trim());setMessage(result.message);setVerificationUrl(result.verificationUrl||'');setEmailAccepted(result.emailDelivery==='sent');}
  catch(error){setError((error as Error).message);}finally{lock.current=false;setBusy(false);}
 }}>
  <fieldset className="registration-edit-fields" disabled={busy}>
  <TrialOffer plan={plan}/>
  <ol className="registration-steps" aria-label="Registration progress"><li aria-current="step">1. Choose a plan</li><li>2. Verify email</li><li>3. Verify mobile</li><li>4. Set up AutoPay</li></ol>
  <fieldset className="plan-picker"><legend>Choose your plan for the trial</legend><p>You get the selected plan’s features and limits from day one. AutoPay authorization activates your account.</p><div className="plan-picker-grid">{planIds.map(id=><label key={id}><input type="radio" name="plan" value={id} checked={plan===id} onChange={()=>{setPlan(id);setAutopayConsent(false);}}/><span><strong>{subscriptionPlans[id].name}</strong><b>₹0 for 2 months</b><small className="plan-after-trial">Then ₹{subscriptionPlans[id].monthlyRupees}/month · GST included</small><small>Up to {subscriptionPlans[id].portfolioLimit} portfolio photos</small></span></label>)}</div></fieldset>
  <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
  <label className="field"><span>Email address</span><input name="email" type="email" required maxLength={160} autoComplete="email"/></label>
  <label className="field"><span>Indian mobile number</span><input name="phone" type="tel" required autoComplete="tel" maxLength={20} inputMode="tel" placeholder="+91 98765 43210"/><small>We’ll verify this number by SMS. It will be the public contact number on your vendor listing.</small></label>
  <label className="field"><span>Password</span><div className="password-input"><input name="password" type={show?'text':'password'} required minLength={10} maxLength={128} autoComplete="new-password"/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><small>Use at least 10 characters.</small></label>
  <label className="checkbox"><input name="autopayConsent" type="checkbox" checked={autopayConsent} onChange={event=>setAutopayConsent(event.target.checked)} required/><span>I agree to set up AutoPay for ₹{details.monthlyRupees}/month, including GST, after the two-month trial. I can cancel before the first debit in my vendor studio.</span></label>
  <label className="checkbox"><input name="consent" type="checkbox" required/><span>I accept the <Link href="/terms">Terms & Conditions</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>
  <p className="quiet-note">Email and mobile verification are required before AutoPay. Your vendor account is created only after successful authorization. No monthly plan fee is taken during registration. Your payment provider may process a small authorization amount.</p>
  {error&&<p className="error" role="alert">{error}</p>}<AuthProgress busy={busy}/>
  <button className="button" disabled={busy}>{busy?'Please wait…':'Verify email and continue'}<ArrowUpRight size={17}/></button>
  <p className="auth-bottom">Already started? <Link href="/login">Log in to continue</Link></p>
  </fieldset>
 </SubmitForm>;
}
