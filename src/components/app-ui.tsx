import Link from 'next/link';
import {ArrowUpRight,Compass,Search} from 'lucide-react';

export function AppHeader(){
 return <header className="app-header"><div className="app-header-inner">
  <Link href="/app" className="app-brand" aria-label="Occanova app home"><span className="app-brand-mark"><img src="/occanova-logo.jpg" alt=""/></span><span>OCCANOVA<small>YOUR EVENT, YOUR WAY.</small></span></Link>
  <nav className="app-top-nav" aria-label="App navigation"><Link href="/app">Discover</Link><Link href="/app/vendors">Find vendors <ArrowUpRight size={16} aria-hidden="true"/></Link></nav>
 </div></header>;
}

export function AppBottomNav(){
 return <nav className="app-bottom-nav" aria-label="App navigation"><Link href="/app"><Compass size={20} aria-hidden="true"/>Discover</Link><Link href="/app/vendors"><Search size={20} aria-hidden="true"/>Find vendors</Link></nav>;
}

export function AppFooter(){
 return <footer className="app-footer"><div><span>© {new Date().getFullYear()} Occanova</span><span>Made for moments that matter.</span></div><div><a href="/privacy" target="_blank" rel="noreferrer">Privacy</a><a href="/terms" target="_blank" rel="noreferrer">Terms</a><a href="mailto:info@occanova.com">Support</a></div></footer>;
}
