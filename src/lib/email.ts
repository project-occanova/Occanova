import type {Enquiry,Vendor} from './types';
import {localPreview,siteUrl} from './config';

const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

async function send(to:string|string[],subject:string,html:string,text:string){
  const apiKey=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;
  if(!apiKey||!from){if(localPreview())return;throw Error('Email delivery is not configured.');}
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:Array.isArray(to)?to:[to],subject,html,text})});
  if(!response.ok){const detail=await response.text();console.error('Resend delivery failed',response.status,detail.slice(0,300));throw Error('We could not send the email. Please try again.');}
}

export const sendVerificationEmail=(email:string,value:string)=>send(email,'Verify your Occanova vendor account',`<h1>Welcome to Occanova</h1><p>Verify your email to finish creating your vendor account.</p><p><a href="${siteUrl()}/verify?token=${value}">Verify email</a></p><p>This link expires in 24 hours.</p>`,`Verify your Occanova account: ${siteUrl()}/verify?token=${value}\nThis link expires in 24 hours.`);
export const sendResetEmail=(email:string,value:string)=>send(email,'Reset your Occanova password',`<h1>Reset your password</h1><p><a href="${siteUrl()}/reset-password?token=${value}">Choose a new password</a></p><p>This link expires in 30 minutes. Ignore this email if you did not request it.</p>`,`Reset your Occanova password: ${siteUrl()}/reset-password?token=${value}\nThis link expires in 30 minutes.`);
export async function sendEnquiryNotifications(enquiry:Enquiry,vendor:Vendor){
  const rows=`<p><strong>From:</strong> ${esc(enquiry.name)} (${esc(enquiry.contact)})</p><p><strong>Event:</strong> ${esc(enquiry.service)} in ${esc(enquiry.city)} on ${esc(enquiry.date)}</p><p>${esc(enquiry.message)}</p>`;
  const recipients=[vendor.email,process.env.ADMIN_EMAIL].filter((x):x is string=>Boolean(x));
  if(recipients.length)await send([...new Set(recipients)],`New Occanova enquiry for ${vendor.name}`,`<h1>New enquiry</h1>${rows}<p>Consent to share these details was confirmed.</p>`,`New enquiry for ${vendor.name}\nFrom: ${enquiry.name} (${enquiry.contact})\nEvent: ${enquiry.service} in ${enquiry.city} on ${enquiry.date}\n${enquiry.message}`);
}
