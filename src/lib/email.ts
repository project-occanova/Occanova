import type {Enquiry,Vendor} from './types';
import {localPreview,siteUrl} from './config';
import {subscriptionPlans,type PlanId} from './plans';

const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

async function send(to:string|string[],subject:string,html:string,text:string){
  const apiKey=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;
  if(!apiKey||!from){if(localPreview())return;throw Error('Email delivery is not configured.');}
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:Array.isArray(to)?to:[to],subject,html,text}),signal:AbortSignal.timeout(10000)});
  if(!response.ok){const detail=await response.text();console.error('Resend delivery failed',response.status,detail.slice(0,300));throw Error('We could not send the email. Please try again.');}
}

export const sendVerificationEmail=(email:string,value:string)=>send(email,'Verify your Occanova vendor account',`<h1>Welcome to Occanova</h1><p>Verify your email to finish creating your vendor account.</p><p><a href="${siteUrl()}/verify?token=${value}">Verify email</a></p><p>This link expires in 24 hours.</p>`,`Verify your Occanova account: ${siteUrl()}/verify?token=${value}\nThis link expires in 24 hours.`);
export const sendResetEmail=(email:string,value:string)=>send(email,'Reset your Occanova password',`<h1>Reset your password</h1><p><a href="${siteUrl()}/reset-password?token=${value}">Choose a new password</a></p><p>This link expires in 30 minutes. Ignore this email if you did not request it.</p>`,`Reset your Occanova password: ${siteUrl()}/reset-password?token=${value}\nThis link expires in 30 minutes.`);
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
