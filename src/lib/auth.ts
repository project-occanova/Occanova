import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { readState } from './store';
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export function hashPassword(p:string){const salt=token();return `${salt}:${scryptSync(p,salt,64).toString('hex')}`;}
export function checkPassword(p:string,h:string){const [salt,key]=h.split(':');if(!salt||!key)return false;const a=Buffer.from(key,'hex'),b=scryptSync(p,salt,64);return a.length===b.length&&timingSafeEqual(a,b);}
export async function currentUser(){const value=(await cookies()).get('occanova_session')?.value;if(!value)return null;const s=await readState();const session=s.sessions.find(x=>x.hash===digest(value)&&x.expires>Date.now());return session?s.users.find(u=>u.id===session.userId)??null:null;}
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*7};
