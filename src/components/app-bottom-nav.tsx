'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Compass,Heart,Search,UserRound} from 'lucide-react';

export function AppBottomNav(){
 const pathname=usePathname();
 const current=pathname==='/app'?'discover':pathname.startsWith('/app/vendors')?'vendors':pathname.startsWith('/app/saved')?'saved':'account';
 return <nav className="app-bottom-nav" aria-label="App navigation">
  <Link href="/app" aria-current={current==='discover'?'page':undefined}><Compass size={20} aria-hidden="true"/>Discover</Link>
  <Link href="/app/vendors" aria-current={current==='vendors'?'page':undefined}><Search size={20} aria-hidden="true"/>Vendors</Link>
  <Link href="/app/saved" aria-current={current==='saved'?'page':undefined}><Heart size={20} aria-hidden="true"/>Saved</Link>
  <Link href="/app/account" aria-current={current==='account'?'page':undefined}><UserRound size={20} aria-hidden="true"/>Account</Link>
 </nav>;
}
