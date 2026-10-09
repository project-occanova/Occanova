import {redirect} from 'next/navigation';
import {CustomerAuthShell} from '@/components/customer-auth-shell';
import {CustomerLoginForm} from '@/components/customer-auth';
import {currentUser} from '@/lib/auth';

export const metadata={title:'Customer login',robots:{index:false,follow:false,noarchive:true}};
export default async function CustomerLogin({searchParams}:{searchParams:Promise<{email?:string;next?:string}>}){
 const [user,query]=await Promise.all([currentUser(),searchParams]);if(user?.role==='customer'&&user.verified&&user.phoneVerified)redirect('/customer');
 return <CustomerAuthShell title="Welcome back." subtitle="Your saved vendors and event enquiries are waiting." heading="Customer login"><CustomerLoginForm initialEmail={query.email?.slice(0,160)} next={query.next?.slice(0,300)}/></CustomerAuthShell>;
}
