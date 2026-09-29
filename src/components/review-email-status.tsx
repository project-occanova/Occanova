'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {post} from './forms';
import type {VendorNotification} from '@/lib/types';

export function ReviewEmailStatus({vendorId,notification}:{vendorId:string;notification?:Pick<VendorNotification,'id'|'emailStatus'>}){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState('');const router=useRouter();
 if(!notification)return null;
 const sent=notification.emailStatus==='sent';
 return <div className="notice review-email-status"><div><strong>Vendor notification</strong><p>{sent?'Dashboard update saved. Email accepted by the email provider.':notification.emailStatus==='pending'?'Dashboard update saved. Email is being processed.':'Dashboard update saved. Email hasn’t been sent successfully.'}</p>{message&&<p role="status">{message}</p>}</div>{!sent&&<button type="button" className="button outline small" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await post('admin/vendor-notification',{id:vendorId,notificationId:notification.id});setMessage(result.message);router.refresh();}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}}>{busy?'Sending…':'Retry email'}</button>}</div>;
}
