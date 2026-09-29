import Link from 'next/link';
import type {AutopayIssue} from '@/lib/autopay-feedback';

export function AutopayFeedback({issue,email}:{issue:AutopayIssue;email:string}){
 const references=[issue.paymentId,issue.subscriptionId,issue.reference].filter(Boolean);
 const subject=encodeURIComponent('Occanova AutoPay setup help');
 const body=encodeURIComponent(`Registered email: ${email}\nIssue: ${issue.title}\nReferences: ${references.join(', ')||'Unavailable'}\n\nPlease describe when the problem occurred. Do not include passwords, OTPs or bank details.`);
 return <div className="autopay-feedback" role="alert">
  <strong>{issue.title}</strong><p>{issue.message}</p>
  {references.length>0&&<p className="autopay-reference">Support reference: {references.join(' · ')}</p>}
  {issue.recovery==='login'&&<Link href={`/login?email=${encodeURIComponent(email)}`}>Log in to continue</Link>}
  <a href={`mailto:info@occanova.com?subject=${subject}&body=${body}`}>Contact support</a>
 </div>;
}
