'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

export function WorkspaceLiveUpdates({version,admin=false}:{version:string;admin?:boolean}){
 const router=useRouter(),dirty=useRef(false);const[available,setAvailable]=useState(false),[expired,setExpired]=useState(false);
 useEffect(()=>{
  setAvailable(false);let running=false;const controller=new AbortController();
  function edit(event:Event){if((event.target as Element).closest('form'))dirty.current=true;}
  function saved(){dirty.current=false;}
  function changed(){dirty.current=true;}
  async function check(){
   if(running||document.visibilityState!=='visible')return;running=true;
   try{const response=await fetch('/api/workspace-status',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});if(response.status===401){setExpired(true);return;}if(!response.ok)return;const result=await response.json();if(result.version!==version){if(dirty.current||document.activeElement?.closest('form'))setAvailable(true);else router.refresh();}}
   catch{/* Keep the current workspace usable during temporary connection failures. */}finally{running=false;}
  }
  const interval=setInterval(check,45000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);document.addEventListener('input',edit);document.addEventListener('change',edit);window.addEventListener('occanova:form-saved',saved);window.addEventListener('occanova:form-dirty',changed);
  return()=>{controller.abort();clearInterval(interval);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);document.removeEventListener('input',edit);document.removeEventListener('change',edit);window.removeEventListener('occanova:form-saved',saved);window.removeEventListener('occanova:form-dirty',changed);};
 },[version,router]);
 if(expired)return <p className="notice workspace-live-notice">Your session has ended. <Link href={admin?'/admin/login':'/login'}>Sign in again</Link> to get new updates.</p>;
 if(!available)return null;
 return <div className="notice workspace-live-notice" role="status"><span>There’s a new workspace update. Your unsaved edits are still here.</span><button type="button" className="button outline small" onClick={()=>{if(dirty.current&&!window.confirm('Refresh the workspace? Unsaved form changes will be replaced with the latest saved details.'))return;dirty.current=false;setAvailable(false);router.refresh();}}>Refresh workspace</button></div>;
}
