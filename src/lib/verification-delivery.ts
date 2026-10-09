export type VerificationDelivery={state:'delivered'|'pending'|'failed'|'opened'|'unknown';event:string;message:string};

export class ResendLookupError extends Error{
 constructor(public status:number){super(`Resend status lookup unavailable (HTTP ${status}).`);}
}

export function verificationDelivery(event:string):VerificationDelivery{
 if(event==='delivered')return {state:'delivered',event,message:'Recipient mail server accepted the message. Ask the vendor to check Inbox, Spam and Promotions; this does not prove inbox placement.'};
 if(event==='opened'||event==='clicked')return {state:'opened',event,message:'The recipient interacted with this email. If verification is unfinished, ask them to open the link and press Verify email.'};
 if(['bounced','bounced_transient','bounced_permanent','bounced_undetermined','suppressed','failed','complained'].includes(event))return {state:'failed',event,message:'Resend could not deliver this email. Check the recipient address and the email event in Resend; repeated resends may be suppressed.'};
 if(['sent','queued','delivery_delayed','received'].includes(event))return {state:'pending',event,message:'Resend has not confirmed delivery yet. Check again later or inspect the event in Resend.'};
 return {state:'unknown',event:'unknown',message:'Resend did not return a recognised delivery event. Check the email in Resend.'};
}

export async function lookupVerificationDelivery(providerId:string,recipient:string,apiKey:string):Promise<VerificationDelivery>{
 if(!/^[a-zA-Z0-9_-]{6,80}$/.test(providerId))throw Error('Invalid provider reference.');
 const response=await fetch(`https://api.resend.com/emails/${providerId}`,{headers:{Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(8000),cache:'no-store'});
 if(!response.ok)throw new ResendLookupError(response.status);
 const data=await response.json() as {id?:unknown;to?:unknown;last_event?:unknown};
 if(data.id!==providerId||!Array.isArray(data.to)||!data.to.some(value=>typeof value==='string'&&value.toLowerCase()===recipient.toLowerCase()))throw Error('The provider response did not match this recipient.');
 return verificationDelivery(typeof data.last_event==='string'?data.last_event:'');
}
