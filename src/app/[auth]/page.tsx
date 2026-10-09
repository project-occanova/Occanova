import {notFound} from 'next/navigation';
import {Header,Footer,PreviewNotice} from '@/components/ui';
import {VendorLoginForm} from '@/components/vendor-login-form';
import {VendorRegistrationForm} from '@/components/vendor-registration-form';
import {EmailVerificationForm} from '@/components/email-verification-form';
import {PasswordRecoveryForm} from '@/components/password-recovery-form';
import {LegacyRegistrationForm} from '@/components/legacy-registration-form';
import {localPreview,publicIntakeEnabled,readOnlyDeployment} from '@/lib/config';
import {billingEnabled} from '@/lib/subscriptions';
const modes={'login':['Welcome back.','Your business. Your next chapter.','login'],'register':['Good things start here.','Join the people behind unforgettable celebrations.','register'],'forgot-password':['Let’s get you back in.','Enter the email associated with your account.','forgot'],'resend-verification':['Check your inbox.','Request a fresh vendor verification link.','resend'],'reset-password':['A fresh start.','Choose a new password for your account.','reset'],'verify':['Verify your email.','Verify your email to start your Occanova journey.','verify']} as const;
export const metadata={robots:{index:false,follow:false,noarchive:true}};
export default async function Auth({params,searchParams}:{params:Promise<{auth:string}>;searchParams:Promise<{token?:string;email?:string;portal?:string}>}){
 const [{auth},query]=await Promise.all([params,searchParams]);if(!Object.hasOwn(modes,auth))notFound();
 const [title,subtitle,mode]=modes[auth as keyof typeof modes];const subscriptionsEnabled=billingEnabled();const initialEmail=query.email?.slice(0,160);
 const readOnly=(mode==='register'&&(!localPreview()||process.env.SUBSCRIPTIONS_ENABLED==='true')&&!subscriptionsEnabled)||readOnlyDeployment()||(mode==='register'&&!publicIntakeEnabled());
 let form;
 if(readOnly)form=<div className="notice">Account services are temporarily unavailable. Please try again later or <a href="mailto:info@occanova.com">contact support</a>.</div>;
 else if(mode==='login')form=<VendorLoginForm key={initialEmail||mode} initialEmail={initialEmail}/>;
 else if(mode==='forgot'||mode==='reset')form=<PasswordRecoveryForm key={query.token||initialEmail||mode} mode={mode} token={query.token} initialEmail={initialEmail} portal={query.portal==='customer'?'customer':'vendor'}/>;
 else if(mode==='verify'||mode==='resend')form=<EmailVerificationForm key={query.token||initialEmail||mode} mode={mode} token={query.token} initialEmail={initialEmail}/>;
 else if(subscriptionsEnabled)form=<VendorRegistrationForm/>;
 else form=<LegacyRegistrationForm initialEmail={initialEmail}/>;
 return <><Header/><main id="main" className="container auth-layout"><div className="auth-intro"><img className="full-logo" src="/occanova-logo.jpg" alt="Occanova — Your event, your way."/><h1>{title}</h1><p>{subtitle}</p></div><div className="panel auth-panel"><h2>{mode==='login'?'Vendor login':mode==='register'?(subscriptionsEnabled?'Start your vendor registration':'Create your vendor account'):mode==='verify'?'Email verification':mode==='resend'?'Resend verification email':mode==='forgot'?'Password recovery':'Reset your password'}</h2>{form}</div></main><Footer/><PreviewNotice/></>;
}
