import Link from 'next/link';
import {ArrowUpRight,ArrowRight} from 'lucide-react';
import {Header,Footer,SearchForm,VendorCard,categoryIcons,PreviewNotice} from '@/components/ui';
import {readState} from '@/lib/store';
import {publicVendors,isFeatured} from '@/lib/directory';
import {photos} from '@/lib/seed';

export const dynamic='force-dynamic';

export default async function Home(){
  const s=await readState();
  const featured=publicVendors(s.vendors).filter(v=>isFeatured(v)).slice(0,3);
  return <>
    <Header/>
    <main id="main">
      <section className="hero">
        <div className="hero-photo"><img src={photos.hero} alt="An elegant celebration with flowers, candlelight and thoughtfully set tables" fetchPriority="high"/></div>
        <div className="container hero-content">
          <h1>Your event.<br/><em>Your way.</em></h1>
          <p>Find the people who bring<br/>your celebration to life.</p>
          <SearchForm categories={s.categories} locations={s.locations}/>
          <div className="hero-note"><span/>Discover event professionals across India</div>
        </div>
      </section>
      <section className="container categories-section">
        <div className="section-heading"><h2>A little inspiration.<br className="mobile-only"/> A place to begin.</h2><Link href="/vendors">Explore all vendors <ArrowUpRight size={17}/></Link></div>
        <div className="category-row">{s.categories.filter(x=>x.active).map((c,i)=>{const Icon=categoryIcons[i%categoryIcons.length];return <Link key={c.slug} href={`/category/${c.slug}`}><Icon size={29} strokeWidth={1.25}/><span>{c.name}</span><ArrowUpRight className="category-arrow" size={14}/></Link>;})}</div>
      </section>
      <section className="featured-section">
        <div className="container">
          <div className="section-heading"><div><span className="section-label">PEOPLE BEHIND THE MOMENTS</span><h2>Discover our featured vendors</h2></div><Link href="/vendors">View all vendors <ArrowUpRight size={17}/></Link></div>
          {featured.length?<div className="vendor-grid">{featured.map(v=><VendorCard key={v.id} vendor={v}/>)}</div>:<p>Featured vendors will appear here once approved.</p>}
          <p className="quiet-note">A preview of what’s possible. These are illustrative vendor listings.</p>
        </div>
      </section>
      <section className="container how-section" id="how-it-works">
        <div className="section-heading"><h2>From an idea to<br/><em>something unforgettable.</em></h2><p>Less searching. More celebrating.<br/>Here’s how Occanova brings it together.</p></div>
        <div className="steps">{[['Discover','Find vendors by service and location, all in one thoughtfully curated directory.'],['Explore','Get to know their style, browse their work, and find the right fit for your day.'],['Connect','Reach out directly. Share your ideas and take the next step together.']].map(([title,copy],i)=><div key={title}><span className="step-number">0{i+1}</span><h3>{title}</h3><p>{copy}</p></div>)}</div>
      </section>
      <section className="vendor-cta"><div className="container"><div><span className="section-label">FOR THE PEOPLE WHO MAKE IT HAPPEN</span><h2>Your craft.<br/>Someone’s perfect celebration.</h2><p>Put your business on Occanova and be discovered across India.</p></div><Link className="button light" href="/register">List your business <ArrowRight size={18}/></Link></div></section>
    </main>
    <Footer/>
    <PreviewNotice/>
  </>;
}
