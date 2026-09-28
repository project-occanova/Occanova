'use client';
import {useRef,useState} from 'react';
import {openOrderCheckout,type OrderCheckoutResponse} from '@/lib/razorpay-checkout';

export function PaymentCheckout({enabled,testMode,email,phone}:{enabled:boolean;testMode:boolean;email:string;phone:string}){
 const [amount,setAmount]=useState('1.00');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [confirmation,setConfirmation]=useState<OrderCheckoutResponse>();
 const active=useRef(false);
 const order=useRef<{order_id:string;amount:number;currency:string;key_id:string}|undefined>(undefined);
 async function send(path:string,body:unknown){const response=await fetch(`/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.error||'Payment request failed.');return result;}
 async function verify(response:OrderCheckoutResponse){
  setBusy(true);setError('');setConfirmation(response);
  try{const result=await send('verify-payment',response);if(result.success){setNotice(`Payment confirmed. Reference: ${result.payment_id}`);setConfirmation(undefined);order.current=undefined;}else setNotice(result.message||'Payment is awaiting confirmation.');}
  catch(e){setError((e as Error).message+' Use Check payment status before making another payment.');}
  finally{active.current=false;setBusy(false);}
 }
 async function pay(){
  if(active.current)return;
  const paise=Math.round(Number(amount)*100);
  if(!/^\d+(\.\d{1,2})?$/.test(amount)||!Number.isSafeInteger(paise)||paise<100||paise>10000000){setError('Enter an amount from ₹1 to ₹1,00,000 with up to two decimal places.');return;}
  active.current=true;setBusy(true);setError('');setNotice('');
  try{
   if(order.current?.amount!==paise)order.current=await send('create-order',{amount:paise,currency:'INR'});
   const selected=order.current!;
   await openOrderCheckout({key:selected.key_id,orderId:selected.order_id,amount:selected.amount,currency:selected.currency,email,phone,onConfirm:response=>{void verify(response);},onClose:()=>{active.current=false;setBusy(false);setNotice('Checkout closed. No payment has been confirmed.');},onFailure:message=>{setError(message);}});
  }catch(e){active.current=false;setBusy(false);setError((e as Error).message);}
 }
 return <section className="panel workspace-section payment-checkout">
  <div className="workspace-section-heading"><div><h1>One-time payment</h1><p>Pay the amount agreed with Occanova securely through Razorpay.</p></div>{testMode&&<span className="status">Test mode</span>}</div>
  <p className="quiet-note">This payment does not set up AutoPay or activate a subscription. Manage your vendor plan in Plan & billing.</p>
  <label htmlFor="payment-amount">Amount in rupees (INR)</label>
  <input id="payment-amount" type="number" inputMode="decimal" min="1" max="100000" step="0.01" value={amount} disabled={busy||Boolean(confirmation)} onChange={e=>{setAmount(e.target.value);setError('');setNotice('');}}/>
  <div className="subscription-actions"><button type="button" className="button" disabled={!enabled||busy||Boolean(confirmation)} onClick={pay}>{busy?'Please wait…':`Pay ₹${Number(amount||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`}</button>{confirmation&&<button type="button" className="button outline" disabled={busy} onClick={()=>{void verify(confirmation);}}>Check payment status</button>}</div>
  {!enabled&&<p className="notice">One-time payments are being configured. Please check back soon.</p>}
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
 </section>;
}
