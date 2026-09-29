'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {CheckCircle2,Mail} from 'lucide-react';
import {SubmitForm} from './submit-form';

async function request(action:'verify'|'resend',body:unknown){
 const response=await fetch(`/api/auth/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||'Please try again. If the problem continues, contact info@occanova.com.');
 return result;
}

export function EmailVerificationForm({mode,token,initialEmail=''}:{mode:'verify'|'resend';token?:string;initialEmail?:string}){
 const router=useRouter();const lock=useRef(false);
 const[busy,setBusy]=useState<'verify'|'resend'|null>(null),[error,setError]=useState(''),[verified,setVerified]=useState(''),[resendError,setResendError]=useState(''),[sent,setSent]=useState(''),[preview,setPreview]=useState('');
 const validLink=Boolean(token&&/^[a-f0-9]{64}$/.test(token));
 async function verify(){
  if(lock.current||!validLink)return;lock.current=true;setBusy('verify');setError('');
  try{const result=await request('verify',{token});if(result.redirect){router.push(result.redirect);router.refresh();}else setVerified(result.message);}
  catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(null);}
 }
 return <div className="email-verification-flow">
  {mode==='verify'&&(verified?<div className="success-state" role="status"><CheckCircle2 size={30}/><p>{verified}</p><Link className="button" href="/login">Log in to continue</Link></div>:<div className="verification-link-action">
   <p className="quiet-note">Confirm your email to continue your vendor registration. Verification links work for 24 hours.</p>
   {!validLink&&<p className="notice">This link is missing or incomplete. Request a fresh link below using the email you registered with.</p>}
   {error&&<p className="error" role="alert">{error}</p>}
   {validLink&&<button className="button" type="button" disabled={Boolean(busy)} onClick={verify}>{busy==='verify'?'Verifying…':'Verify email'}<CheckCircle2 size={17}/></button>}
  </div>)}
  {!verified&&<section className="verification-recovery" aria-labelledby={mode==='verify'?'verification-recovery-title':undefined} aria-label={mode==='resend'?'Request verification link':undefined}>
   {mode==='verify'&&<h3 id="verification-recovery-title">Need a new verification link?</h3>}
   <p>Expired link or no email? Enter the email address you used to register. You can request a new link without starting again.</p>
   <SubmitForm className="stack-form" onEdit={()=>setResendError('')} onSubmit={async event=>{
    event.preventDefault();if(lock.current)return;
    const email=String(new FormData(event.currentTarget).get('email')||'').trim();
    lock.current=true;setBusy('resend');setResendError('');setSent('');setPreview('');
    try{const result=await request('resend',{email});setSent(result.message);setPreview(result.verificationUrl||'');}
    catch(e){setResendError((e as Error).message);}finally{lock.current=false;setBusy(null);}
   }}>
    <label className="field"><span>Registration email address</span><input name="email" type="email" required maxLength={160} defaultValue={initialEmail} autoComplete="email" disabled={Boolean(busy)}/></label>
    {resendError&&<p className="error" role="alert">{resendError}</p>}
    {sent&&<div className="success" role="status"><p>{sent}</p>{preview&&<Link href={preview}>Open verification link</Link>}</div>}
    <button className="button outline" disabled={Boolean(busy)}>{busy==='resend'?'Sending…':'Resend verification link'}<Mail size={17}/></button>
   </SubmitForm>
  </section>}
  <div className="verification-help"><p>Already verified? <Link href="/login">Log in to continue</Link>. Your email may be verified even if you opened the link again.</p><p>Still stuck? <a href="mailto:info@occanova.com">Contact Occanova support</a>.</p></div>
 </div>;
}
