import {createHmac} from 'node:crypto';
import {hasMobileOtp} from './config';

export class MobileOtpDeliveryError extends Error{
  constructor(){super('The verification message could not be sent. Please try again shortly.');}
}

export function normalizeIndianMobile(value:string){
  const digits=value.replace(/\D/g,'');
  const national=digits.length===10?digits:digits.length===12&&digits.startsWith('91')?digits.slice(2):'';
  return /^[6-9]\d{9}$/.test(national)?`+91${national}`:'';
}

export function mobileOtpHash(userId:string,phone:string,code:string){
  // The provider key peppers short OTPs in production; local preview has no real recipients.
  const secret=process.env.TWOFACTOR_API_KEY||'occanova-local-preview-only';
  return createHmac('sha256',secret).update(`${userId}:${phone}:${code}`).digest('hex');
}

export async function sendMobileOtp(phone:string,code:string){
  if(!hasMobileOtp())throw Error('Mobile verification is not configured yet.');
  const mobile=normalizeIndianMobile(phone);
  if(!mobile||!/^\d{6}$/.test(code))throw Error('Invalid mobile verification request.');
  let response:Response;
  try{
    const key=encodeURIComponent(process.env.TWOFACTOR_API_KEY!);
    const template=process.env.TWOFACTOR_TEMPLATE_NAME?`/${encodeURIComponent(process.env.TWOFACTOR_TEMPLATE_NAME)}`:'';
    response=await fetch(`https://2factor.in/API/V1/${key}/SMS/${mobile}/${code}${template}`,{signal:AbortSignal.timeout(12_000)});
  }catch{throw new MobileOtpDeliveryError();}
  const result=await response.json().catch(()=>({})) as {status?:string;Status?:string};
  const status=(result.status??result.Status??'').toLowerCase();
  if(!response.ok||!['sent','success'].includes(status))throw new MobileOtpDeliveryError();
}
