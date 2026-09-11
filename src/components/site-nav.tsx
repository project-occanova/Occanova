'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Menu,X} from 'lucide-react';

const links=[
  {href:'/vendors',label:'Find vendors'},
  {href:'/#how-it-works',label:'How it works'},
  {href:'/register',label:'List your business'},
  {href:'/login',label:'Vendor login',className:'mobile-login'},
];

export function MobileNav(){
  const [open,setOpen]=useState(false);
  return <div className={`mobile-menu${open?' is-open':''}`}>
    <button type="button" aria-expanded={open} aria-controls="mobile-navigation" onClick={()=>setOpen(value=>!value)}>
      <span>Menu</span>{open?<X size={20}/>:<Menu size={20}/>}
    </button>
    {open?<nav id="mobile-navigation" aria-label="Mobile navigation">
      {links.map(link=><Link key={link.href} className={link.className} href={link.href} onClick={()=>setTimeout(()=>setOpen(false),0)}><span>{link.label}</span><ArrowUpRight size={16}/></Link>)}
    </nav>:null}
  </div>;
}
