import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIndianMobile} from '../src/lib/mobile-otp';
import {registerSchema} from '../src/lib/validation';

test('Indian vendor mobile numbers are stored in E.164 format',()=>{
  assert.equal(normalizeIndianMobile('98765 43210'),'+919876543210');
  assert.equal(normalizeIndianMobile('+91 98765-43210'),'+919876543210');
  assert.equal(normalizeIndianMobile('12345 67890'),'');
  const registration=registerSchema.parse({email:'vendor@example.com',phone:'9876543210',password:'secure-passphrase',consent:true});
  assert.equal(registration.phone,'+919876543210');
});
