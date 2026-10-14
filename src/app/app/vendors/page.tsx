import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {SearchForm,VendorCard} from '@/components/ui';
import {readPublicDirectory} from '@/lib/store';
import {publicVendors} from '@/lib/directory';

export const metadata={title:'Find vendors'};
export const dynamic='force-dynamic';

export default async function AppDirectory({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const filters=await searchParams;
 const state=await readPublicDirectory();
 const vendors=publicVendors(state.vendors,filters,state.users).filter(vendor=>!vendor.sample);
 const pages=Math.max(1,Math.ceil(vendors.length/6));
 const page=Math.min(pages,Math.max(1,Math.floor(Number(filters.page))||1));
 const query=new URLSearchParams(Object.entries(filters).filter((entry):entry is [string,string]=>!!entry[1]));
 return <main id="main" className="app-main app-directory"><Link className="app-back" href="/app"><ArrowLeft size={16} aria-hidden="true"/>Discover</Link><div className="app-page-heading"><span className="app-eyebrow">FIND YOUR PEOPLE</span><h1>Explore event vendors.</h1><p>Search approved businesses by service and location. Every profile here belongs to a real vendor.</p></div>
  <section className="app-filter-panel" aria-label="Filter vendors"><SearchForm compact action="/app/vendors" categories={state.categories} locations={state.locations} category={filters.category} service={filters.service} city={filters.city} q={filters.q}/></section>
  <div className="app-results-heading"><strong>{vendors.length} {vendors.length===1?'vendor':'vendors'} found</strong>{Object.values(filters).some(Boolean)&&<Link href="/app/vendors">Clear filters</Link>}</div>
  {vendors.length?<div className="app-vendor-grid">{vendors.slice((page-1)*6,page*6).map(vendor=><VendorCard key={vendor.id} vendor={vendor} hrefBase="/app/vendors"/>)}</div>:<div className="app-empty"><h2>No vendors matched this search.</h2><p>Try a different service or location. New vendors are joining Occanova across India.</p><Link className="button outline" href="/app/vendors">View all vendors</Link></div>}
  {pages>1&&<nav className="app-pagination" aria-label="Results pages">{Array.from({length:pages},(_,index)=>{const next=new URLSearchParams(query);next.set('page',String(index+1));return <Link key={index} aria-current={page===index+1?'page':undefined} href={`/app/vendors?${next}`}>{index+1}</Link>;})}<span>Page {page} of {pages}</span></nav>}
 </main>;
}
