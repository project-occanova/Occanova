'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Smartphone} from 'lucide-react';
import {TrialOffer} from './trial-offer';
import {SubmitForm} from './submit-form';
import type {PlanId} from '@/lib/plans';

export function RegistrationMobileVerification({plan,email,phone:initialPhone,enabled}:{plan:PlanId;email:string;phone:string;enabled:boolean}){
 const router=useRouter();const lock=useRef(false);
 const[phone,setPhone]=useState(initialPhone),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[previewCode,setPreviewCode]=useState('');
 const masked=phone.replace(/\d(?=\d{4})/g,'•');
 async function request(action:'send'|'verify'|'change',body:unknown={}){
  const response=await fetch(`/api/registration/mobile/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||'Could not complete mobile verification. Please try again.');
  return result;
 }
 async function run(action:'send'|'verify'|'change',body:unknown={}){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   const result=await request(action,body);
   setMessage(result.message);
   if(action==='send'){setSent(true);setPreviewCode(result.previewCode||'');}
   if(action==='change'){setPhone(result.phone);setSent(false);setPreviewCode('');router.refresh();}
   if(action==='verify'){setPreviewCode('');router.refresh();}
  }catch(reason){setError(reason instanceof Error?reason.message:'Please try again.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className="registration-mobile">
  <TrialOffer plan={plan}/>
  <ol className="registration-steps" aria-label="Registration progress"><li>1. Plan selected</li><li>2. Email verified</li><li aria-current="step">3. Verify mobile</li><li>4. Set up AutoPay</li></ol>
  <div className="registration-mobile-heading"><Smartphone size={26}/><div><h3>Verify your mobile number</h3><p>Email verified for <strong>{email}</strong>. We’ll send a six-digit code to <strong>{masked}</strong>. Your account is created after this step and AutoPay authorization.</p></div></div>
  {message&&<p className="success" role="status">{message}</p>}
  {previewCode&&<p className="notice">Local preview OTP: <strong>{previewCode}</strong></p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {sent&&<SubmitForm className="otp-form" onEdit={()=>setError('')} onSubmit={event=>{event.preventDefault();void run('verify',{code:new FormData(event.currentTarget).get('code')});}}><label className="field"><span>Six-digit OTP</span><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="000000"/></label><button className="button" disabled={busy}>{busy?'Verifying…':'Verify & continue to AutoPay'}</button></SubmitForm>}
  <button className="button outline" type="button" disabled={busy||!enabled} onClick={()=>void run('send')}>{busy?'Please wait…':sent?'Resend OTP':'Send OTP'}</button>
  {!enabled&&<p className="notice">SMS verification is temporarily unavailable. Your registration is saved; return later to continue.</p>}
  <details className="registration-phone-change"><summary>Wrong mobile number? Change it</summary><SubmitForm className="stack-form" onEdit={()=>setError('')} onSubmit={event=>{event.preventDefault();void run('change',{phone:new FormData(event.currentTarget).get('phone')});}}><label className="field"><span>New Indian mobile number</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} placeholder="+91 98765 43210"/></label><button className="button outline" disabled={busy}>Update number</button></SubmitForm></details>
  <p className="quiet-note">You can resume later by signing in with your email and password. Mobile login becomes available after this number is verified.</p>
 </section>;
}
