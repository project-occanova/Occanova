import test from 'node:test';
import assert from 'node:assert/strict';
import {MobileOtpDeliveryError,consumeMobileChallenge,mobileOtpHash,normalizeIndianMobile,saveMobileChallenge,sendMobileOtp} from '../src/lib/mobile-otp';
import {initialState} from '../src/lib/seed';
import {hasMobileOtp,mobileOtpEnabled} from '../src/lib/config';
import {registerSchema} from '../src/lib/validation';

test('Indian vendor mobile numbers are stored in E.164 format',()=>{
  assert.equal(normalizeIndianMobile('98765 43210'),'+919876543210');
  assert.equal(normalizeIndianMobile('+91 98765-43210'),'+919876543210');
  assert.equal(normalizeIndianMobile('12345 67890'),'');
  const registration=registerSchema.parse({email:'vendor@example.com',phone:'9876543210',password:'secure-passphrase',plan:'starter',consent:true});
  assert.equal(registration.phone,'+919876543210');
});

test('a new registration OTP invalidates the old code, expires, and can be used only once',()=>{
  const state=initialState(),phone='+919876543210',now=Date.now();
  saveMobileChallenge(state,'pending-vendor',phone,'123456',now);
  assert.equal(consumeMobileChallenge(state,'pending-vendor',phone,'000000',now+1),false);
  saveMobileChallenge(state,'pending-vendor',phone,'654321',now+2);
  assert.equal(consumeMobileChallenge(state,'pending-vendor',phone,'123456',now+3),false);
  assert.equal(consumeMobileChallenge(state,'pending-vendor',phone,'654321',now+10*60*1000+2),false);
  assert.equal(consumeMobileChallenge(state,'pending-vendor',phone,'654321',now+3),true);
  assert.equal(consumeMobileChallenge(state,'pending-vendor',phone,'654321',now+4),false);
});

test('2Factor sends the one-time code with the approved template',async()=>{
  const original={key:process.env.TWOFACTOR_API_KEY,template:process.env.TWOFACTOR_TEMPLATE_NAME,fetch:globalThis.fetch};
  try{
    process.env.TWOFACTOR_API_KEY='test-api-key';process.env.TWOFACTOR_TEMPLATE_NAME='OCCANOVA_OTP';
    assert.equal(hasMobileOtp(),true);
    globalThis.fetch=(async(input,init)=>{
      assert.equal(input,'https://2factor.in/API/V1/test-api-key/SMS/+919876543210/123456/OCCANOVA_OTP');
      assert.equal(init?.method,undefined);
      return Response.json({Status:'Success',Details:'test-session'});
    }) as typeof fetch;
    await sendMobileOtp('+919876543210','123456');
    delete process.env.TWOFACTOR_TEMPLATE_NAME;
    globalThis.fetch=(async(input)=>{
      assert.equal(input,'https://2factor.in/API/V1/test-api-key/SMS/+919876543210/123456');
      return Response.json({Status:'Success',Details:'default-template-session'});
    }) as typeof fetch;
    assert.equal(hasMobileOtp(),true);
    await sendMobileOtp('+919876543210','123456');
    globalThis.fetch=(async()=>Response.json({status:'failed'},{status:400})) as typeof fetch;
    await assert.rejects(sendMobileOtp('+919876543210','123456'),MobileOtpDeliveryError);
  }finally{
    globalThis.fetch=original.fetch;
    if(original.key===undefined)delete process.env.TWOFACTOR_API_KEY;else process.env.TWOFACTOR_API_KEY=original.key;
    if(original.template===undefined)delete process.env.TWOFACTOR_TEMPLATE_NAME;else process.env.TWOFACTOR_TEMPLATE_NAME=original.template;
  }
});

test('mobile verification can be exercised in local preview without SMS credentials, but production stays gated',()=>{
  const original={preview:process.env.LOCAL_PREVIEW,vercel:process.env.VERCEL,key:process.env.TWOFACTOR_API_KEY,template:process.env.TWOFACTOR_TEMPLATE_NAME,enabled:process.env.MOBILE_OTP_ENABLED};
  try{
    process.env.LOCAL_PREVIEW='true';delete process.env.VERCEL;delete process.env.TWOFACTOR_API_KEY;delete process.env.TWOFACTOR_TEMPLATE_NAME;delete process.env.MOBILE_OTP_ENABLED;
    assert.equal(mobileOtpEnabled(),true);
    process.env.VERCEL='1';
    assert.equal(mobileOtpEnabled(),false);
    process.env.TWOFACTOR_API_KEY='test-api-key';process.env.MOBILE_OTP_ENABLED='true';
    assert.equal(mobileOtpEnabled(),true);
  }finally{
    for(const [key,value] of Object.entries({LOCAL_PREVIEW:original.preview,VERCEL:original.vercel,TWOFACTOR_API_KEY:original.key,TWOFACTOR_TEMPLATE_NAME:original.template,MOBILE_OTP_ENABLED:original.enabled})){
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
});

test('mobile OTP hashes bind the code to the vendor and phone',()=>{
  const original=process.env.TWOFACTOR_API_KEY;
  try{
    process.env.TWOFACTOR_API_KEY='test-api-key';
    const hash=mobileOtpHash('vendor-1','+919876543210','123456');
    assert.equal(hash,mobileOtpHash('vendor-1','+919876543210','123456'));
    assert.notEqual(hash,mobileOtpHash('vendor-2','+919876543210','123456'));
    assert.notEqual(hash,mobileOtpHash('vendor-1','+919876543211','123456'));
    assert.notEqual(hash,mobileOtpHash('vendor-1','+919876543210','654321'));
    assert.equal(hash.includes('123456'),false);
  }finally{if(original===undefined)delete process.env.TWOFACTOR_API_KEY;else process.env.TWOFACTOR_API_KEY=original;}
});
