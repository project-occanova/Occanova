import type {Enquiry,Vendor,VendorNotification} from './types';
import {localPreview,siteUrl} from './config';
import {subscriptionPlans,type PlanId} from './plans';

const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export class EmailSendError extends Error{constructor(message:string,public source:'configuration'|'provider'|'transport',public httpStatus?:number){super(message);}}

async function send(to:string|string[],subject:string,html:string,text:string,idempotencyKey?:string){
  const apiKey=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;
  if(!apiKey||!from){if(localPreview())return;throw new EmailSendError('Email delivery is not configured.','configuration');}
  let response:Response;
  try{response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify({from,to:Array.isArray(to)?to:[to],subject,html,text}),signal:AbortSignal.timeout(10000)});}
  catch{throw new EmailSendError('Resend could not be reached before the request timeout.','transport');}
  if(!response.ok){console.error('Resend delivery failed with HTTP',response.status);throw new EmailSendError('We could not send the email. Please try again.','provider',response.status);}
  const result=await response.json();
  if(typeof result.id!=='string'||!result.id)throw new EmailSendError('Email delivery could not be confirmed. Please try again.','provider',response.status);
  return result.id as string;
}

export function sendVendorUpdateEmail(email:string,notice:VendorNotification){
 const href=`${siteUrl()}${notice.href}`;
 return send(email,`Occanova: ${notice.title}`,`<h1>${esc(notice.title)}</h1><p>${esc(notice.message)}</p><p><a href="${esc(href)}">Open your update</a></p><p>Manage your profile in your <a href="${siteUrl()}/dashboard">vendor studio</a>. For help, contact info@occanova.com.</p>`,`${notice.title}\n${notice.message}\n${href}\nVendor studio: ${siteUrl()}/dashboard\nSupport: info@occanova.com`,`vendor-update/${notice.id}`);
}

export const sendVerificationEmail=(email:string,value:string)=>send(email,'Verify your Occanova vendor account',`<h1>Welcome to Occanova</h1><p>Verify your email to finish creating your vendor account.</p><p><a href="${siteUrl()}/verify?token=${value}">Verify email</a></p><p>This link expires in 24 hours. If it expires, <a href="${siteUrl()}/resend-verification">request a new verification link</a>. If your email is already verified, <a href="${siteUrl()}/login">log in to continue</a>.</p>`,`Verify your Occanova account: ${siteUrl()}/verify?token=${value}\nThis link expires in 24 hours.
Request a new link: ${siteUrl()}/resend-verification
Already verified? Log in: ${siteUrl()}/login`);
export const sendResetEmail=(email:string,value:string)=>send(email,'Reset your Occanova password',`<h1>Reset your password</h1><p><a href="${siteUrl()}/reset-password?token=${value}">Choose a new password</a></p><p>This link expires in 30 minutes. Ignore this email if you did not request it.</p>`,`Reset your Occanova password: ${siteUrl()}/reset-password?token=${value}\nThis link expires in 30 minutes.`);
export function sendMobileChangedEmail(email:string,phone:string){
 const ending=phone.slice(-4);
 return send(email,'Your Occanova mobile number was changed',`<h1>Mobile number updated</h1><p>The verified mobile number on your Occanova vendor account now ends in ${esc(ending)}. It is also the public phone number on your listing.</p><p>If you did not make this change, contact <a href="mailto:info@occanova.com">info@occanova.com</a> immediately and reset your password.</p>`,`Your Occanova vendor mobile number now ends in ${ending}. If you did not make this change, contact info@occanova.com immediately and reset your password.`);
}
export function sendFirstChargeReminder(email:string,plan:PlanId,date:string){
 const amount=subscriptionPlans[plan].monthlyRupees;
 const day=new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'});
 return send(email,'Your Occanova free trial ends soon',`<h1>Your first subscription payment is approaching</h1><p>Your ${subscriptionPlans[plan].name} plan is scheduled to begin on ${esc(day)} at ₹${amount} per month, including GST. Confirm the scheduled debit in your Razorpay mandate.</p><p>Manage or cancel AutoPay in your <a href="${siteUrl()}/dashboard#subscription">vendor studio</a> before the scheduled debit.</p>`,`Your Occanova ${subscriptionPlans[plan].name} free trial ends on ${day}. The plan is ₹${amount} per month, including GST. Confirm the scheduled debit in your Razorpay mandate. Manage or cancel AutoPay: ${siteUrl()}/dashboard#subscription`);
}
export async function sendEnquiryNotifications(enquiry:Enquiry,vendor:Vendor){
  const rows=`<p><strong>From:</strong> ${esc(enquiry.name)} (${esc(enquiry.contact)})</p><p><strong>Event:</strong> ${esc(enquiry.service)} in ${esc(enquiry.city)} on ${esc(enquiry.date)}</p><p>${esc(enquiry.message)}</p>`;
  const recipients=[vendor.email,process.env.ADMIN_EMAIL].filter((x):x is string=>Boolean(x));
  if(recipients.length)await send([...new Set(recipients)],`New Occanova enquiry for ${vendor.name}`,`<h1>New enquiry</h1>${rows}<p>Consent to share these details was confirmed.</p>`,`New enquiry for ${vendor.name}\nFrom: ${enquiry.name} (${enquiry.contact})\nEvent: ${enquiry.service} in ${enquiry.city} on ${enquiry.date}\n${enquiry.message}`);
}
