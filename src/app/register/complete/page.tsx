import {redirect} from 'next/navigation';
import {Header,Footer,PreviewNotice} from '@/components/ui';
import {RegistrationAutopay} from '@/components/registration-autopay';
import {RegistrationMobileVerification} from '@/components/registration-mobile-verification';
import {currentRegistration} from '@/lib/registration-session';
import {currentUser} from '@/lib/auth';
import {billingEnabled} from '@/lib/subscriptions';
import {mobileOtpEnabled} from '@/lib/config';
export const dynamic='force-dynamic';
export const metadata={title:'Complete vendor registration',robots:{index:false,follow:false,noarchive:true}};
export default async function CompleteRegistration(){
 const user=await currentUser();if(user)redirect(user.role==='admin'?'/admin':user.role==='customer'?'/customer':'/dashboard');
 const pending=await currentRegistration();if(!pending)redirect('/login');
 const needsMobile=Boolean(pending.mobileVerificationRequired&&!pending.phoneVerified);
 return <><Header/><main id="main" className="container auth-layout"><div className="auth-intro"><img className="full-logo" src="/occanova-logo.jpg" alt="Occanova — Your event, your way."/><h1>Your business starts here.</h1><p>{needsMobile?'Verify your mobile number, then authorize AutoPay to activate your vendor account.':'Authorize AutoPay to activate your vendor account and begin your trial.'}</p></div><div className="panel auth-panel"><h2>Finish your registration</h2>{needsMobile?<RegistrationMobileVerification plan={pending.plan} email={pending.email} phone={pending.phone} enabled={mobileOtpEnabled()}/>:<RegistrationAutopay plan={pending.plan} email={pending.email} phone={pending.phone} mobileVerified={Boolean(pending.phoneVerified)} enabled={billingEnabled()} trialEndsAt={pending.subscription?.trialEndsAt} hasCheckout={Boolean(pending.subscription?.gatewayId)} testMode={process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')}/>}</div></main><Footer/><PreviewNotice/></>;
}
