import type {PendingRegistration,State,VerificationEmail} from './types';

const day=86400000;
export function registrationRecoveryExpiry(row:PendingRegistration){
 return row.recoveryExpires??row.expires+30*day;
}
export function registrationCanResume(row:PendingRegistration,now=Date.now()){
 return registrationRecoveryExpiry(row)>now||Boolean(row.subscription?.gatewayId);
}

export type EmailVerificationStatus='unverified'|'already_verified'|'not_found'|'registration_expired';
export function emailVerificationStatus(state:State,email:string,now=Date.now()):EmailVerificationStatus{
 const address=email.trim().toLowerCase();
 const user=state.users.find(row=>row.email.trim().toLowerCase()===address);
 if(user)return user.verified?'already_verified':'unverified';
 const pending=state.registrations.find(row=>row.email.trim().toLowerCase()===address&&!row.completedUserId);
 if(!pending)return 'not_found';
 if(!registrationCanResume(pending,now))return 'registration_expired';
 return pending.verified?'already_verified':'unverified';
}

export function verificationRecoveryMessage(status:Exclude<EmailVerificationStatus,'unverified'>){
 return {already_verified:'Your email is already verified. You can log in now to continue.',not_found:'No account or unfinished registration was found for this email address. Check the spelling and use the email you registered with. If an earlier registration expired, start a new registration.',registration_expired:'Your unfinished registration has expired. Please register again to receive a new verification email.'}[status];
}

export function recordVerificationEmail(state:State,email:string,delivery:VerificationEmail){
 const address=email.trim().toLowerCase();
 const user=state.users.find(row=>row.email.trim().toLowerCase()===address);
 const pending=state.registrations.find(row=>row.email.trim().toLowerCase()===address&&!row.completedUserId);
 for(const subject of [user,pending])if(subject&&(!subject.verificationEmail||subject.verificationEmail.attemptedAt<=delivery.attemptedAt))subject.verificationEmail=delivery;
}

// Resending adds a separately expiring link; it never cancels a delivered link.
export function issueEmailVerification(state:State,email:string,hash:string,now=Date.now()){
 if(emailVerificationStatus(state,email,now)!=='unverified')return false;
 const address=email.trim().toLowerCase();
 const user=state.users.find(row=>row.email.trim().toLowerCase()===address&&!row.verified);
 const pending=state.registrations.find(row=>row.email.trim().toLowerCase()===address&&!row.verified&&!row.completedUserId&&registrationRecoveryExpiry(row)>now);
 const subject=user||pending;if(!subject)return false;
 state.tokens=state.tokens.filter(row=>row.expires>now);
 state.tokens.push({hash,userId:subject.id,kind:'verify',expires:now+day});
 if(pending){
  // Preserve the original link's deadline before extending registration recovery.
  pending.verificationExpires??=pending.expires;
  pending.expires=now+day;pending.recoveryExpires=now+30*day;
 }
 return true;
}

export function revokeEmailVerification(state:State,hash:string){
 state.tokens=state.tokens.filter(row=>!(row.hash===hash&&row.kind==='verify'&&!row.usedAt));
}

export function verifyEmail(state:State,hash:string,newSessionHash:string,currentSessionHash?:string,now=Date.now()):{pending:boolean;alreadyVerified:boolean;issueSession:boolean}{
 const link=state.tokens.find(row=>row.hash===hash&&row.kind==='verify'&&row.expires>now);
 const original=state.registrations.find(row=>row.verificationHash===hash&&(row.verificationExpires??row.expires)>now);
 const subjectId=link?.userId??original?.id;
 if(!subjectId)throw Error('This verification link is invalid or expired. Request a new link below.');
 const account=state.users.find(row=>row.id===subjectId);
 const pending=state.registrations.find(row=>row.id===subjectId&&!row.completedUserId);
 const subject=account||pending;
 if(!subject)throw Error('This verification link is no longer available. Log in, or start registration again.');
 if(subject.verified||link?.usedAt){
  // A consumed link confirms verification but must never create another session.
  return {pending:Boolean(pending&&pending.expires>now&&currentSessionHash&&pending.sessionHash===currentSessionHash),alreadyVerified:true,issueSession:false};
 }
 subject.verified=true;
 if(original&&!link)state.tokens.push({hash,userId:subjectId,kind:'verify',expires:original.verificationExpires??original.expires,usedAt:now});
 for(const row of state.tokens)if(row.userId===subjectId&&row.kind==='verify')row.usedAt=now;
 if(pending){
  // Retain only a receipt for the old link, not another login credential.
  if(pending.verificationHash&&pending.verificationHash!==hash)state.tokens.push({hash:pending.verificationHash,userId:subjectId,kind:'verify',expires:pending.verificationExpires??pending.expires,usedAt:now});
  pending.verificationHash=undefined;pending.verificationExpires=undefined;
  pending.sessionHash=newSessionHash;pending.expires=now+day;
  pending.recoveryExpires=now+30*day;
 }
 return {pending:Boolean(pending),alreadyVerified:false,issueSession:Boolean(pending)};
}
