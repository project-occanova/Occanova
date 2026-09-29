import type {CheckoutFailure} from './autopay-feedback';
type CheckoutResponse={razorpay_payment_id:string;razorpay_subscription_id:string;razorpay_signature:string};
export type OrderCheckoutResponse={razorpay_payment_id:string;razorpay_order_id:string;razorpay_signature:string};
type CheckoutOptions<T>={key:string;subscription_id?:string;order_id?:string;amount?:number;currency?:string;name:string;description:string;prefill:{email:string;contact:string};theme:{color:string};modal:{ondismiss:()=>void};handler:(response:T)=>void};
type CheckoutInstance={open:()=>void;on:(name:string,handler:(response:CheckoutFailure)=>void)=>void};
declare global{interface Window{Razorpay?:new<T>(options:CheckoutOptions<T>)=>CheckoutInstance}}
let loading:Promise<void>|undefined;
async function load(){
 if(window.Razorpay)return;
 loading??=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');
  const timeout=setTimeout(()=>{script.remove();reject(Error('Razorpay took too long to load. Please retry.'));},15000);
  script.src='https://checkout.razorpay.com/v1/checkout.js';
  script.onload=()=>{clearTimeout(timeout);if(window.Razorpay)resolve();else{script.remove();reject(Error('Razorpay Checkout is unavailable.'));}};
  script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('Razorpay Checkout could not load. Please retry.'));};
  document.head.appendChild(script);
 }).catch(error=>{loading=undefined;throw error;});
 await loading;
}
export async function openSubscriptionCheckout(input:{key:string;subscriptionId:string;email:string;phone:string;description:string;onConfirm:(response:CheckoutResponse)=>void;onClose:()=>void;onFailure:(response:CheckoutFailure)=>void}){
 await load();
 let confirming=false;
 const checkout=new window.Razorpay!({key:input.key,subscription_id:input.subscriptionId,name:'Occanova',description:input.description,prefill:{email:input.email,contact:input.phone},theme:{color:'#315b1c'},modal:{ondismiss:()=>{if(!confirming)input.onClose();}},handler:(response:CheckoutResponse)=>{if(confirming)return;confirming=true;input.onConfirm(response);}});
 checkout.on('payment.failed',response=>{if(!confirming)input.onFailure(response);});checkout.open();
}
export async function openOrderCheckout(input:{key:string;orderId:string;amount:number;currency:string;email:string;phone:string;onConfirm:(response:OrderCheckoutResponse)=>void;onClose:()=>void;onFailure:(message:string)=>void}){
 await load();
 let confirming=false;
 const checkout=new window.Razorpay!({key:input.key,order_id:input.orderId,amount:input.amount,currency:input.currency,name:'Occanova',description:'One-time payment',prefill:{email:input.email,contact:input.phone},theme:{color:'#315b1c'},modal:{ondismiss:()=>{if(!confirming)input.onClose();}},handler:(response:OrderCheckoutResponse)=>{confirming=true;input.onConfirm(response);}});
 checkout.on('payment.failed',response=>input.onFailure(response.error?.description||'Payment failed. Please retry.'));checkout.open();
}
