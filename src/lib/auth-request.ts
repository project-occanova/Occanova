export class AuthRequestError extends Error{constructor(message:string,public status:number){super(message);}}
export async function authRequest(action:'login'|'register'|'verify'|'resend'|'forgot'|'reset',body:unknown){
 let response:Response;
 try{response=await fetch(`/api/auth/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});}
 catch{throw new AuthRequestError(action==='register'?'We could not confirm registration. It may have been saved. Check your email, or try logging in to resume before registering again.':action==='reset'?'We could not confirm the password change. Try logging in with your new password before requesting another reset link.':action==='verify'?'We could not confirm verification. Try logging in or request a verification status check before retrying.':action==='forgot'||action==='resend'?'The email request could not be confirmed. Check your inbox and spam folder before retrying.':'We could not reach Occanova. Check your connection and try again.',0);}
 const result=await response.json().catch(()=>{throw Error('The request could not be completed. Please try again or contact info@occanova.com.');});
 if(!response.ok)throw new AuthRequestError(result.error||'Please try again. If the problem continues, contact info@occanova.com.',response.status);
 return result;
}
