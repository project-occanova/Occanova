import {randomUUID} from 'node:crypto';
import type {Enquiry,State,User} from './types';
import {normalizeIndianMobile} from './mobile-otp';
import {registrationCanResume} from './email-verification';
import {publicVendors} from './directory';

export function createCustomer(state:State,input:{name:string;email:string;phone:string;passwordHash:string;verificationHash:string},now=Date.now()){
 const email=input.email.trim().toLowerCase(),phone=normalizeIndianMobile(input.phone);
 if(!phone)throw Error('Enter a valid Indian mobile number.');
 if(state.users.some(row=>row.email.trim().toLowerCase()===email||normalizeIndianMobile(row.phone)===phone)||state.registrations.some(row=>!row.completedUserId&&registrationCanResume(row,now)&&(row.email.trim().toLowerCase()===email||normalizeIndianMobile(row.phone)===phone)))throw Error('An account or registration already uses this email or mobile number.');
 const user:User={id:randomUUID(),name:input.name.trim(),email,phone,passwordHash:input.passwordHash,role:'customer',verified:false,phoneVerified:false,savedVendorIds:[]};
 state.users.push(user);
 state.tokens.push({hash:input.verificationHash,userId:user.id,kind:'verify',expires:now+86400000});
 return user;
}

export function changeCustomerSetupPhone(state:State,userId:string,phone:string){
 const user=state.users.find(row=>row.id===userId&&row.role==='customer'&&row.verified&&!row.phoneVerified);
 if(!user)throw Error('Customer setup is no longer available. Log in again.');
 const next=normalizeIndianMobile(phone);
 if(!next)throw Error('Enter a valid Indian mobile number.');
 if(next===normalizeIndianMobile(user.phone))return user;
 if(state.users.some(row=>row.id!==userId&&normalizeIndianMobile(row.phone)===next)||state.registrations.some(row=>!row.completedUserId&&registrationCanResume(row)&&normalizeIndianMobile(row.phone)===next))throw Error('Another account already uses this mobile number.');
 user.phone=next;
 state.tokens=state.tokens.filter(row=>!(row.userId===userId&&row.kind==='mobile'));
 return user;
}

export function setSavedCustomerVendor(state:State,userId:string,vendorId:string,saved:boolean){
 const user=state.users.find(row=>row.id===userId&&row.role==='customer'&&row.verified&&row.phoneVerified);
 if(!user)throw Error('Sign in to your verified customer account.');
 const vendor=publicVendors(state.vendors,{},state.users).find(row=>row.id===vendorId&&!row.sample);
 if(!vendor)throw Error('This vendor is not available to save.');
 const ids=user.savedVendorIds??[];
 if(saved&&!ids.includes(vendorId)&&ids.length>=50)throw Error('Your shortlist is full. Remove a saved vendor first.');
 user.savedVendorIds=saved?[...new Set([...ids,vendorId])]:ids.filter(id=>id!==vendorId);
 return user.savedVendorIds.includes(vendorId);
}

export function customerEnquiries(rows:Enquiry[],customerId:string){
 return rows.filter(row=>row.customerId===customerId).toSorted((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
