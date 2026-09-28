type CheckoutResponse={razorpay_payment_id:string;razorpay_subscription_id:string;razorpay_signature:string};
type CheckoutOptions={key:string;subscription_id:string;name:string;description:string;prefill:{email:string;contact:string};theme:{color:string};modal:{ondismiss:()=>void};handler:(response:CheckoutResponse)=>void};
type CheckoutInstance={open:()=>void;on:(name:string,handler:()=>void)=>void};
declare global{interface Window{Razorpay?:new(options:CheckoutOptions)=>CheckoutInstance}}
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
export async function openSubscriptionCheckout(input:{key:string;subscriptionId:string;email:string;phone:string;description:string;onConfirm:(response:CheckoutResponse)=>void;onClose:()=>void;onFailure:()=>void}){
 await load();
 const checkout=new window.Razorpay!({key:input.key,subscription_id:input.subscriptionId,name:'Occanova',description:input.description,prefill:{email:input.email,contact:input.phone},theme:{color:'#315b1c'},modal:{ondismiss:input.onClose},handler:input.onConfirm});
 checkout.on('payment.failed',input.onFailure);checkout.open();
}
