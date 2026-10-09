import {CustomerAuthShell} from '@/components/customer-auth-shell';
import {CustomerVerifyForm} from '@/components/customer-auth';

export const metadata={title:'Verify customer email',robots:{index:false,follow:false,noarchive:true}};
export default async function CustomerVerify({searchParams}:{searchParams:Promise<{token?:string;email?:string}>}){
 const query=await searchParams;
 return <CustomerAuthShell title="Verify your email." subtitle="One step closer to your Occanova customer account." heading="Email verification"><CustomerVerifyForm token={query.token} initialEmail={query.email?.slice(0,160)}/></CustomerAuthShell>;
}
