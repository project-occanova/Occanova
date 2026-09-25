import Link from 'next/link';
import {ArrowUpRight,MapPin,BadgeCheck,Sparkles} from 'lucide-react';
import type {Vendor} from '@/lib/types';
import {money,isFeatured} from '@/lib/directory';
import {backendReady,publicIntakeEnabled,readOnlyDeployment} from '@/lib/config';
import {MobileNav} from './site-nav';
export {SearchForm} from './search-form';

export function Brand(){
  return <Link href="/" className="brand" aria-label="Occanova home">
    <span className="brand-mark"><img src="/occanova-logo.jpg" alt=""/></span>
    <span>OCCANOVA<small>YOUR EVENT, YOUR WAY.</small></span>
  </Link>;
}

export function Header(){
  return <header className="header"><div className="container nav">
    <Brand/>
    <nav className="desktop-nav" aria-label="Main navigation">
      <Link href="/vendors">Find vendors</Link>
      <Link href="/#how-it-works">How it works</Link>
      <Link href="/register">List your business <ArrowUpRight size={15}/></Link>
      <Link className="button outline small" href="/login">Vendor login</Link>
    </nav>
    <MobileNav/>
  </div></header>;
}

export function Footer(){
  return <footer>
    <div className="container footer-main">
      <div><Brand/><p>Good people. Beautiful celebrations across India.</p></div>
      <div><strong>Explore</strong><Link href="/vendors">Find vendors</Link><Link href="/#how-it-works">How it works</Link></div>
      <div><strong>For businesses</strong><Link href="/register">List your business</Link><Link href="/login">Vendor login</Link></div>
      <div><strong>Occanova</strong><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms & conditions</Link></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} Occanova</span><span>Made for moments that matter.</span></div>
  </footer>;
}

export function VendorCard({vendor:v,list=false}:{vendor:Vendor;list?:boolean}){
  return <article className={`vendor-card ${list?'list-card':''}`}>
    <Link className="card-image" href={`/vendors/${v.slug}`}><img src={v.image||'/occanova-logo.jpg'} alt={v.sample?`${v.category} inspiration photograph`:`${v.name} portfolio`} loading="lazy"/>{isFeatured(v)?<span className="badge featured"><Sparkles size={12}/>Featured</span>:null}</Link>
    <div className="card-copy">
      <span className="category-label">{v.category}</span><span className="subcategory-label">{v.service}</span>
      <Link href={`/vendors/${v.slug}`}><h3>{v.name}{v.sample?null:<BadgeCheck size={17}/>}</h3></Link>
      <p className="location"><MapPin size={14}/>{v.city}{v.sample?<span className="sample-label">Sample listing</span>:null}</p>
      {list?<p>{v.summary}</p>:null}
      <div className="card-bottom"><span>From <strong>{money(v.price)}</strong><small>{v.category==='Catering & Food'?' / person':''}</small></span><Link href={`/vendors/${v.slug}`} aria-label={`View ${v.name}`}><ArrowUpRight size={20}/></Link></div>
    </div>
  </article>;
}

export function PreviewNotice(){
  const hosted=process.env.VERCEL==='1';
  const copy=readOnlyDeployment()?'Public preview · Read-only experience':hosted&&backendReady()&&!publicIntakeEnabled()?'Launch preview · Registration and enquiries are closed':hosted&&backendReady()?'Production backend connected':'Local preview';
  return <div className="preview-notice">{copy} · Illustrative listings and photography</div>;
}
