'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {CheckCircle2,Eye,EyeOff,Mail} from 'lucide-react';
import {authRequest} from '@/lib/auth-request';
import {SubmitForm} from './submit-form';
import {AuthProgress} from './auth-progress';

export function PasswordRecoveryForm({mode,token,initialEmail=''}:{mode:'forgot'|'reset';token?:string;initialEmail?:string}){
 const lock=useRef(false);const[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[preview,setPreview]=useState(''),[show,setShow]=useState(false),[expired,setExpired]=useState(false),[email,setEmail]=useState(initialEmail);
 const valid=Boolean(token&&/^[a-f0-9]{64}$/.test(token));const login=email?`/login?email=${encodeURIComponent(email)}`:'/login';
 if(mode==='reset'&&(!valid||expired))return <div className="password-recovery-flow"><p className="notice" role="status">{error||'This reset link is missing or incomplete. Request a new link using your registered email.'}</p><h3>Request a fresh reset link</h3><PasswordRecoveryForm mode="forgot" initialEmail={initialEmail}/></div>;
 return <div className="password-recovery-flow">
  {success?<div className="success-state" role="status"><CheckCircle2 size={30}/><p>{success}</p>{preview&&<Link className="button" href={preview}>Open reset link</Link>}<Link className="button" href={login}>Back to login</Link>{mode==='forgot'&&<><p className="quiet-note">Email can take a few minutes to arrive. A new request will not cancel an earlier unexpired link.</p><button className="button outline" onClick={()=>{setSuccess('');setPreview('');}}>Request another reset link</button></>}</div>:<SubmitForm className="stack-form" onEdit={()=>setError('')} onSubmit={async event=>{
   event.preventDefault();if(lock.current)return;const data=new FormData(event.currentTarget);
   if(mode==='reset'&&data.get('password')!==data.get('confirmation')){setError('The passwords do not match. Please enter the same new password twice.');return;}
   lock.current=true;setBusy(true);setError('');
   try{const result=await authRequest(mode,{email:email.trim().toLowerCase(),password:data.get('password'),token});setSuccess(result.message||'Password updated. Log in with your new password.');setPreview(result.verificationUrl||'');}
   catch(e){const message=(e as Error).message;setError(message);if(mode==='reset'&&message.startsWith('This reset link'))setExpired(true);}
   finally{lock.current=false;setBusy(false);}
  }}>
   {mode==='forgot'?<><p>Use the email address you registered with. We’ll send a link to choose a new password.</p><label className="field"><span>Registration email address</span><input name="email" type="email" required maxLength={160} autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/></label></>:<><p>Use at least 10 characters. After saving, log in with your new password.</p><label className="field"><span>New password</span><div className="password-input"><input name="password" type={show?'text':'password'} required minLength={10} maxLength={128} autoComplete="new-password" disabled={busy}/><button type="button" disabled={busy} aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><label className="field"><span>Confirm new password</span><input name="confirmation" type={show?'text':'password'} required minLength={10} maxLength={128} autoComplete="new-password" disabled={busy}/></label></>}
   {error&&<p className="error" role="alert">{error}</p>}<AuthProgress busy={busy}/>
   <button className="button" disabled={busy}>{busy?(mode==='forgot'?'Sending reset link…':'Saving new password…'):mode==='forgot'?'Request reset link':'Set new password'}<Mail size={17}/></button>
   <Link href={login}>Back to login</Link>
  </SubmitForm>}
  <p className="quiet-note">Need help? <a href="mailto:info@occanova.com">Contact Occanova support</a>. Never share your reset link or password.</p>
 </div>;
}
