'use client';

import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ChevronDown,SlidersHorizontal,X} from 'lucide-react';
import type {Taxon} from '@/lib/types';
import {SearchForm} from '@/components/search-form';

type Props={categories:Taxon[];locations:Taxon[];category?:string;service?:string;city?:string;q?:string;activeCount:number};

export function AppVendorFilters({categories,locations,category,service,city,q,activeCount}:Props){
 const [expanded,setExpanded]=useState(false);
 const toggleRef=useRef<HTMLButtonElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const panelRef=useRef<HTMLDivElement>(null);
 const closeFilters=useCallback(()=>{setExpanded(false);toggleRef.current?.focus();},[]);

 useEffect(()=>{
  const mobile=window.matchMedia('(max-width: 680px)');
  if(!expanded||!mobile.matches)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeRef.current?.focus();
  function onKeyDown(event:KeyboardEvent){
   if(event.key==='Escape'){closeFilters();return;}
   if(event.key!=='Tab')return;
   const controls=panelRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])');
   if(!controls?.length)return;
   const first=controls[0];
   const last=controls[controls.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  function onViewportChange(){if(!mobile.matches)closeFilters();}
  document.addEventListener('keydown',onKeyDown);
  mobile.addEventListener('change',onViewportChange);
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKeyDown);mobile.removeEventListener('change',onViewportChange);};
 },[expanded,closeFilters]);

 return <section className={`app-filter-shell${expanded?' is-open':''}`} aria-label="Search and filter vendors">
  <button ref={toggleRef} className="app-filter-toggle" type="button" aria-expanded={expanded} aria-controls="app-filter-fields" onClick={()=>setExpanded(value=>!value)}><SlidersHorizontal size={18} aria-hidden="true"/><span>Search & filters</span>{activeCount>0&&<span className="app-filter-count">{activeCount} active</span>}<ChevronDown className="app-filter-chevron" size={18} aria-hidden="true"/></button>
  {expanded&&<button className="app-filter-backdrop" type="button" tabIndex={-1} aria-label="Close filters" onClick={closeFilters}/>}
  <div ref={panelRef} id="app-filter-fields" className="app-filter-panel" role={expanded?'dialog':undefined} aria-modal={expanded?true:undefined} aria-labelledby={expanded?'app-filter-title':undefined}>
   <div className="app-filter-panel-header"><strong id="app-filter-title">Filter vendors</strong><button ref={closeRef} type="button" aria-label="Close filters" onClick={closeFilters}><X size={21} aria-hidden="true"/></button></div>
   <div className="app-filter-panel-scroll"><SearchForm id="app-vendor-search-form" compact action="/app/vendors" categories={categories} locations={locations} category={category} service={service} city={city} q={q}/></div>
   <div className="app-filter-panel-footer"><Link href="/app/vendors" onClick={closeFilters}>Clear all</Link><button className="button" type="submit" form="app-vendor-search-form">Show vendors</button></div>
  </div>
 </section>;
}
