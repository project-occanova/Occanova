import Link from 'next/link';
import {ArrowRight,Heart} from 'lucide-react';
import {SaveVendorButton} from '@/components/customer-actions';
import {VendorCard} from '@/components/ui';
import {currentUser} from '@/lib/auth';
import {publicVendors} from '@/lib/directory';
import {readPublicDirectory} from '@/lib/store';

export const metadata={title:'Saved vendors',robots:{index:false,follow:false,noarchive:true}};
export const dynamic='force-dynamic';

export default async function AppSavedVendors(){
 const user=await currentUser();
 const ready=user?.role==='customer'&&user.verified&&user.phoneVerified;
 const state=ready?await readPublicDirectory():null;
 const savedIds=new Set(user?.savedVendorIds??[]);
 const saved=state?publicVendors(state.vendors,{},state.users).filter(vendor=>!vendor.sample&&savedIds.has(vendor.id)):[];
 return <main id="main" className="app-main app-saved-page"><div className="app-page-heading"><span className="app-eyebrow">YOUR SHORTLIST</span><h1>Saved vendors.</h1><p>Keep the event professionals you like in one place.</p></div>
  {ready?(saved.length?<><div className="app-results-heading"><strong>{saved.length} {saved.length===1?'vendor':'vendors'} saved</strong><Link href="/app/vendors">Find more vendors</Link></div><div className="app-vendor-grid">{saved.map(vendor=><div key={vendor.id} className="app-saved-card"><VendorCard vendor={vendor} hrefBase="/app/vendors"/><SaveVendorButton vendorId={vendor.id} returnTo="/app/saved" initialSaved initiallyAuthenticated savedLabel="Remove from shortlist"/></div>)}</div></>:<div className="app-empty"><Heart size={28} aria-hidden="true"/><h2>Your shortlist is empty.</h2><p>Open a vendor profile and tap Save vendor. Your choices will appear here.</p><Link className="button" href="/app/vendors">Explore vendors <ArrowRight size={17} aria-hidden="true"/></Link></div>):user?.role==='customer'?<div className="app-empty"><h2>Finish setting up your account.</h2><p>Verify your email and mobile number before saving vendors.</p><Link className="button" href="/customer/login?next=%2Fapp%2Fsaved">Continue verification <ArrowRight size={17} aria-hidden="true"/></Link></div>:user?<div className="app-empty"><h2>Save vendors with a customer account.</h2><p>Your current account is for managing Occanova. Customer shortlists are separate.</p><Link className="button" href="/app/account">View account <ArrowRight size={17} aria-hidden="true"/></Link></div>:<div className="app-empty"><Heart size={28} aria-hidden="true"/><h2>Keep your favourites close.</h2><p>Sign in or create a free customer account to save vendors across India.</p><div className="app-saved-actions"><Link className="button" href="/customer/login?next=%2Fapp%2Fsaved">Customer login</Link><Link className="button outline" href="/customer/register">Create account</Link></div></div>}
 </main>;
}
