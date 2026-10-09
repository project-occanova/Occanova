import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {startRegistration} from '../src/lib/registration';
import {emailVerificationStatus,issueEmailVerification,recordVerificationEmail,registrationRecoveryExpiry,revokeEmailVerification,verificationRecoveryMessage,verifyEmail} from '../src/lib/email-verification';

const now=Date.parse('2026-09-29T10:00:00Z'),day=86400000;
function fixture(){
 const state=initialState();
 const pending=startRegistration(state,{email:'verify@example.com',phone:'+919876543210',passwordHash:'password-hash',plan:'starter',autopayConsent:true,verificationHash:'original',mobileVerificationRequired:true},now);
 return {state,pending};
}
test('resending preserves the original delivered link and its deadline',()=>{
 const {state,pending}=fixture();
 assert.equal(issueEmailVerification(state,pending.email,'resent',now+1000),true);
 assert.equal(pending.verificationHash,'original');assert.equal(pending.verificationExpires,now+day);
 const result=verifyEmail(state,'original','session',undefined,now+2000);
 assert.equal(result.issueSession,true);assert.equal(pending.verified,true);assert.equal(state.users.length,0);
});
test('an expired original link cannot be renewed by resending',()=>{
 const {state,pending}=fixture();
 issueEmailVerification(state,pending.email,'resent',now+day+1000);
 assert.throws(()=>verifyEmail(state,'original','session',undefined,now+day+2000),/expired/);
 assert.equal(pending.verified,false);
 assert.equal(verifyEmail(state,'resent','session',undefined,now+day+2000).issueSession,true);
});
test('a failed email only revokes its new link; earlier and concurrent links survive',()=>{
 const {state,pending}=fixture();
 issueEmailVerification(state,pending.email,'failed',now+1000);
 issueEmailVerification(state,pending.email,'concurrent',now+2000);
 revokeEmailVerification(state,'failed');
 assert.throws(()=>verifyEmail(state,'failed','session',undefined,now+3000),/invalid/);
 assert.equal(verifyEmail(state,'concurrent','session',undefined,now+3000).issueSession,true);
 assert.equal(verifyEmail(state,'original','attacker',undefined,now+4000).alreadyVerified,true);
 assert.equal(pending.sessionHash,'session');
});
test('used links never create or rotate a setup session in another browser',()=>{
 const {state,pending}=fixture();verifyEmail(state,'original','session',undefined,now+1000);
 assert.deepEqual(verifyEmail(state,'original','attacker',undefined,now+2000),{pending:false,alreadyVerified:true,issueSession:false});
 assert.equal(pending.sessionHash,'session');assert.equal(pending.expires,now+1000+day);
});
test('repeated verification in the existing setup session resumes safely',()=>{
 const {state,pending}=fixture();verifyEmail(state,'original','session',undefined,now+1000);
 assert.deepEqual(verifyEmail(state,'original','unused','session',now+2000),{pending:true,alreadyVerified:true,issueSession:false});
 assert.equal(pending.sessionHash,'session');
 assert.equal(verifyEmail(state,'original','unused','wrong-session',now+2000).pending,false);
});
test('all outstanding links become receipts after one link verifies',()=>{
 const {state,pending}=fixture();issueEmailVerification(state,pending.email,'resent',now+1000);
 verifyEmail(state,'resent','session',undefined,now+2000);
 for(const hash of ['original','resent'])assert.deepEqual(verifyEmail(state,hash,'attacker',undefined,now+3000),{pending:false,alreadyVerified:true,issueSession:false});
 assert.equal(pending.verificationHash,undefined);
});
test('verification receipts survive activation but do not grant account sessions',()=>{
 const {state,pending}=fixture();verifyEmail(state,'original','session',undefined,now+1000);
 state.users.push({id:pending.id,email:pending.email,phone:pending.phone,passwordHash:pending.passwordHash,role:'vendor',verified:true});
 state.registrations=[];
 assert.deepEqual(verifyEmail(state,'original','attacker',undefined,now+2000),{pending:false,alreadyVerified:true,issueSession:false});assert.equal(state.sessions.length,0);
});
test('legacy account verification is repeatable without granting login access',()=>{
 const state=initialState();state.users.push({id:'legacy',email:'legacy@example.com',phone:'+919876543210',passwordHash:'hash',role:'vendor',verified:false});
 state.tokens.push({hash:'original',userId:'legacy',kind:'verify',expires:now+day});
 issueEmailVerification(state,'legacy@example.com','resent',now+1000);
 assert.equal(verifyEmail(state,'original','unused',undefined,now+2000).issueSession,false);
 assert.equal(state.users[0].verified,true);
 assert.equal(verifyEmail(state,'resent','unused',undefined,now+3000).alreadyVerified,true);
 assert.equal(state.sessions.length,0);
});
test('unknown and already verified email addresses produce no verification token',()=>{
 const {state,pending}=fixture();pending.verified=true;
 assert.equal(issueEmailVerification(state,'unknown@example.com','unknown',now),false);
 assert.equal(issueEmailVerification(state,pending.email,'verified',now),false);assert.equal(state.tokens.length,0);
});
test('expired or invalid tokens cannot verify, including reset tokens',()=>{
 const {state,pending}=fixture();
 state.tokens.push({hash:'reset',userId:pending.id,kind:'reset',expires:now+day});
 for(const hash of ['invalid','reset','original'])assert.throws(()=>verifyEmail(state,hash,'session',undefined,now+day+1),/invalid or expired/);
 assert.equal(pending.verified,false);assert.equal(pending.sessionHash,undefined);
});
test('registration recovery lasts 30 days while verification and sessions expire after 24 hours',()=>{
 const {state,pending}=fixture();assert.equal(registrationRecoveryExpiry(pending),now+30*day);
 startRegistration(state,{email:'other@example.com',phone:'+919876543211',passwordHash:'hash',plan:'starter',autopayConsent:true,verificationHash:'other',mobileVerificationRequired:true},now+2*day);
 assert.ok(state.registrations.some(row=>row.id===pending.id));
 assert.equal(issueEmailVerification(state,pending.email,'expired-registration',now+31*day),false);
 assert.equal(pending.verified,false);
});
test('legacy pending registrations retain their original expiry while gaining recovery',()=>{
 const {state,pending}=fixture();delete pending.verificationExpires;delete pending.recoveryExpires;
 assert.equal(registrationRecoveryExpiry(pending),pending.expires+30*day);
 issueEmailVerification(state,pending.email,'resent',now+2*day);
 assert.equal(pending.verificationExpires,now+day);
 assert.throws(()=>verifyEmail(state,'original','session',undefined,now+2*day),/expired/);
});
test('delivery failure rollback cannot delete a link consumed during delivery',()=>{
 const {state,pending}=fixture();issueEmailVerification(state,pending.email,'delivered',now+1000);
 verifyEmail(state,'delivered','session',undefined,now+2000);revokeEmailVerification(state,'delivered');
 assert.equal(verifyEmail(state,'delivered','attacker',undefined,now+3000).alreadyVerified,true);
});
test('recovery distinguishes verified, unverified, missing and expired registrations without changing them',()=>{
 const {state,pending}=fixture();const before=JSON.stringify(state);
 assert.equal(emailVerificationStatus(state,' VERIFY@example.com ',now),'unverified');
 assert.equal(emailVerificationStatus(state,'unknown@example.com',now),'not_found');
 assert.equal(emailVerificationStatus(state,pending.email,now+31*day),'registration_expired');
 assert.equal(JSON.stringify(state),before);
 pending.verified=true;assert.equal(emailVerificationStatus(state,pending.email,now),'already_verified');
 assert.equal(emailVerificationStatus(state,pending.email,now+31*day),'registration_expired');
 assert.match(verificationRecoveryMessage('already_verified'),/already verified.*log in/);
 assert.match(verificationRecoveryMessage('not_found'),/No account/);assert.match(verificationRecoveryMessage('registration_expired'),/register again/);
});
test('activated accounts take precedence over stale pending records and issue no resend token',()=>{
 const {state,pending}=fixture();state.users.push({id:pending.id,email:pending.email,phone:pending.phone,passwordHash:'hash',role:'vendor',verified:true});
 assert.equal(emailVerificationStatus(state,pending.email,now),'already_verified');
 assert.equal(issueEmailVerification(state,pending.email,'unused',now),false);assert.equal(state.tokens.length,0);
});
test('legacy email casing is normalized consistently for status, token issuance and tracking',()=>{
 const {state,pending}=fixture();pending.email='Verify@Example.com';
 assert.equal(emailVerificationStatus(state,'verify@example.com',now),'unverified');assert.equal(issueEmailVerification(state,'verify@example.com','resent',now),true);
 recordVerificationEmail(state,'verify@example.com',{status:'accepted',attemptedAt:new Date(now).toISOString(),providerId:'ref'});
 assert.equal(pending.verificationEmail?.providerId,'ref');assert.equal(verifyEmail(state,'resent','session',undefined,now+1000).issueSession,true);
});
test('verification email references are private tracking data; a late failure cannot overwrite a newer acceptance',()=>{
 const {state,pending}=fixture();const accepted={status:'accepted' as const,attemptedAt:new Date(now+2000).toISOString(),providerId:'email-reference'};
 recordVerificationEmail(state,pending.email,accepted);
 recordVerificationEmail(state,pending.email,{status:'failed',attemptedAt:new Date(now+1000).toISOString()});
 assert.deepEqual(pending.verificationEmail,accepted);assert.equal(pending.verified,false);assert.equal(state.users.length,0);assert.equal(pending.sessionHash,undefined);
 recordVerificationEmail(state,pending.email,{status:'failed',attemptedAt:new Date(now+3000).toISOString()});assert.equal(pending.verificationEmail?.status,'failed');assert.equal(pending.verificationEmail?.providerId,undefined);
});
