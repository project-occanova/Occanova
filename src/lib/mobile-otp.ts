import {hasMobileOtp} from './config';

export function normalizeIndianMobile(value:string){
  const digits=value.replace(/\D/g,'');
  const national=digits.length===10?digits:digits.length===12&&digits.startsWith('91')?digits.slice(2):'';
  return /^[6-9]\d{9}$/.test(national)?`+91${national}`:'';
}

function credentials(){
  const account=process.env.TWILIO_ACCOUNT_SID??'';
  const secret=process.env.TWILIO_AUTH_TOKEN??'';
  const service=process.env.TWILIO_VERIFY_SERVICE_SID??'';
  if(!hasMobileOtp())throw Error('Mobile verification is not configured yet.');
  return {service,authorization:`Basic ${Buffer.from(`${account}:${secret}`).toString('base64')}`};
}

async function twilio(path:string,body:URLSearchParams){
  const {service,authorization}=credentials();
  const response=await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(service)}/${path}`,{
    method:'POST',headers:{Authorization:authorization,'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(12_000),
  });
  const result=await response.json().catch(()=>({})) as {status?:string};
  return {response,result};
}

export async function sendMobileOtp(phone:string){
  const {response,result}=await twilio('Verifications',new URLSearchParams({To:phone,Channel:'sms'}));
  if(!response.ok||result.status!=='pending')throw Error('The verification message could not be sent. Please try again.');
}

export async function checkMobileOtp(phone:string,code:string){
  const {response,result}=await twilio('VerificationCheck',new URLSearchParams({To:phone,Code:code}));
  if(!response.ok&&response.status!==400&&response.status!==404)throw Error('The mobile verification service is temporarily unavailable.');
  return result.status==='approved';
}
