import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {checkPayment,gatewayFailure,orderInput,paymentInput,paymentsConfigured,type GatewayPayment} from '../src/lib/payments';
import type {PaymentOrder} from '../src/lib/types';
const secret='fixture-secret';
const order:PaymentOrder={id:'order_fixture',userId:'vendor1',keyId:'rzp_test_fixture',amount:19900,currency:'INR',receipt:'fixture',status:'created',createdAt:new Date().toISOString()};
const input={razorpay_order_id:order.id,razorpay_payment_id:'pay_fixture',razorpay_signature:createHmac('sha256',secret).update(`${order.id}|pay_fixture`).digest('hex')};
const captured:GatewayPayment={id:'pay_fixture',order_id:order.id,amount:order.amount,currency:'INR',status:'captured',captured:true};

test('order amounts require integer paise, minimum 100 and supported currency',()=>{
 for(const amount of [0,99,-100,100.1,NaN,10000001,'100'])assert.equal(orderInput.safeParse({amount}).success,false);
 assert.equal(orderInput.parse({amount:100}).currency,'INR');assert.equal(orderInput.safeParse({amount:100,currency:'USD'}).success,false);assert.equal(paymentInput.safeParse({}).success,false);
});
test('forged signatures and foreign orders never trigger gateway verification',async()=>{
 let reads=0;const fetch=async()=>{reads++;return captured;};
 await assert.rejects(checkPayment(order,'vendor1',{...input,razorpay_signature:'a'.repeat(64)},secret,fetch),/signature/);
 await assert.rejects(checkPayment(order,'vendor2',input,secret,fetch),/not found/);
 await assert.rejects(checkPayment(order,'vendor1',{...input,razorpay_order_id:'order_other'},secret,fetch),/not found/);
 assert.equal(reads,0);assert.equal(order.status,'created');
});
test('valid signatures still require the expected gateway payment, amount, currency and capture',async()=>{
 for(const payment of [{...captured,order_id:'order_other'},{...captured,id:'pay_other'},{...captured,amount:100},{...captured,currency:'USD'},{...captured,captured:false},{...captured,status:'failed'}])await assert.rejects(checkPayment(order,'vendor1',input,secret,async()=>payment));
 assert.equal(await checkPayment(order,'vendor1',input,secret,async()=>({...captured,status:'authorized',captured:false})),false);
 assert.equal(await checkPayment(order,'vendor1',input,secret,async()=>captured),true);assert.equal(order.status,'created');
});
test('paid order verification is idempotent and rejects a second payment',async()=>{
 const paid={...order,status:'paid' as const,paymentId:input.razorpay_payment_id};
 assert.equal(await checkPayment(paid,'vendor1',input,secret,async()=>{throw Error('Unexpected fetch');}),true);
 const other={...input,razorpay_payment_id:'pay_other',razorpay_signature:createHmac('sha256',secret).update(`${order.id}|pay_other`).digest('hex')};
 await assert.rejects(checkPayment(paid,'vendor1',other,secret,async()=>captured),/different payment/);
});
test('production refuses Test keys and gateway failures never expose provider payloads',()=>{
 const saved={...process.env};try{
  process.env.RAZORPAY_KEY_ID='rzp_test_fixture';process.env.RAZORPAY_KEY_SECRET=secret;process.env.VERCEL_ENV='production';assert.equal(paymentsConfigured(),false);
  process.env.RAZORPAY_KEY_ID='rzp_live_fixture';assert.equal(paymentsConfigured(),true);
  assert.equal(gatewayFailure({statusCode:401,secret}).status,401);assert.equal(gatewayFailure({statusCode:400,secret}).status,500);assert.equal(gatewayFailure({statusCode:500,error:{description:secret}}).message.includes(secret),false);
 }finally{for(const key of ['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','VERCEL_ENV'])if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});
