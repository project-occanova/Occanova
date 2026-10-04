'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowUpRight,Eye,EyeOff,Mail} from 'lucide-react';
import {authRequest} from '@/lib/auth-request';
import {SubmitForm} from './submit-form';
import {AuthProgress} from './auth-progress';
import {EmailInboxReminder} from './email-inbox-reminder';

export function VendorLoginForm({initialEmail=''}:{initialEmail?:string}){
 const router=useRouter(),lock=useRef(false),password=useRef<HTMLInputElement>(null);
 const[identity,setIdentity]=useState(initialEmail),[busy,setBusy]=useState<'login'|'resend'|null>(null),[show,setShow]=useState(false),[error,setError]=useState(''),[recovery,setRecovery]=useState<{status:string;message:string;verificationUrl?:string}|null>(null);
 function clear(){setError('');setRecovery(null);}
 async function resend(){
  if(lock.current)return;
  const email=identity.trim();clear();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError('Enter your registration email above to resend verification. Mobile numbers can be used for login, but verification is sent to your email.');return;}
  lock.current=true;setBusy('resend');
  try{setRecovery(await authRequest('resend',{email}));}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(null);}
 }
 return <div className="stack-form vendor-login-flow">
  <AuthProgress busy={Boolean(busy)}/>
  <SubmitForm className="stack-form" onEdit={clear} onSubmit={async event=>{
   event.preventDefault();if(lock.current)return;lock.current=true;setBusy('login');clear();
   try{const result=await authRequest('login',Object.fromEntries(new FormData(event.currentTarget)));router.push(result.redirect);router.refresh();}
   catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(null);}
  }}>
   <label className="field"><span>Email or mobile number</span><input name="identity" type="text" value={identity} onChange={event=>setIdentity(event.target.value)} required maxLength={160} autoComplete="username" disabled={Boolean(busy)}/></label>
   <label className="field"><span>Password</span><div className="password-input"><input ref={password} name="password" type={show?'text':'password'} required maxLength={128} autoComplete="current-password" disabled={Boolean(busy)}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)} disabled={Boolean(busy)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
   <Link className="text-right" href={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.trim())?`/forgot-password?email=${encodeURIComponent(identity.trim().toLowerCase())}`:'/forgot-password'}>Forgot password?</Link>
   <button className="button" disabled={Boolean(busy)}>{busy==='login'?'Signing in…':'Log in'}<ArrowUpRight size={17}/></button>
  </SubmitForm>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="login-verification-recovery">
   <p>Waiting for email verification?</p>
   <EmailInboxReminder/>
   <button className="button outline" type="button" disabled={Boolean(busy)} onClick={resend}>{busy==='resend'?'Sending…':'Resend verification email'}<Mail size={17}/></button>
   {recovery&&<div className={['not_found','registration_expired'].includes(recovery.status)?'notice':'success'} role="status"><p>{recovery.message}</p>{recovery.status==='already_verified'&&<button className="button outline" type="button" onClick={()=>password.current?.focus()}>Continue with login</button>}{['not_found','registration_expired'].includes(recovery.status)&&<Link href="/register">Start vendor registration</Link>}{recovery.verificationUrl&&<Link href={recovery.verificationUrl}>Open verification link</Link>}</div>}
   <p className="quiet-note">Use the email address you registered with. For help, <a href="mailto:info@occanova.com">contact Occanova support</a>.</p>
  </div>
  <p className="auth-bottom">New to Occanova? <Link href="/register">List your business</Link></p>
 </div>;
}
