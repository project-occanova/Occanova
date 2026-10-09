'use client';

import {useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,CheckCircle2,Eye,EyeOff,Mail,Smartphone} from 'lucide-react';
import {EmailInboxReminder} from './email-inbox-reminder';
import {SubmitForm} from './submit-form';

type Action='register'|'login'|'verify'|'resend'|'mobile-send'|'mobile-verify'|'mobile-change'|'profile';
async function request(action:Action,body:unknown){
 let response:Response;
 try{response=await fetch(`/api/customer/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});}
 catch{throw Error('We could not confirm the request. Check your connection and try again.');}
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(result.error||'Please try again or contact info@occanova.com.');
 return result;
}

export function CustomerRegisterForm(){
 const lock=useRef(false),[busy,setBusy]=useState(false),[show,setShow]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{email:string;message:string;verificationUrl?:string;emailDelivery?:string}|null>(null);
 if(result)return <div className="success-state" role="status"><CheckCircle2 size={32}/><h3>Check your email</h3><p>{result.message}</p><strong>{result.email}</strong><EmailInboxReminder/>{result.verificationUrl&&<Link className="button" href={result.verificationUrl}>Verify email</Link>}<Link href={`/customer/verify?email=${encodeURIComponent(result.email)}`}>Resend verification email</Link><Link href="/customer/login">Already verified? Log in</Link></div>;
 return <SubmitForm className="stack-form" onEdit={()=>setError('')} onSubmit={async event=>{
  event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');
  const data=Object.fromEntries(new FormData(event.currentTarget));
  try{setResult(await request('register',{...data,consent:data.consent==='on'}));}
  catch(reason){setError((reason as Error).message);}finally{lock.current=false;setBusy(false);}
 }}>
  <label className="field"><span>Your name</span><input name="name" autoComplete="name" maxLength={80} required placeholder="First and last name"/></label>
  <label className="field"><span>Email address</span><input name="email" type="email" autoComplete="email" maxLength={160} required/></label>
  <label className="field"><span>Indian mobile number</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} required placeholder="+91 98765 43210"/><small>We’ll verify this number by SMS before your account opens.</small></label>
  <label className="field"><span>Password</span><span className="password-input"><input name="password" type={show?'text':'password'} autoComplete="new-password" minLength={10} maxLength={128} required/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></span><small>Use at least 10 characters.</small></label>
  <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
  <label className="checkbox"><input name="consent" type="checkbox" required/><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>
  {error&&<p className="error" role="alert">{error}</p>}
  <button className="button" disabled={busy}>{busy?'Creating account…':'Create customer account'}<ArrowRight size={17}/></button>
  <p className="quiet-note">Next: verify your email, then your mobile number. Customers do not need a subscription.</p>
  <p className="auth-bottom">Already have an account? <Link href="/customer/login">Log in</Link></p>
 </SubmitForm>;
}

export function CustomerLoginForm({initialEmail='',next=''}:{initialEmail?:string;next?:string}){
 const router=useRouter(),lock=useRef(false),[busy,setBusy]=useState(false),[show,setShow]=useState(false),[error,setError]=useState(''),[identity,setIdentity]=useState(initialEmail);
 return <SubmitForm className="stack-form" onEdit={()=>setError('')} onSubmit={async event=>{
  event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const result=await request('login',Object.fromEntries(new FormData(event.currentTarget)));router.push(result.redirect==='/customer'&&next.startsWith('/vendors/')?next:result.redirect);router.refresh();}
  catch(reason){setError((reason as Error).message);}finally{lock.current=false;setBusy(false);}
 }}>
  <label className="field"><span>Email or verified mobile number</span><input name="identity" value={identity} onChange={event=>setIdentity(event.target.value)} autoComplete="username" maxLength={160} required/></label>
  <label className="field"><span>Password</span><span className="password-input"><input name="password" type={show?'text':'password'} autoComplete="current-password" maxLength={128} required/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
  <Link href={`/forgot-password?portal=customer${identity.includes('@')?`&email=${encodeURIComponent(identity.trim())}`:''}`}>Forgot password?</Link>
  {error&&<p className="error" role="alert">{error}</p>}
  <button className="button" disabled={busy}>{busy?'Signing in…':'Log in'}<ArrowRight size={17}/></button>
  <div className="login-verification-recovery"><p>Still verifying your email?</p><EmailInboxReminder/><Link className="button outline" href={`/customer/verify${identity.includes('@')?`?email=${encodeURIComponent(identity.trim())}`:''}`}>Resend verification email <Mail size={17}/></Link><p className="quiet-note">Use your email until your mobile number is verified.</p></div>
  <p className="auth-bottom">New customer? <Link href="/customer/register">Create an account</Link> · A vendor? <Link href="/login">Vendor login</Link></p>
 </SubmitForm>;
}

export function CustomerVerifyForm({token,initialEmail=''}:{token?:string;initialEmail?:string}){
 const router=useRouter(),lock=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[preview,setPreview]=useState('');
 const valid=Boolean(token&&/^[a-f0-9]{64}$/.test(token));
 async function run(action:'verify'|'resend',body:unknown){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setStatus('');setPreview('');
  try{const result=await request(action,body);if(result.redirect){router.push(result.redirect);router.refresh();}else{setStatus(result.message);setPreview(result.verificationUrl||'');}}
  catch(reason){setError((reason as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 return <div className="email-verification-flow"><p>Verify your email before confirming your mobile number.</p>{valid?<button className="button" disabled={busy} onClick={()=>void run('verify',{token})}>{busy?'Verifying…':'Verify email'}<CheckCircle2 size={17}/></button>:<p className="notice">Enter your registered email below to request a new link.</p>}
  <EmailInboxReminder/>
  <SubmitForm className="stack-form" onEdit={()=>setError('')} onSubmit={event=>{event.preventDefault();void run('resend',{email:new FormData(event.currentTarget).get('email')});}}><label className="field"><span>Registered email</span><input name="email" type="email" defaultValue={initialEmail} maxLength={160} autoComplete="email" required/></label><button className="button outline" disabled={busy}>{busy?'Please wait…':'Resend verification link'}<Mail size={17}/></button></SubmitForm>
  {error&&<p className="error" role="alert">{error}</p>}{status&&<p className="success" role="status">{status}</p>}{preview&&<Link className="button outline" href={preview}>Open local verification link</Link>}
  <p>Already verified? <Link href="/customer/login">Log in to continue</Link>.</p>
 </div>;
}

export function CustomerMobileForm({phone:initialPhone}:{phone:string}){
 const router=useRouter(),lock=useRef(false),[phone,setPhone]=useState(initialPhone),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[preview,setPreview]=useState('');
 const masked=phone.replace(/\d(?=\d{4})/g,'•');
 async function run(action:'mobile-send'|'mobile-verify'|'mobile-change',body:unknown={}){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const result=await request(action,body);setMessage(result.message);if(action==='mobile-send'){setSent(true);setPreview(result.previewCode||'');}if(action==='mobile-change'){setPhone(result.phone);setSent(false);setPreview('');}if(result.redirect){router.push(result.redirect);router.refresh();}}
  catch(reason){setError((reason as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 return <div className="stack-form"><div className="registration-mobile-heading"><Smartphone size={26}/><div><h3>Verify your mobile number</h3><p>We’ll send a six-digit OTP to <strong>{masked}</strong>. Your account opens after verification.</p></div></div>
  {message&&<p className="success" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}{preview&&<p className="notice">Local preview OTP: <strong>{preview}</strong></p>}
  {sent&&<SubmitForm className="stack-form" onEdit={()=>setError('')} onSubmit={event=>{event.preventDefault();void run('mobile-verify',{code:new FormData(event.currentTarget).get('code')});}}><label className="field"><span>Six-digit OTP</span><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label><button className="button" disabled={busy}>{busy?'Verifying…':'Verify and open dashboard'}</button></SubmitForm>}
  <button className="button outline" type="button" disabled={busy} onClick={()=>void run('mobile-send')}>{busy?'Please wait…':sent?'Resend OTP':'Send OTP'}</button>
  <details className="registration-phone-change"><summary>Wrong mobile number? Change it</summary><SubmitForm className="stack-form" onEdit={()=>setError('')} onSubmit={event=>{event.preventDefault();void run('mobile-change',{phone:new FormData(event.currentTarget).get('phone')});}}><label className="field"><span>New Indian mobile number</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} required placeholder="+91 98765 43210"/></label><button className="button outline" disabled={busy}>Update number</button></SubmitForm></details>
  <p className="quiet-note">OTP expires in 10 minutes. You can return later by logging in with your email and password.</p>
 </div>;
}
