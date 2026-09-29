export async function authRequest(action:'login'|'verify'|'resend',body:unknown){
 const response=await fetch(`/api/auth/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>{throw Error('The request could not be completed. Please try again or contact info@occanova.com.');});
 if(!response.ok)throw Error(result.error||'Please try again. If the problem continues, contact info@occanova.com.');
 return result;
}
