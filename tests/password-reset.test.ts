import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/seed';
import {startRegistration,activateRegistration} from '../src/lib/registration';
import {issuePasswordReset,resetAccountPassword,revokePasswordReset} from '../src/lib/password-reset';

test('an unfinished verified signup can reset its password without activating an account',()=>{
 const state=initialState();const now=Date.now();const pending=startRegistration(state,{email:'pending@example.com',phone:'+919876543210',passwordHash:'old-hash',plan:'starter',autopayConsent:true,verificationHash:'verify',mobileVerificationRequired:true},now);
 pending.verified=true;pending.phoneVerified=true;pending.sessionHash='old-setup-session';
 assert.equal(issuePasswordReset(state,pending.email,'reset',now),true);
 resetAccountPassword(state,'reset','new-hash',now+1);
 assert.equal(state.users.length,0);assert.equal(pending.passwordHash,'new-hash');assert.equal(pending.sessionHash,undefined);assert.equal(pending.verified,true);assert.equal(state.tokens.length,0);
 assert.throws(()=>resetAccountPassword(state,'reset','another-hash',now+2),/invalid or expired/);
 pending.subscription={plan:'starter',status:'created',gatewayId:'sub_fixture',gatewayPlanId:'plan_fixture',trialEndsAt:new Date(now+86400000).toISOString(),updatedAt:new Date(now).toISOString()};
 const user=activateRegistration(state,pending.id,{id:'sub_fixture',plan_id:'plan_fixture',status:'authenticated',start_at:Math.floor((now+86400000)/1000),quantity:1,total_count:96,paid_count:0,notes:{occanova_registration_id:pending.id}},now+3);
 assert.equal(user.passwordHash,'new-hash');
});
test('failed or repeated reset sends preserve earlier links; successful use invalidates every reset link',()=>{
 const state=initialState(),now=Date.now();state.users.push({id:'user',email:'vendor@example.com',phone:'',passwordHash:'old',role:'vendor',verified:true});
 issuePasswordReset(state,'vendor@example.com','first',now);issuePasswordReset(state,'vendor@example.com','failed',now+1);revokePasswordReset(state,'failed');
 assert.deepEqual(state.tokens.map(row=>row.hash),['first']);issuePasswordReset(state,'vendor@example.com','second',now+2);
 assert.deepEqual(state.tokens.map(row=>row.hash),['first','second']);resetAccountPassword(state,'first','new',now+3);assert.equal(state.users[0].passwordHash,'new');assert.equal(state.tokens.length,0);
 assert.throws(()=>resetAccountPassword(state,'second','different',now+4),/invalid or expired/);
});
test('password resets expire, reject removed accounts and revoke prior account sessions',()=>{
 const state=initialState(),now=Date.now();
 state.users.push({id:'user',email:'vendor@example.com',phone:'',passwordHash:'old',role:'vendor',verified:true});
 state.sessions.push({hash:'session',userId:'user',expires:now+86400000});
 assert.equal(issuePasswordReset(state,'missing@example.com','absent',now),false);
 issuePasswordReset(state,'vendor@example.com','expired',now);
 assert.throws(()=>resetAccountPassword(state,'expired','new',now+1800000),/invalid or expired/);
 issuePasswordReset(state,'vendor@example.com','valid',now);
 resetAccountPassword(state,'valid','new',now+1);assert.equal(state.users[0].passwordHash,'new');assert.equal(state.sessions.length,0);
 state.tokens.push({hash:'removed',kind:'reset',userId:'removed-user',expires:now+10000});
 assert.throws(()=>resetAccountPassword(state,'removed','new',now+1),/invalid or expired/);
});
