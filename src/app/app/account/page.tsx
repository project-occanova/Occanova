import Link from 'next/link';
import {ArrowRight,Heart,MessageSquare,ShieldCheck,Store,UserRound} from 'lucide-react';
import {currentUser} from '@/lib/auth';

export const metadata={title:'Your account',robots:{index:false,follow:false,noarchive:true}};
export const dynamic='force-dynamic';

export default async function AppAccount(){
 const user=await currentUser();
 const customerReady=user?.role==='customer'&&user.verified&&user.phoneVerified;
 return <main id="main" className="app-main app-account-page">
  <div className="app-page-heading"><span className="app-eyebrow">YOUR OCCANOVA ACCOUNT</span><h1>{user?`Welcome, ${user.name?.split(' ')[0]||'back'}.`:'Make every connection count.'}</h1><p>{user?'Pick up where you left off.':'Sign in or create an account to keep your event plans and business details together.'}</p></div>
  {customerReady?<section className="app-account-grid" aria-label="Customer account">
   <Link href="/customer" className="app-account-card"><UserRound size={25} aria-hidden="true"/><h2>My dashboard</h2><p>See your account and event planning activity.</p><span>Open dashboard <ArrowRight size={16} aria-hidden="true"/></span></Link>
   <Link href="/customer#saved" className="app-account-card"><Heart size={25} aria-hidden="true"/><h2>Saved vendors</h2><p>Return to the businesses on your shortlist.</p><span>View saved vendors <ArrowRight size={16} aria-hidden="true"/></span></Link>
   <Link href="/customer#enquiries" className="app-account-card"><MessageSquare size={25} aria-hidden="true"/><h2>My enquiries</h2><p>Follow the requests you sent while signed in.</p><span>View enquiries <ArrowRight size={16} aria-hidden="true"/></span></Link>
  </section>:user?.role==='vendor'?<section className="app-account-grid" aria-label="Vendor account">
   <Link href="/dashboard" className="app-account-card"><Store size={25} aria-hidden="true"/><h2>Vendor dashboard</h2><p>Manage your business profile and review status.</p><span>Open dashboard <ArrowRight size={16} aria-hidden="true"/></span></Link>
   <Link href="/dashboard#enquiries" className="app-account-card"><MessageSquare size={25} aria-hidden="true"/><h2>Enquiries</h2><p>Respond to customers interested in your services.</p><span>View enquiries <ArrowRight size={16} aria-hidden="true"/></span></Link>
   <Link href="/dashboard#account" className="app-account-card"><ShieldCheck size={25} aria-hidden="true"/><h2>Account & security</h2><p>Keep your business account details up to date.</p><span>Manage account <ArrowRight size={16} aria-hidden="true"/></span></Link>
  </section>:user?.role==='admin'?<section className="app-account-grid" aria-label="Admin account"><Link href="/admin" className="app-account-card"><ShieldCheck size={25} aria-hidden="true"/><h2>Admin Studio</h2><p>Review vendors and manage the platform.</p><span>Open Admin Studio <ArrowRight size={16} aria-hidden="true"/></span></Link></section>:<section className="app-account-grid" aria-label="Choose an account">
   <div className="app-account-card"><UserRound size={25} aria-hidden="true"/><h2>Planning an event?</h2><p>Save vendors and keep your enquiries together. Verify your email and mobile number to get started.</p><div className="app-account-actions"><Link href="/customer/login" className="button">Customer login</Link><Link href="/customer/register" className="button outline">Create account</Link></div></div>
   <div className="app-account-card"><Store size={25} aria-hidden="true"/><h2>Running a business?</h2><p>Manage your public profile, portfolio, enquiries and subscription in the vendor studio.</p><div className="app-account-actions"><Link href="/login" className="button">Vendor login</Link><Link href="/register" className="button outline">List your business</Link></div></div>
  </section>}
  <p className="app-account-help">Need help with verification or access? <a href="mailto:info@occanova.com">Contact Occanova support</a>.</p>
 </main>;
}
