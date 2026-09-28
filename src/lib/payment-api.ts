import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from './auth';
import {readState,mutate} from './store';
import {rateLimited} from './rate-limit';
import {checkPayment,createPaymentOrder,gatewayFailure,orderInput,paymentGateway,paymentInput,paymentsEnabled,PaymentError} from './payments';

export async function paymentRequest(req:NextRequest,action:'create'|'verify'){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 try{
  if(process.env.OCCANOVA_READ_ONLY==='true')throw new PaymentError('This site is read-only.',503);
  const expected=new URL(process.env.NEXT_PUBLIC_SITE_URL||req.nextUrl.origin).origin;
  if(req.headers.get('origin')!==expected)throw new PaymentError('Invalid request origin.',403);
  const user=await currentUser();
  if(!user||user.role!=='vendor'||!user.verified)throw new PaymentError('Please sign in to your verified vendor account.',401);
  if(!paymentsEnabled())throw new PaymentError('One-time payments are not open yet.',503);
  if(await rateLimited(`payment-${action}:${user.id}`,action==='create'?3:30,60000))throw new PaymentError('Please wait before retrying.',429);
  const raw=await req.text();if(raw.length>3000)throw new PaymentError('Request too large.',413);
  let body:unknown;try{body=JSON.parse(raw);}catch{throw new PaymentError('Invalid request.',400);}
  if(action==='create'){
   const {amount,currency}=orderInput.parse(body);
   const order=await createPaymentOrder(user.id,amount,currency);
   await mutate(state=>{state.paymentOrders.push(order);});
   return reply({order_id:order.id,amount:order.amount,currency:order.currency,key_id:order.keyId});
  }
  const input=paymentInput.parse(body);
  const order=(await readState()).paymentOrders.find(row=>row.id===input.razorpay_order_id&&row.userId===user.id);
  if(!order)throw new PaymentError('Order not found.',404);
  if(order.keyId!==process.env.RAZORPAY_KEY_ID)throw new PaymentError('Payment configuration changed. Please contact support.',409);
  const paid=await checkPayment(order,user.id,input,process.env.RAZORPAY_KEY_SECRET!,async id=>{
   try{return await paymentGateway().payments.fetch(id);}catch(error){throw gatewayFailure(error);}
  });
  if(!paid)return reply({success:false,status:'pending',message:'Payment is authorized and awaiting capture. Check its status again shortly.'},202);
  await mutate(state=>{const saved=state.paymentOrders.find(row=>row.id===order.id&&row.userId===user.id);if(!saved)throw new PaymentError('Order not found.',404);if(saved.paymentId&&saved.paymentId!==input.razorpay_payment_id)throw new PaymentError('This order already has a different payment.',409);saved.status='paid';saved.paymentId=input.razorpay_payment_id;saved.paidAt??=new Date().toISOString();});
  return reply({success:true,order_id:order.id,payment_id:input.razorpay_payment_id});
 }catch(error){
  if(error instanceof z.ZodError)return reply({error:'Use an INR amount of at least 100 paise and provide all required payment fields.'},400);
  if(error instanceof PaymentError)return reply({error:error.message},error.status);
  // SDK errors contain request headers; never log raw gateway errors or credentials.
  console.error('One-time payment request failed.');return reply({error:'Payment request failed. Please try again or contact support.'},500);
 }
}
