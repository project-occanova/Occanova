'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Heart,LogOut} from 'lucide-react';
import {SubmitForm} from './submit-form';

export function SaveVendorButton({vendorId,returnTo,initialSaved=false,initiallyAuthenticated}:{vendorId:string;returnTo:string;initialSaved?:boolean;initiallyAuthenticated?:boolean}){
 const router=useRouter(),[saved,setSaved]=useState(initialSaved),[authenticated,setAuthenticated]=useState<boolean|null>(initiallyAuthenticated??null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(initiallyAuthenticated!==undefined)return;
  const controller=new AbortController();
  fetch(`/api/customer/saved?vendorId=${encodeURIComponent(vendorId)}`,{signal:controller.signal}).then(response=>response.json()).then(result=>{setAuthenticated(Boolean(result.authenticated));setSaved(Boolean(result.saved));}).catch(()=>{if(!controller.signal.aborted)setAuthenticated(false);});
  return ()=>controller.abort();
 },[vendorId,initiallyAuthenticated]);
 async function change(){
  if(authenticated===false){router.push(`/customer/login?next=${encodeURIComponent(returnTo)}`);return;}
  if(authenticated===null||busy)return;
  setBusy(true);setError('');
  try{const response=await fetch('/api/customer/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendorId,saved:!saved}),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not update your saved vendors.');setSaved(Boolean(result.saved));router.refresh();}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }
 return <span className="save-vendor-action"><button type="button" className="button outline save-vendor-button" aria-pressed={saved} disabled={busy||authenticated===null} onClick={()=>void change()}><Heart size={17} fill={saved?'currentColor':'none'}/>{busy?'Saving…':saved?'Saved to shortlist':'Save vendor'}</button>{error&&<small className="error" role="alert">{error}</small>}</span>;
}

export function CustomerProfileForm({name,email,phone}:{name:string;email:string;phone:string}){
 const [current,setCurrent]=useState(name),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 return <SubmitForm className="customer-profile-form" onEdit={()=>{setError('');setMessage('');}} onSubmit={async event=>{
  event.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');
  try{const response=await fetch('/api/customer/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:current}),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not update your profile.');setMessage(result.message);}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }}>
  <label className="field"><span>Your name</span><input name="name" value={current} onChange={event=>setCurrent(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required/></label>
  <label className="field"><span>Verified email</span><input value={email} readOnly aria-readonly="true"/></label>
  <label className="field"><span>Verified mobile</span><input value={phone} readOnly aria-readonly="true"/></label>
  <div className="customer-profile-actions"><button className="button" disabled={busy}>{busy?'Saving…':'Save name'}</button><Link href={`/forgot-password?portal=customer&email=${encodeURIComponent(email)}`}>Change password</Link></div>
  {message&&<p className="success" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}
  <p className="quiet-note">To change your verified email or mobile number, contact <a href="mailto:info@occanova.com">info@occanova.com</a>. We’ll confirm ownership before updating either one.</p>
 </SubmitForm>;
}

export function CustomerLogout(){
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <span><button type="button" className="customer-logout" disabled={busy} onClick={async()=>{
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('Could not sign out. Please try again.');
   router.push('/customer/login');router.refresh();
  }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }}><LogOut size={17}/>{busy?'Signing out…':'Log out'}</button>{error&&<small className="error" role="alert">{error}</small>}</span>;
}
