import type {State} from './types';

export function issuePasswordReset(state:State,email:string,hash:string,now=Date.now()){
 const account=state.users.find(user=>user.email===email)||state.registrations.find(row=>row.email===email&&!row.completedUserId);
 if(!account)return false;
 // Keep earlier delivered links valid until one is used successfully.
 state.tokens=state.tokens.filter(token=>token.expires>now);
 state.tokens.push({hash,userId:account.id,kind:'reset',expires:now+1800000});
 return true;
}
export function revokePasswordReset(state:State,hash:string){state.tokens=state.tokens.filter(row=>!(row.hash===hash&&row.kind==='reset'));}
export function resetAccountPassword(state:State,hash:string,passwordHash:string,now=Date.now()){
 const token=state.tokens.find(row=>row.hash===hash&&row.kind==='reset'&&row.expires>now);
 if(!token)throw Error('This reset link is invalid or expired.');
 const pending=state.registrations.find(row=>row.id===token.userId&&!row.completedUserId);
 const account=state.users.find(user=>user.id===token.userId)||pending;
 if(!account)throw Error('This reset link is invalid or expired.');
 account.passwordHash=passwordHash;
 if(pending)pending.sessionHash=undefined;
 state.sessions=state.sessions.filter(row=>row.userId!==token.userId);
 state.tokens=state.tokens.filter(row=>!(row.userId===token.userId&&row.kind==='reset'));
}
