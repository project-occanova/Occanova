import Link from 'next/link';
import {ArrowRight,ArrowUpRight,MapPin} from 'lucide-react';
import {SearchForm,VendorCard} from '@/components/ui';
import {categoryIconFor} from '@/components/category-icons';
import {readPublicDirectory} from '@/lib/store';
import {publicVendors,isFeatured} from '@/lib/directory';
import {photos} from '@/lib/seed';

export const revalidate=60;

export default async function CustomerAppHome(){
 const state=await readPublicDirectory();
 const realVendors=publicVendors(state.vendors,{},state.users).filter(vendor=>!vendor.sample);
 const featured=realVendors.filter(isFeatured).slice(0,3);
 const spotlight=featured.length?featured:realVendors.slice(0,3);
 return <main id="main" className="app-main">
  <section className="app-hero"><div className="app-hero-copy"><span className="app-eyebrow">OCCANOVA · INDIA</span><h1>Good people make <em>great moments.</em></h1><p>Find event professionals, explore their work, and make the first connection with confidence.</p><SearchForm action="/app/vendors" categories={state.categories} locations={state.locations}/><span className="app-hero-note"><MapPin size={15} aria-hidden="true"/>Discover vendors across India</span></div><div className="app-hero-image"><img src={photos.hero} alt="A warmly lit celebration with flowers and elegant tables" fetchPriority="high"/></div></section>
  <section className="app-section" aria-labelledby="app-categories-heading"><div className="app-section-heading"><div><span className="app-eyebrow">EXPLORE BY SERVICE</span><h2 id="app-categories-heading">What are you planning?</h2></div><Link href="/app/vendors">See all vendors <ArrowUpRight size={17} aria-hidden="true"/></Link></div><div className="app-category-grid">{state.categories.filter(category=>category.active).map(category=>{const Icon=categoryIconFor(category.slug);return <Link key={category.slug} href={`/app/vendors?category=${encodeURIComponent(category.slug)}`}><Icon size={24} strokeWidth={1.4} aria-hidden="true"/><span>{category.name}</span><ArrowUpRight size={16} aria-hidden="true"/></Link>;})}</div></section>
  <section className="app-section app-spotlight" aria-labelledby="app-spotlight-heading"><div className="app-section-heading"><div><span className="app-eyebrow">REAL OCCANOVA VENDORS</span><h2 id="app-spotlight-heading">Meet the people behind the work.</h2></div><Link href="/app/vendors">Browse directory <ArrowUpRight size={17} aria-hidden="true"/></Link></div>{spotlight.length?<div className="app-vendor-grid">{spotlight.map(vendor=><VendorCard key={vendor.id} vendor={vendor} hrefBase="/app/vendors"/>)}</div>:<div className="app-empty"><h3>More talent is on the way.</h3><p>Approved businesses will appear here as they join Occanova.</p></div>}</section>
  <section className="app-next-step"><div><span className="app-eyebrow">YOUR EVENT, YOUR WAY</span><h2>Start with the right people.</h2><p>Browse services and locations, then contact a vendor directly from their profile.</p></div><Link href="/app/vendors" className="button light">Find vendors <ArrowRight size={18} aria-hidden="true"/></Link></section>
 </main>;
}
