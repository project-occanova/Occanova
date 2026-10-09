import Link from 'next/link';
import {redirect} from 'next/navigation';
import {ArrowRight,Heart,MapPin,Search} from 'lucide-react';
import {currentUser} from '@/lib/auth';
import {customerEnquiries} from '@/lib/customer';
import {money,publicVendors} from '@/lib/directory';
import {readState} from '@/lib/store';
import type {Enquiry,Vendor} from '@/lib/types';
import {CustomerLogout,CustomerProfileForm,SaveVendorButton} from '@/components/customer-actions';
import {Brand,Footer,PreviewNotice} from '@/components/ui';

export const metadata={title:'Your customer dashboard',robots:{index:false,follow:false,noarchive:true}};
export const dynamic='force-dynamic';

function VendorTile({vendor,saved}:{vendor:Vendor;saved:boolean}){
 const href=`/vendors/${vendor.slug}`;
 return <article className="customer-vendor-tile"><Link href={href} className="customer-vendor-photo"><img src={vendor.image||'/occanova-logo.jpg'} alt={`${vendor.name} portfolio`} loading="lazy"/></Link><div className="customer-vendor-copy"><div><span>{vendor.category}</span><Link href={href}><h3>{vendor.name}</h3></Link><p><MapPin size={15}/>{vendor.city}</p></div><div className="customer-vendor-foot"><span>From <strong>{money(vendor.price)}</strong></span><Link href={href}>View profile <ArrowRight size={15}/></Link></div><SaveVendorButton vendorId={vendor.id} returnTo={href} initialSaved={saved} initiallyAuthenticated/></div></article>;
}

const enquiryStatus:Record<Enquiry['status'],string>={new:'Sent',contacted:'Vendor contacted',closed:'Closed'};
export default async function CustomerDashboard(){
 const user=await currentUser();
 if(!user)redirect('/customer/login');
 if(user.role==='vendor')redirect('/dashboard');
 if(user.role==='admin')redirect('/admin');
 if(!user.verified||!user.phoneVerified)redirect('/customer/login');
 const state=await readState();
 const available=publicVendors(state.vendors,{},state.users).filter(vendor=>!vendor.sample);
 const savedIds=new Set(user.savedVendorIds??[]),saved=available.filter(vendor=>savedIds.has(vendor.id));
 const suggested=available.filter(vendor=>!savedIds.has(vendor.id)).slice(0,3);
 const enquiries=customerEnquiries(state.enquiries,user.id);
 const vendorNames=new Map(state.vendors.map(vendor=>[vendor.id,vendor.name]));
 const firstName=(user.name||user.email.split('@')[0]).split(' ')[0];
 return <><header className="customer-topbar"><div className="container customer-topbar-inner"><Brand/><nav aria-label="Customer header"><Link href="/vendors"><Search size={17}/>Find vendors</Link><Link href="#saved"><Heart size={17}/>Saved vendors</Link><CustomerLogout/></nav></div></header>
  <main id="main" className="container customer-shell"><nav className="customer-sidebar" aria-label="Customer dashboard"><Link href="#overview">Overview</Link><Link href="#browse">Explore vendors</Link><Link href="#saved">Saved vendors</Link><Link href="#enquiries">Enquiries</Link><Link href="#account">Account</Link></nav>
   <div className="customer-content"><header id="overview" className="customer-intro"><p>Hi, {firstName}</p><h1>Plan your next event.</h1><p>Discover event professionals across India, save your favourites, and keep every enquiry together.</p></header>
    <form action="/vendors" method="get" className="customer-search"><Search size={19} aria-hidden="true"/><label className="sr-only" htmlFor="customer-vendor-search">Search vendors</label><input id="customer-vendor-search" name="q" type="search" placeholder="Search vendors or cities"/><button type="submit" aria-label="Search vendors">Search</button></form>
    <section id="browse" className="customer-section"><div className="customer-section-head"><div><h2>Explore vendors</h2><p>Find the people who can make your plans happen.</p></div><Link href="/vendors">Browse all vendors <ArrowRight size={17}/></Link></div>{suggested.length?<div className="customer-vendor-grid">{suggested.map(vendor=><VendorTile key={vendor.id} vendor={vendor} saved={false}/>)}</div>:<div className="customer-empty"><p>{available.length?'You’ve saved every available vendor. Explore your shortlist below.':'Approved vendors will appear here as they join Occanova.'}</p><Link href="/vendors">Open vendor directory</Link></div>}</section>
    <section id="saved" className="customer-section"><div className="customer-section-head"><div><h2>Saved vendors</h2><p>Your shortlist, ready when you are.</p></div><span>{saved.length} saved</span></div>{saved.length?<div className="customer-vendor-grid">{saved.map(vendor=><VendorTile key={vendor.id} vendor={vendor} saved/>)}</div>:<div className="customer-empty"><Heart size={28}/><h3>Your shortlist is empty.</h3><p>Save vendors you like from their profiles, then compare them here.</p><Link href="/vendors">Explore vendors <ArrowRight size={16}/></Link></div>}</section>
    <section id="enquiries" className="customer-section"><div className="customer-section-head"><div><h2>Your enquiries</h2><p>Track the messages you sent while signed in.</p></div><span>{enquiries.length} total</span></div>{enquiries.length?<div className="customer-enquiry-list">{enquiries.map(enquiry=><article key={enquiry.id} className="customer-enquiry-row"><div><strong>{vendorNames.get(enquiry.vendorId)||'Vendor unavailable'}</strong><span>{enquiry.service} · {enquiry.city}</span></div><div><span>Event {new Date(`${enquiry.date}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span><small>Sent {new Date(enquiry.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})}</small></div><span className={`customer-enquiry-status ${enquiry.status}`}>{enquiryStatus[enquiry.status]}</span><details><summary>View message</summary><p>{enquiry.message}</p></details></article>)}</div>:<div className="customer-empty"><h3>No enquiries yet.</h3><p>Open a vendor profile and send your first enquiry. It will appear here automatically.</p><Link href="/vendors">Find a vendor <ArrowRight size={16}/></Link></div>}</section>
    <section id="account" className="customer-section customer-account"><div className="customer-section-head"><div><h2>Account details</h2><p>Your email and mobile number are verified.</p></div></div><CustomerProfileForm name={user.name||''} email={user.email} phone={user.phone}/></section>
   </div></main><Footer/><PreviewNotice/></>;
}
