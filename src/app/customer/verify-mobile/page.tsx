import {redirect} from 'next/navigation';
import {CustomerAuthShell} from '@/components/customer-auth-shell';
import {CustomerMobileForm} from '@/components/customer-auth';
import {currentUser} from '@/lib/auth';
import {currentCustomerSetup} from '@/lib/customer-session';

export const metadata={title:'Verify customer mobile number',robots:{index:false,follow:false,noarchive:true}};
export const dynamic='force-dynamic';
export default async function CustomerVerifyMobile(){
 const user=await currentUser();if(user?.role==='customer'&&user.verified&&user.phoneVerified)redirect('/customer');
 const setup=await currentCustomerSetup();if(!setup)redirect('/customer/login');
 return <CustomerAuthShell title="One last step." subtitle="Confirm your mobile number to finish creating your account." heading="Mobile verification"><CustomerMobileForm phone={setup.phone}/></CustomerAuthShell>;
}
