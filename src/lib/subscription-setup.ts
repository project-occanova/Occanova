import {randomUUID} from 'node:crypto';
import {mutate} from './store';
import {claimCheckout,commitCheckout} from './checkout-lock';
import {prepareSubscription,razorpay} from './subscriptions';
import type {PlanId} from './plans';
import type {VendorSubscription} from './types';

export async function setupSubscription(kind:'vendor'|'registration',id:string,plan:PlanId,notes:Record<string,string>){
 const key=randomUUID();const previous=await mutate(state=>claimCheckout(state,kind,id,key));let prepared:VendorSubscription|undefined;let committed=false;
 try{
  prepared=await prepareSubscription(plan,previous,notes);
  await mutate(state=>commitCheckout(state,kind,id,key,previous,prepared!));
  committed=true;
  return prepared;
 }catch(error){
  // A freshly created mandate was never returned to Checkout if saving failed.
  if(prepared?.gatewayId&&prepared.gatewayId!==previous?.gatewayId)try{await razorpay('POST',`subscriptions/${prepared.gatewayId}/cancel`,{cancel_at_cycle_end:false});}catch(cleanupError){console.error('Uncommitted mandate cleanup failed',cleanupError);}
  throw error;
 }finally{
  if(!committed)await mutate(state=>{const owner=kind==='vendor'?state.users.find(user=>user.id===id):state.registrations.find(row=>row.id===id);if(owner?.checkoutLock?.key===key)delete owner.checkoutLock;});
 }
}
