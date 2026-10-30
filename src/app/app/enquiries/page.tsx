import Link from 'next/link';
import {ArrowRight,ChevronDown,MessageSquare} from 'lucide-react';
import {currentUser} from '@/lib/auth';
import {customerEnquiries} from '@/lib/customer';
import {publicVendors} from '@/lib/directory';
import {readState} from '@/lib/store';
import type {Enquiry} from '@/lib/types';

export const metadata={title:'Your enquiries',robots:{index:false,follow:false,noarchive:true}};
export const dynamic='force-dynamic';

const statusLabel:Record<Enquiry['status'],string>={new:'Sent',contacted:'Vendor contacted',closed:'Closed'};
const eventDate=(date:string)=>new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const sentDate=(date:string)=>new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});

export default async function AppEnquiries(){
 const user=await currentUser();
 const ready=user?.role==='customer'&&user.verified&&user.phoneVerified;
 const state=ready?await readState():null;
 const enquiries=state&&user?customerEnquiries(state.enquiries,user.id):[];
 const names=new Map(state?.vendors.map(vendor=>[vendor.id,vendor.name])??[]);
 const publicProfiles=new Map(state?publicVendors(state.vendors,{},state.users).filter(vendor=>!vendor.sample).map(vendor=>[vendor.id,vendor.slug]):[]);
 return <main id="main" className="app-main app-enquiries-page"><div className="app-page-heading"><span className="app-eyebrow">YOUR EVENT PLANS</span><h1>Your enquiries.</h1><p>Keep track of the requests you sent to Occanova vendors.</p></div>
  {ready?(enquiries.length?<><div className="app-results-heading"><strong>{enquiries.length} {enquiries.length===1?'enquiry':'enquiries'} sent</strong><Link href="/app/vendors">Find more vendors</Link></div><div className="app-enquiry-list">{enquiries.map(enquiry=>{const slug=publicProfiles.get(enquiry.vendorId);return <article key={enquiry.id} className="app-enquiry-card"><div className="app-enquiry-card-head"><div><span className="app-eyebrow">VENDOR ENQUIRY</span><h2>{names.get(enquiry.vendorId)||'Vendor unavailable'}</h2></div><span className={`app-enquiry-status ${enquiry.status}`}>{statusLabel[enquiry.status]}</span></div><dl className="app-enquiry-facts"><div><dt>Event date</dt><dd><time dateTime={enquiry.date}>{eventDate(enquiry.date)}</time></dd></div><div><dt>Location</dt><dd>{enquiry.city}</dd></div><div><dt>Service</dt><dd>{enquiry.service}</dd></div></dl><details className="app-enquiry-message"><summary>View your message <ChevronDown size={16} aria-hidden="true"/></summary><p>{enquiry.message}</p><small>Contact shared: {enquiry.contact}</small></details><div className="app-enquiry-card-foot"><small>Sent <time dateTime={enquiry.createdAt}>{sentDate(enquiry.createdAt)}</time></small>{slug&&<Link href={`/app/vendors/${slug}`}>View vendor <ArrowRight size={16} aria-hidden="true"/></Link>}</div></article>;})}</div><p className="app-enquiry-help">Vendors reply using the contact details in your enquiry. This screen tracks its status; it is not a chat inbox.</p></>:<div className="app-empty"><MessageSquare size={28} aria-hidden="true"/><h2>No enquiries yet.</h2><p>Open a vendor profile and send your first enquiry. It will appear here.</p><Link className="button" href="/app/vendors">Find a vendor <ArrowRight size={17} aria-hidden="true"/></Link></div>):user?.role==='customer'?<div className="app-empty"><h2>Finish setting up your account.</h2><p>Verify your email and mobile number before viewing your enquiries.</p><Link className="button" href="/customer/login?next=%2Fapp%2Fenquiries">Continue verification <ArrowRight size={17} aria-hidden="true"/></Link></div>:user?<div className="app-empty"><h2>Enquiries belong to customer accounts.</h2><p>{user.role==='vendor'?'Open your vendor dashboard to manage requests from customers.':'Open Admin Studio to review platform activity.'}</p><Link className="button" href={user.role==='vendor'?'/dashboard':'/admin'}>{user.role==='vendor'?'Open vendor dashboard':'Open Admin Studio'} <ArrowRight size={17} aria-hidden="true"/></Link></div>:<div className="app-empty"><MessageSquare size={28} aria-hidden="true"/><h2>Your requests, together.</h2><p>Sign in or create a free customer account to track your vendor enquiries.</p><div className="app-saved-actions"><Link className="button" href="/customer/login?next=%2Fapp%2Fenquiries">Customer login</Link><Link className="button outline" href="/customer/register">Create account</Link></div></div>}
 </main>;
}
