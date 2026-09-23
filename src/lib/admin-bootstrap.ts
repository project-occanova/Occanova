import {randomUUID} from 'node:crypto';
import {hashPassword} from './auth';
import {mutate,readState} from './store';

export async function ensureConfiguredAdmin(){
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password=process.env.ADMIN_PASSWORD;
  if(!email||!password||password.length<12)return false;
  const current=(await readState()).users.find(user=>user.email===email);
  if(current)return current.role==='admin';
  await mutate(state=>{
    const existing=state.users.find(user=>user.email===email);
    if(existing){if(existing.role!=='admin')throw Error('The configured administrator email belongs to a vendor account.');return;}
    state.users.push({id:randomUUID(),email,phone:'',passwordHash:hashPassword(password),verified:true,role:'admin'});
    state.audit.unshift({id:randomUUID(),actor:email,action:'Administrator account provisioned',target:email,remarks:'Created from the protected production configuration',at:new Date().toISOString()});
  });
  return true;
}
