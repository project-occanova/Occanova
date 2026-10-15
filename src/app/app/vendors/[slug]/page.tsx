import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,MapPin,MessageCircle,Phone,Send,Sparkles} from 'lucide-react';
import {EnquiryForm} from '@/components/forms';
import {SaveVendorButton} from '@/components/customer-actions';
import {PortfolioGallery} from '@/components/portfolio-gallery';
import {readPublicDirectory} from '@/lib/store';
import {publicVendors,money,isFeatured,enquiryVendor} from '@/lib/directory';
import {publicIntakeEnabled,readOnlyDeployment} from '@/lib/config';

export const dynamic='force-dynamic';

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const state=await readPublicDirectory();
 const vendor=publicVendors(state.vendors,{},state.users).find(item=>item.slug===slug&&!item.sample);
 return {title:vendor?.name||'Vendor not found',description:vendor?.summary,robots:{index:false,follow:false}};
}

export default async function AppVendorProfile({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const state=await readPublicDirectory();
 const vendor=publicVendors(state.vendors,{},state.users).find(item=>item.slug===slug&&!item.sample);
 if(!vendor)notFound();
 const readOnly=readOnlyDeployment()||!publicIntakeEnabled();
 const phoneHref=`tel:${vendor.phone.replace(/[^+0-9]/g,'')}`;
 const whatsappHref=`https://wa.me/${vendor.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(`Hello ${vendor.name}, I found your business on Occanova and would like to enquire about an event.`)}`;
 return <main id="main" className="app-main app-profile"><Link className="app-back" href="/app/vendors"><ArrowLeft size={16} aria-hidden="true"/>All vendors</Link>
  <div className="app-profile-heading"><div><span className="app-eyebrow">{vendor.category}</span><h1>{vendor.name}</h1><p><MapPin size={16} aria-hidden="true"/>{vendor.locations.join(' · ')}{isFeatured(vendor)&&<span className="badge inline"><Sparkles size={12} aria-hidden="true"/>Featured</span>}</p></div><div className="app-price"><span>Starting from</span><strong>{money(vendor.price)}</strong>{vendor.category==='Catering & Food'&&<small>per person</small>}</div></div>
  <nav className="app-profile-quick-actions" aria-label="Vendor actions"><a href="#app-enquiry"><Send size={16} aria-hidden="true"/>Enquire</a><SaveVendorButton vendorId={vendor.id} returnTo={`/app/vendors/${vendor.slug}`}/><a href={phoneHref}><Phone size={16} aria-hidden="true"/>Call</a><a target="_blank" rel="noreferrer" href={whatsappHref}><MessageCircle size={16} aria-hidden="true"/>WhatsApp</a></nav>
  <PortfolioGallery images={vendor.gallery} name={vendor.name} sample={false}/>
  <div className="app-profile-body"><section><span className="app-eyebrow">THE PEOPLE BEHIND THE WORK</span><h2>A little about {vendor.name}</h2><p className="app-description">{vendor.description}</p><div className="app-facts"><div><span>Experience</span><strong>{vendor.experience} years</strong></div><div><span>Available in</span><strong>{vendor.locations.join(', ')}</strong></div><div><span>Service</span><strong>{vendor.service||vendor.category}</strong></div></div><div className="app-contact-actions"><a className="button" href={phoneHref}><Phone size={17} aria-hidden="true"/>Call vendor</a><a className="button outline" target="_blank" rel="noreferrer" href={whatsappHref}><MessageCircle size={17} aria-hidden="true"/>WhatsApp</a></div></section><aside id="app-enquiry" tabIndex={-1} className="panel enquiry-panel"><h2>Tell them about your day.</h2><p>Share a few details to get the conversation started.</p><EnquiryForm vendor={enquiryVendor(vendor)} readOnly={readOnly} disabledReason="Public enquiries will open after launch approval."/></aside></div>
 </main>;
}
