import Razorpay from 'razorpay';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {validSignature} from './subscriptions';
import type {PaymentOrder} from './types';

// Standard orders are one-time payments; they never authorize a subscription.
export const orderInput=z.object({amount:z.number().int().min(100).max(10000000),currency:z.literal('INR').default('INR')});
export const paymentInput=z.object({razorpay_payment_id:z.string().regex(/^pay_[A-Za-z0-9]+$/),razorpay_order_id:z.string().regex(/^order_[A-Za-z0-9]+$/),razorpay_signature:z.string().regex(/^[a-f0-9]{64}$/i)});
export type PaymentConfirmation=z.infer<typeof paymentInput>;
export type GatewayPayment={id:string;order_id:string|null;amount:number|string;currency:string;status:string;captured:boolean};
export class PaymentError extends Error{constructor(message:string,public status=400){super(message);}}
export function paymentsConfigured(){const key=process.env.RAZORPAY_KEY_ID||'';return /^rzp_(test|live)_[A-Za-z0-9]+$/.test(key)&&Boolean(process.env.RAZORPAY_KEY_SECRET)&&(process.env.VERCEL_ENV!=='production'||key.startsWith('rzp_live_'));}
export function paymentsEnabled(){return process.env.PAYMENT_CHECKOUT_ENABLED==='true'&&paymentsConfigured();}
export function paymentGateway(){return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});}
export function gatewayFailure(error:unknown){const status=Number((error as {statusCode?:number}|null)?.statusCode);return new PaymentError(status===401?'Razorpay authentication failed. Please contact support.':'Razorpay could not process this request. Please retry.',status===401?401:500);}
export async function createPaymentOrder(userId:string,amount:number,currency:'INR'){
 const receipt=`occ_${randomUUID().replaceAll('-','')}`;
 let remote;
 try{remote=await paymentGateway().orders.create({amount,currency,receipt,notes:{occanova_user_id:userId,purpose:'one_time_payment'}});}catch(error){throw gatewayFailure(error);}
 if(!/^order_[A-Za-z0-9]+$/.test(remote.id)||Number(remote.amount)!==amount||remote.currency!==currency||remote.receipt!==receipt)throw new PaymentError('Razorpay returned unexpected order details.',500);
 return {id:remote.id,userId,keyId:process.env.RAZORPAY_KEY_ID!,amount,currency,receipt,status:'created',createdAt:new Date().toISOString()} satisfies PaymentOrder;
}
export async function checkPayment(order:PaymentOrder,userId:string,input:PaymentConfirmation,secret:string,fetchPayment:(id:string)=>Promise<GatewayPayment>){
 if(order.userId!==userId||order.id!==input.razorpay_order_id)throw new PaymentError('Order not found.',404);
 // Sign the stored order ID, never an arbitrary browser-supplied ID.
 if(!validSignature(`${order.id}|${input.razorpay_payment_id}`,input.razorpay_signature,secret))throw new PaymentError('Payment signature does not match.',400);
 if(order.status==='paid'){
  if(order.paymentId!==input.razorpay_payment_id)throw new PaymentError('This order already has a different payment.',409);
  return true;
 }
 const payment=await fetchPayment(input.razorpay_payment_id);
 if(payment.id!==input.razorpay_payment_id||payment.order_id!==order.id||Number(payment.amount)!==order.amount||payment.currency!==order.currency)throw new PaymentError('Payment details do not match this order.',400);
 if(payment.status==='authorized')return false;
 if(payment.status!=='captured'||!payment.captured)throw new PaymentError('Payment has not been captured.',400);
 return true;
}
