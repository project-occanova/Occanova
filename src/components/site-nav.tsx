'use client';

import {useEffect,useRef,useState} from 'react';
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
  const menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open)return;
    function closeOnEscape(event:KeyboardEvent){
      if(event.key==='Escape'){
        setOpen(false);
        menuRef.current?.querySelector('button')?.focus();
      }
    }
    function closeOutside(event:PointerEvent){
      if(!menuRef.current?.contains(event.target as Node))setOpen(false);
    }
    document.addEventListener('keydown',closeOnEscape);
    document.addEventListener('pointerdown',closeOutside);
    return ()=>{
      document.removeEventListener('keydown',closeOnEscape);
      document.removeEventListener('pointerdown',closeOutside);
    };
  },[open]);
  return <div ref={menuRef} className={`mobile-menu${open?' is-open':''}`}>
    <button type="button" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-haspopup="true" aria-controls="mobile-navigation" onClick={()=>setOpen(value=>!value)}>
      {open?<X size={21} aria-hidden="true"/>:<Menu size={21} aria-hidden="true"/>}
    </button>
    {open?<nav id="mobile-navigation" aria-label="Mobile navigation">
      {links.map(link=><Link key={link.href} className={link.className} href={link.href} onClick={()=>setOpen(false)}><span>{link.label}</span><ArrowUpRight size={16} aria-hidden="true"/></Link>)}
    </nav>:null}
  </div>;
}
