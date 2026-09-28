import {cookies} from 'next/headers';
import {cookieOptions,digest,token} from './auth';
import {mutate,readState} from './store';

export const registrationCookie='occanova_registration';
export const registrationCookieOptions={...cookieOptions,maxAge:86400};
export async function currentRegistration(){
 const value=(await cookies()).get(registrationCookie)?.value;
 if(!value)return null;
 return (await readState()).registrations.find(row=>row.verified&&row.sessionHash===digest(value)&&row.expires>Date.now())??null;
}
export async function finishRegistrationSession(userId:string){
 const value=token();
 await mutate(state=>{
  if(!state.users.some(user=>user.id===userId&&user.role==='vendor'&&user.verified))throw Error('Account activation is incomplete.');
  state.sessions=state.sessions.filter(session=>session.expires>Date.now());
  state.sessions.push({hash:digest(value),userId,expires:Date.now()+7*86400000});
  state.registrations=state.registrations.filter(row=>row.completedUserId!==userId);
 });
 const jar=await cookies();jar.set('occanova_session',value,cookieOptions);jar.delete(registrationCookie);
}
