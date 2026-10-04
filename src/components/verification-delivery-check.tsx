'use client';
import {useState} from 'react';

export function VerificationDeliveryCheck({registrationId}:{registrationId:string}){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <div className="verification-delivery-check"><button type="button" className="button outline small" disabled={busy} onClick={async()=>{
  setBusy(true);setMessage('');
  try{const response=await fetch(`/api/admin/verification-delivery?registrationId=${encodeURIComponent(registrationId)}`,{cache:'no-store'});const data=await response.json();setMessage(response.ok?`${data.event&&data.event!=='unknown'?`Resend: ${data.event}. `:''}${data.message}`:data.error||'Could not check delivery.');}
  catch{setMessage('Could not reach the delivery status service. Try again later.');}finally{setBusy(false);}
 }}>{busy?'Checking…':'Check delivery'}</button>{message&&<small role="status">{message}</small>}</div>;
}
