import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {enquiryVendor,enquiryVendorNames,publicVendorProfile} from '../src/lib/directory';

test('public vendor payloads exclude internal fields, documents and future private fields',()=>{
  const vendor={...initialState().vendors[0],userId:'private-account',owner:'Private owner',
    remarks:'Private review',documents:['/api/media?key=private-document'],futureSecret:'secret'};
  const result=publicVendorProfile(vendor);
  for(const key of ['userId','owner','remarks','documents','status','published','priority','featuredStart','featuredEnd','futureSecret']){
    assert.equal(Object.hasOwn(result,key),false,`${key} must stay server-side`);
  }
  assert.equal(result.name,vendor.name);
  assert.deepEqual(result.gallery,vendor.gallery);
});

test('public enquiry form receives only the fields needed to submit an enquiry',()=>{
  const vendor=initialState().vendors[0];
  assert.deepEqual(enquiryVendor(vendor),{id:vendor.id,service:vendor.service,category:vendor.category});
});

test('enquiry tables receive only names referenced by their authorized rows',()=>{
  const vendors=initialState().vendors;
  assert.deepEqual(enquiryVendorNames(vendors,[]),[]);
  assert.deepEqual(enquiryVendorNames(vendors,[{vendorId:vendors[2].id},{vendorId:vendors[2].id}]),[{id:vendors[2].id,name:vendors[2].name}]);
});
