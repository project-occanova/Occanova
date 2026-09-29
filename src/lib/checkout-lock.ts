import type {State,VendorSubscription} from './types';
type OwnerKind='vendor'|'registration';
export function checkoutOwner(state:State,kind:OwnerKind,id:string){
 const owner=kind==='vendor'?state.users.find(user=>user.id===id&&user.role==='vendor'&&user.verified):state.registrations.find(row=>row.id===id&&row.verified&&!row.completedUserId);
 if(!owner)throw Error('Account setup changed. Refresh and try again.');
 return owner;
}
export function claimCheckout(state:State,kind:OwnerKind,id:string,key:string,now=Date.now()){
 const owner=checkoutOwner(state,kind,id);
 if(owner.checkoutLock&&owner.checkoutLock.expires>now)throw Error('AutoPay setup is already in progress. Wait a moment before retrying.');
 owner.checkoutLock={key,expires:now+120000};
 return owner.subscription?structuredClone(owner.subscription):undefined;
}
export function commitCheckout(state:State,kind:OwnerKind,id:string,key:string,previous:VendorSubscription|undefined,prepared:VendorSubscription){
 const owner=checkoutOwner(state,kind,id);
 if(owner.checkoutLock?.key!==key||owner.subscription?.gatewayId!==previous?.gatewayId)throw Error('Billing changed. Refresh and try again.');
 owner.subscription=prepared;delete owner.checkoutLock;
 if('autopayConsentAt' in owner){owner.plan=prepared.plan;owner.autopayConsentAt=new Date().toISOString();}
}
