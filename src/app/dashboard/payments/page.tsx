import Link from 'next/link';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {Workspace} from '@/components/workspace';
import {PaymentCheckout} from '@/components/payment-checkout';
import {paymentsEnabled} from '@/lib/payments';
export const dynamic='force-dynamic';
export const metadata={title:'One-time payment',robots:{index:false,follow:false}};
export default async function PaymentsPage(){
 const user=await currentUser();if(!user||!user.verified)redirect('/login');if(user.role==='admin')redirect('/admin');
 return <Workspace email={user.email}><Link href="/dashboard#subscription" className="text-link">← Back to Plan & billing</Link><PaymentCheckout enabled={paymentsEnabled()} testMode={Boolean(process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_'))} email={user.email} phone={user.phone}/></Workspace>;
}
