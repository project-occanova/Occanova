import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileOtpHash,normalizeIndianMobile,sendMobileOtp} from '../src/lib/mobile-otp';
import {hasMobileOtp} from '../src/lib/config';
import {registerSchema} from '../src/lib/validation';

test('Indian vendor mobile numbers are stored in E.164 format',()=>{
  assert.equal(normalizeIndianMobile('98765 43210'),'+919876543210');
  assert.equal(normalizeIndianMobile('+91 98765-43210'),'+919876543210');
  assert.equal(normalizeIndianMobile('12345 67890'),'');
  const registration=registerSchema.parse({email:'vendor@example.com',phone:'9876543210',password:'secure-passphrase',consent:true});
  assert.equal(registration.phone,'+919876543210');
});

test('2Factor sends the one-time code with the approved template',async()=>{
  const original={key:process.env.TWOFACTOR_API_KEY,template:process.env.TWOFACTOR_TEMPLATE_NAME,fetch:globalThis.fetch};
  try{
    process.env.TWOFACTOR_API_KEY='test-api-key';process.env.TWOFACTOR_TEMPLATE_NAME='OCCANOVA_OTP';
    assert.equal(hasMobileOtp(),true);
    globalThis.fetch=(async(input,init)=>{
      assert.equal(input,'https://2factor.in/API/V1/OTP/SEND');
      assert.equal(init?.method,'POST');
      assert.equal((init?.headers as Record<string,string>)['X-API-Key'],'test-api-key');
      assert.deepEqual(JSON.parse(String(init?.body)),{to:'+919876543210',template_name:'OCCANOVA_OTP',var1:'123456'});
      return Response.json({status:'sent',session_id:'test-session'});
    }) as typeof fetch;
    await sendMobileOtp('+919876543210','123456');
    globalThis.fetch=(async()=>Response.json({status:'failed'},{status:400})) as typeof fetch;
    await assert.rejects(sendMobileOtp('+919876543210','123456'),/could not be sent/);
  }finally{
    globalThis.fetch=original.fetch;
    if(original.key===undefined)delete process.env.TWOFACTOR_API_KEY;else process.env.TWOFACTOR_API_KEY=original.key;
    if(original.template===undefined)delete process.env.TWOFACTOR_TEMPLATE_NAME;else process.env.TWOFACTOR_TEMPLATE_NAME=original.template;
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
