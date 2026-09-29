'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {authRequest} from '@/lib/auth-request';
import {SubmitForm} from './submit-form';
import {AuthProgress} from './auth-progress';

// Account-only registration is retained for the local preview without loading dashboard forms.
export function LegacyRegistrationForm({initialEmail=''}:{initialEmail?:string}){
 const lock=useRef(false);const[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{message:string;verificationUrl?:string}>();
 if(result)return <div className="success-state" role="status"><p>{result.message}</p>{result.verificationUrl?<Link className="button" href={result.verificationUrl}>Verify account</Link>:<Link href="/resend-verification">Resend verification email</Link>}<Link href="/login">Back to login</Link></div>;
 return <SubmitForm className="stack-form" onEdit={()=>setError('')} onSubmit={async event=>{event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');const data=Object.fromEntries(new FormData(event.currentTarget));try{setResult(await authRequest('register',{...data,consent:data.consent==='on'}));}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}}>
  <label className="field"><span>Email address</span><input name="email" type="email" required maxLength={160} defaultValue={initialEmail} autoComplete="email" disabled={busy}/></label>
  <label className="field"><span>Indian mobile number</span><input name="phone" type="tel" required maxLength={20} autoComplete="tel" placeholder="+91 98765 43210" disabled={busy}/></label>
  <label className="field"><span>Password</span><input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" disabled={busy}/><small>Use at least 10 characters.</small></label>
  <label className="checkbox"><input name="consent" type="checkbox" required disabled={busy}/><span>I accept the <Link href="/terms">Terms & Conditions</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>
  {error&&<p className="error" role="alert">{error}</p>}<AuthProgress busy={busy}/><button className="button" disabled={busy}>{busy?'Please wait…':'Create your account'}</button><Link href="/login">Already have an account? Log in</Link>
 </SubmitForm>;
}
