import {redirect} from 'next/navigation';
import {CustomerAuthShell} from '@/components/customer-auth-shell';
import {CustomerRegisterForm} from '@/components/customer-auth';
import {currentUser} from '@/lib/auth';
import {hasEmail,localPreview,mobileOtpEnabled,publicIntakeEnabled,readOnlyDeployment} from '@/lib/config';

export const metadata={title:'Create a customer account',robots:{index:false,follow:false,noarchive:true}};
export default async function CustomerRegister(){
 const user=await currentUser();if(user?.role==='customer'&&user.verified&&user.phoneVerified)redirect('/customer');
 const available=!readOnlyDeployment()&&publicIntakeEnabled()&&(hasEmail()||localPreview())&&mobileOtpEnabled();
 return <CustomerAuthShell title="Find the right people for your event." subtitle="Save vendors, keep your enquiries together, and plan with confidence." heading="Create a customer account">{available?<CustomerRegisterForm/>:<p className="notice">Customer signup is temporarily unavailable while email or mobile verification is being prepared. Please try again shortly.</p>}</CustomerAuthShell>;
}
