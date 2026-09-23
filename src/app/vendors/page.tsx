import Link from 'next/link';
import {ChevronDown,SlidersHorizontal} from 'lucide-react';
import {Header,Footer,SearchForm,VendorCard,PreviewNotice} from '@/components/ui';
import {readState} from '@/lib/store';
import {publicVendors} from '@/lib/directory';
import type {Taxon} from '@/lib/types';

export const metadata={title:'Find event vendors across India',description:'Explore event planners, venues, photographers, caterers, decorators and more across India.',alternates:{canonical:'/vendors'}};
export const dynamic='force-dynamic';

type FilterControlsProps={categories:Taxon[];locations:Taxon[];category?:string;city?:string;q?:string};
function FilterControls(props:FilterControlsProps){
  return <><SearchForm compact {...props}/><p className="quiet-note">Featured vendors appear first, followed by vendors in alphabetical order.</p></>;
}

export default async function Directory({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const p=await searchParams;
  const s=await readState();
  const rows=publicVendors(s.vendors,p);
  const pages=Math.max(1,Math.ceil(rows.length/6));
  const page=Math.min(pages,Math.max(1,Math.floor(Number(p.page))||1));
  const activeFilters=[p.category,p.city,p.q].filter(Boolean).length;
  const query=new URLSearchParams(Object.entries(p).filter((x):x is [string,string]=>!!x[1]));
  return <>
    <Header/>
    <main id="main" className="container page-main">
      <p className="breadcrumb"><Link href="/">Home</Link> / Find vendors</p>
      <div className="page-heading"><h1>Find your kind of people.</h1><p>Event professionals across India, for every part of your celebration.</p></div>
      <div className="directory-layout">
        <aside className="filters desktop-filters">
          <div className="section-heading"><h3>Refine your search</h3><Link href="/vendors">Clear all</Link></div>
          <FilterControls categories={s.categories} locations={s.locations} category={p.category} city={p.city} q={p.q}/>
        </aside>
        <details className="filters mobile-filters">
          <summary><span><SlidersHorizontal size={18} aria-hidden="true"/>Filter vendors</span><small>{activeFilters?`${activeFilters} active`:'All vendors'}</small><ChevronDown size={18} aria-hidden="true"/></summary>
          <div className="mobile-filter-body"><div className="mobile-filter-heading"><strong>Refine your search</strong><Link href="/vendors">Clear all</Link></div><FilterControls categories={s.categories} locations={s.locations} category={p.category} city={p.city} q={p.q}/></div>
        </details>
        <section>
          <div className="results-head"><span>{rows.length} {rows.length===1?'vendor':'vendors'} found</span><span>Featured first</span></div>
          {rows.length?<div className="results-grid">{rows.slice((page-1)*6,page*6).map(v=><VendorCard key={v.id} vendor={v}/>)}</div>:<div className="empty-state"><h2>A fresh start?</h2><p>We couldn’t find vendors for these filters. Try another service or location.</p><Link className="button outline" href="/vendors">Clear filters</Link></div>}
          <nav className="pagination" aria-label="Results pages">{Array.from({length:pages},(_,i)=>{const q=new URLSearchParams(query);q.set('page',String(i+1));return <Link key={i} aria-current={page===i+1?'page':undefined} href={`/vendors?${q}`}>{i+1}</Link>;})}</nav>
        </section>
      </div>
    </main>
    <Footer/>
    <PreviewNotice/>
  </>;
}
