'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Bell,CheckCircle2,X} from 'lucide-react';
import type {VendorNotification,VendorStatus} from '@/lib/types';
import {post} from './forms';

export function ReviewUpdates({notifications,status}:{notifications:VendorNotification[];status?:VendorStatus}){
 const router=useRouter(),dialog=useRef<HTMLDialogElement>(null);const[busy,setBusy]=useState(false),[error,setError]=useState('');
 const approval=status==='approved'&&notifications[0]?.kind==='approved'&&!notifications[0].readAt?notifications[0]:undefined;
 const unread=notifications.filter(row=>!row.readAt);
 useEffect(()=>{if(approval&&!dialog.current?.open)dialog.current?.showModal();},[approval?.id]);
 async function acknowledge(ids:string[],close=false){setBusy(true);setError('');try{await post('notifications/read',{ids});if(close)dialog.current?.close();router.refresh();}catch{setError('We couldn’t mark this update as read. Please try again.');if(close)dialog.current?.close();}finally{setBusy(false);}}
 if(!notifications.length)return null;
 const item=(row:VendorNotification)=><article key={row.id} className={row.readAt?'':'unread'}><div><strong>{row.title}{!row.readAt&&<span className="unread-dot" aria-label="Unread"/>}</strong><p>{row.message}</p><small>{new Date(row.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})}</small></div><Link href={row.href}>View update</Link></article>;
 return <section className="panel workspace-section review-updates" aria-label="Profile updates">
  <div className="workspace-section-heading"><div><h2><Bell size={20}/>Your updates</h2><p>Submission confirmations and decisions from Occanova.</p></div>{!!unread.length&&<button className="button outline small" disabled={busy} onClick={()=>acknowledge(unread.map(row=>row.id))}>Mark all as read ({unread.length})</button>}</div>
  <div className="review-update-list">{notifications.slice(0,2).map(item)}</div>
  {notifications.length>2&&<details className="review-update-history"><summary>View earlier updates ({notifications.length-2})</summary><div className="review-update-list">{notifications.slice(2).map(item)}</div></details>}
  {error&&<p className="error" role="alert">{error}</p>}
  {approval&&<dialog className="review-approval-dialog" ref={dialog} aria-labelledby="approval-title" onCancel={event=>{event.preventDefault();if(!busy)acknowledge([approval.id],true);}}>
   <button type="button" className="dialog-close" aria-label="Close approval update" disabled={busy} onClick={()=>acknowledge([approval.id],true)}><X size={22}/></button>
   <CheckCircle2 size={42}/><h2 id="approval-title">{approval.title}</h2><p>{approval.message}</p>
   <div><button className="button" disabled={busy} onClick={()=>acknowledge([approval.id],true)}>{busy?'Saving…':'Got it, thank you'}</button><Link className="button outline" href={approval.href} onClick={event=>{event.preventDefault();if(!busy)acknowledge([approval.id],true).then(()=>router.push(approval.href));}}>{approval.href.startsWith('/vendors/')?'View public profile':'Open vendor studio'}</Link></div>
  </dialog>}
 </section>;
}
