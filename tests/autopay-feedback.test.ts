import {test} from 'node:test';
import assert from 'node:assert/strict';
import {autopayIssue,checkoutFailureIssue,registrationStatusIssue,responseIssue} from '../src/lib/autopay-feedback';
import {openSubscriptionCheckout} from '../src/lib/razorpay-checkout';
import {razorpay,RazorpayRequestError} from '../src/lib/subscriptions';

test('bank timeout feedback explains recovery and retains safe payment references',()=>{
 const issue=checkoutFailureIssue({error:{reason:'request_timed_out',description:'Private gateway detail',metadata:{payment_id:'pay_timeout'}}},'sub_setup');
 assert.equal(issue.code,'payment_timeout');assert.equal(issue.recovery,'status');assert.equal(issue.paymentId,'pay_timeout');assert.equal(issue.subscriptionId,'sub_setup');
 assert.match(issue.message,/check authorization status first/);assert.equal(JSON.stringify(issue).includes('Private gateway detail'),false);
});
test('unknown gateway failures never claim a debit, bank rejection or account activation',()=>{
 const issue=checkoutFailureIssue({error:{reason:'new_provider_reason',description:'Secret raw response',metadata:{payment_id:'<script>invalid</script>'}}},'sub_valid');
 assert.equal(issue.code,'payment_failed');assert.equal(issue.paymentId,undefined);assert.equal(JSON.stringify(issue).includes('Secret raw response'),false);
 assert.equal(checkoutFailureIssue({},'sub_valid').code,'payment_failed');
});
test('expired checkout, pending bank processing and ended mandates have different recovery paths',()=>{
 const now=1800000000000;
 assert.equal(registrationStatusIssue('created',now/1000-1,now).code,'setup_expired');
 assert.equal(registrationStatusIssue('created',now/1000+60,now).code,'authorization_pending');
 assert.equal(registrationStatusIssue('expired').recovery,'setup');
 assert.equal(registrationStatusIssue('cancelled').code,'setup_ended');
 for(const status of ['pending','halted','unknown'])assert.equal(registrationStatusIssue(status).recovery,'support');
});
test('API recovery rejects prototype codes, unbounded cooldowns and invalid support references',()=>{
 assert.equal(responseIssue({code:'__proto__',reference:'private detail',retryAfter:100000},502).code,'confirmation_unavailable');
 assert.equal(responseIssue({code:'constructor'},401).code,'session_expired');
 assert.equal(responseIssue({code:'rate_limited',retryAfter:60},429).retryAfter,60);
 assert.equal(responseIssue({code:'rate_limited',retryAfter:-1},429).retryAfter,undefined);
 assert.equal(autopayIssue('payment_failed',{paymentId:'pay_'+ 'a'.repeat(81)}).paymentId,undefined);
 assert.equal(autopayIssue('gateway_unavailable',{reference:'12345678-1234-1234-1234-123456789abc'}).reference,'12345678-1234-1234-1234-123456789abc');
});
test('Checkout forwards failure detail but suppresses duplicate success and late failure callbacks',async()=>{
 const root=globalThis as unknown as {window?:unknown};const previous=root.window;
 let options:{handler:(value:unknown)=>void;modal:{ondismiss:()=>void}}|undefined;let failed:((value:unknown)=>void)|undefined;let confirmed=0,closed=0;const failures:unknown[]=[];
 root.window={Razorpay:class{constructor(input:typeof options){options=input;}open(){}on(_name:string,callback:typeof failed){failed=callback;}}};
 try{
  await openSubscriptionCheckout({key:'fixture',subscriptionId:'sub_fixture',email:'qa@example.com',phone:'9876543210',description:'Fixture',onConfirm:()=>confirmed++,onClose:()=>closed++,onFailure:value=>failures.push(value)});
  const failure={error:{reason:'request_timed_out',metadata:{payment_id:'pay_fixture'}}};failed!(failure);assert.deepEqual(failures,[failure]);
  options!.handler({razorpay_payment_id:'pay_fixture'});options!.handler({razorpay_payment_id:'pay_fixture'});failed!(failure);options!.modal.ondismiss();
  assert.equal(confirmed,1);assert.equal(failures.length,1);assert.equal(closed,0);
 }finally{if(previous===undefined)delete root.window;else root.window=previous;}
});
test('provider HTTP errors retain status without copying raw response details',async()=>{
 const original=globalThis.fetch,key=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
 process.env.RAZORPAY_KEY_ID='fixture';process.env.RAZORPAY_KEY_SECRET='fixture';
 globalThis.fetch=async()=>new Response('Private provider detail',{status:401});
 try{await assert.rejects(()=>razorpay('GET','plans/fixture'),error=>error instanceof RazorpayRequestError&&error.status===401&&!error.message.includes('Private provider detail'));}
 finally{globalThis.fetch=original;if(key===undefined)delete process.env.RAZORPAY_KEY_ID;else process.env.RAZORPAY_KEY_ID=key;if(secret===undefined)delete process.env.RAZORPAY_KEY_SECRET;else process.env.RAZORPAY_KEY_SECRET=secret;}
});
