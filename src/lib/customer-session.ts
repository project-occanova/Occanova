import {cookies} from 'next/headers';
import {cookieOptions,digest} from './auth';
import {readState} from './store';

export const customerSetupCookie='occanova_customer_setup';
export const customerSetupCookieOptions={...cookieOptions,maxAge:30*60};

export async function currentCustomerSetup(){
 const value=(await cookies()).get(customerSetupCookie)?.value;
 if(!value)return null;
 const state=await readState();
 const session=state.tokens.find(row=>row.kind==='customer-setup'&&row.hash===digest(value)&&row.expires>Date.now());
 return state.users.find(row=>row.id===session?.userId&&row.role==='customer'&&row.verified&&!row.phoneVerified)??null;
}
