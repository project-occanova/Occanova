import { randomUUID } from 'node:crypto';
import { mutate } from '../src/lib/store';
import { hashPassword } from '../src/lib/auth';
const email=process.env.ADMIN_EMAIL?.toLowerCase();const password=process.env.ADMIN_PASSWORD;
if(!email||!password||password.length<12)throw Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in your terminal environment.');
mutate(s=>{if(s.users.some(x=>x.email===email))throw Error('Account already exists');s.users.push({id:randomUUID(),email,phone:'',passwordHash:hashPassword(password),verified:true,role:'admin'});}).then(()=>console.log('Admin created. Sign in at /admin/login.'));
