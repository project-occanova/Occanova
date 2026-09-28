import {redirect} from 'next/navigation';
import {Header,Footer,PreviewNotice} from '@/components/ui';
import {RegistrationAutopay} from '@/components/registration-autopay';
import {currentRegistration} from '@/lib/registration-session';
import {currentUser} from '@/lib/auth';
import {billingEnabled} from '@/lib/subscriptions';
export const dynamic='force-dynamic';
export const metadata={title:'Complete vendor registration',robots:{index:false,follow:false,noarchive:true}};
export default async function CompleteRegistration(){
 const user=await currentUser();if(user)redirect(user.role==='admin'?'/admin':'/dashboard');
 const pending=await currentRegistration();if(!pending)redirect('/login');
 return <><Header/><main id="main" className="container auth-layout"><div className="auth-intro"><img className="full-logo" src="/occanova-logo.jpg" alt="Occanova — Your event, your way."/><h1>Your business starts here.</h1><p>One final step: authorize AutoPay to activate your vendor account and begin your trial.</p></div><div className="panel auth-panel"><h2>Finish your registration</h2><RegistrationAutopay plan={pending.plan} email={pending.email} phone={pending.phone} enabled={billingEnabled()} trialEndsAt={pending.subscription?.trialEndsAt} hasCheckout={Boolean(pending.subscription?.gatewayId)} testMode={process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')}/></div></main><Footer/><PreviewNotice/></>;
}
