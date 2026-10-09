import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesLoginIdentity,matchesUnverifiedMobile} from '../src/lib/login-identity';

test('email works before mobile verification, while mobile login requires a verified number',()=>{
 const account={email:'Vendor@Example.com',phone:'98765 43210',phoneVerified:false};
 assert.equal(matchesLoginIdentity(account,'vendor@example.com'),true);
 assert.equal(matchesLoginIdentity(account,'+91 98765 43210'),false);
 assert.equal(matchesLoginIdentity({...account,phoneVerified:true},'919876543210'),true);
 assert.equal(matchesLoginIdentity({...account,phoneVerified:true},'foo9876543210@example.com'),false);
 assert.equal(matchesLoginIdentity({...account,phoneVerified:true},'9876543211'),false);
 assert.equal(matchesUnverifiedMobile(account,'+91 98765 43210'),true);
 assert.equal(matchesUnverifiedMobile({...account,phoneVerified:true},'9876543210'),false);
 assert.equal(matchesUnverifiedMobile(account,'9876543211'),false);
 assert.equal(matchesLoginIdentity({...account,phoneVerified:true},'call 9876543210'),false);
 assert.equal(matchesUnverifiedMobile(account,'vendor9876543210@example.com'),false);
});
