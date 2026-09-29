export type CheckoutFailure={error?:{code?:string;description?:string;source?:string;step?:string;reason?:string;metadata?:{payment_id?:string}}};
const messages={
 payment_timeout:{title:'Approval timed out',message:'The approval was not completed in time. Close Checkout and check authorization status first. If it is still awaiting approval, retry and approve the mandate promptly in your bank or UPI app.',recovery:'status'},
 payment_declined:{title:'Approval was declined',message:'Your payment provider declined this attempt. Close Checkout and check authorization status. If it is still awaiting approval, try a supported payment method or contact your bank.',recovery:'status'},
 payment_failed:{title:'Approval could not be completed',message:'We have not confirmed AutoPay approval. Close Checkout and check authorization status before trying again. If the problem continues, send the reference below to support.',recovery:'status'},
 setup_expired:{title:'AutoPay setup expired',message:'The 30-minute approval window has ended. Start fresh AutoPay setup, check the plan and first debit date, then approve it promptly in your bank or UPI app. Your registration is saved.',recovery:'setup'},
 setup_ended:{title:'Start new AutoPay setup',message:'The previous mandate has ended. Start new setup and review the plan and first debit date before approving. Any trial time already used is preserved.',recovery:'setup'},
 authorization_pending:{title:'Still awaiting approval',message:'Razorpay has not confirmed approval yet. If your bank app is still processing it, wait a moment and check again. Otherwise, reopen AutoPay setup and complete the approval.',recovery:'setup'},
 mandate_unavailable:{title:'This mandate needs support',message:'This mandate cannot activate registration in its current state. Contact support with the reference below so we can check it before you authorize another mandate.',recovery:'support'},
 session_expired:{title:'Log in to resume setup',message:'Your setup session has ended. Log in with your registered email and password to continue. Your saved registration does not need to be submitted again.',recovery:'login'},
 rate_limited:{title:'Please wait before retrying',message:'Too many requests were made in a short time. Wait 30 seconds before opening setup again, or one minute before checking authorization status again.',recovery:'wait'},
 setup_busy:{title:'Setup is already in progress',message:'Another setup request is still finishing. Wait up to two minutes, then check authorization status before retrying. Do not open another Checkout while approval is in progress.',recovery:'status'},
 confirmation_unavailable:{title:'Approval needs a status check',message:'We could not confirm the result. If you approved in your bank app, check authorization status before opening setup again. Your account activates only after Razorpay confirms approval.',recovery:'status'},
 confirmation_invalid:{title:'Approval could not be verified',message:'The Checkout confirmation could not be verified. Check authorization status to recover an approval already completed in your bank app. If this continues, contact support.',recovery:'status'},
 setup_unavailable:{title:'AutoPay is temporarily unavailable',message:'We cannot open AutoPay setup right now. Your registration is saved. Try again later or contact support if the problem continues.',recovery:'support'},
 gateway_unavailable:{title:'Payment service is temporarily unavailable',message:'We could not reach the payment service. Check authorization status if you already approved a mandate. Otherwise, wait a moment before trying setup again.',recovery:'status'},
 checkout_unavailable:{title:'Checkout could not open',message:'Razorpay Checkout could not load. Check your internet connection and allow checkout.razorpay.com, then try again. Your registration is saved.',recovery:'setup'},
 invalid_request:{title:'Check your setup details',message:'Select a plan and accept the AutoPay consent before continuing. If confirmation failed after bank approval, check authorization status.',recovery:'setup'},
} as const;
export type AutopayCode=keyof typeof messages;
export type AutopayIssue={code:AutopayCode;title:string;message:string;recovery:'status'|'setup'|'support'|'login'|'wait';paymentId?:string;subscriptionId?:string;reference?:string;retryAfter?:number};
export function autopayIssue(code:AutopayCode,details:{paymentId?:unknown;subscriptionId?:unknown;reference?:unknown}={}):AutopayIssue{
 const id=(value:unknown,pattern:RegExp)=>typeof value==='string'&&pattern.test(value)?value:undefined;
 return {code,...messages[code],paymentId:id(details.paymentId,/^pay_[A-Za-z0-9]{1,80}$/),subscriptionId:id(details.subscriptionId,/^sub_[A-Za-z0-9]{1,80}$/),reference:id(details.reference,/^[a-f0-9-]{36}$/)};
}
export function responseIssue(result:{code?:unknown;reference?:unknown;subscriptionId?:unknown;retryAfter?:unknown},httpStatus:number){
 const code=typeof result.code==='string'&&Object.hasOwn(messages,result.code)?result.code as AutopayCode:httpStatus===401?'session_expired':httpStatus===429?'rate_limited':'confirmation_unavailable';
 return {...autopayIssue(code,result),retryAfter:typeof result.retryAfter==='number'&&Number.isInteger(result.retryAfter)&&result.retryAfter>0&&result.retryAfter<=120?result.retryAfter:undefined};
}
export function checkoutFailureIssue(response:CheckoutFailure,subscriptionId:string){
 const reason=response?.error?.reason;
 return autopayIssue(reason==='request_timed_out'?'payment_timeout':reason==='payment_declined'||reason==='payment_rejected'?'payment_declined':'payment_failed',{paymentId:response?.error?.metadata?.payment_id,subscriptionId});
}
export function registrationStatusIssue(status:string,expireBy?:number,now=Date.now()):AutopayIssue{
 if(status==='cancelled'||status==='completed')return autopayIssue('setup_ended');
 if(status==='expired'||(status==='created'&&expireBy!==undefined&&expireBy<=now/1000))return autopayIssue('setup_expired');
 return autopayIssue(status==='created'?'authorization_pending':'mandate_unavailable');
}
