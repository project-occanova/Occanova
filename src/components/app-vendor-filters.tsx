'use client';

import {useState} from 'react';
import {ChevronDown,SlidersHorizontal} from 'lucide-react';
import type {Taxon} from '@/lib/types';
import {SearchForm} from '@/components/search-form';

export function AppVendorFilters({categories,locations,category,service,city,q,activeCount}:{categories:Taxon[];locations:Taxon[];category?:string;service?:string;city?:string;q?:string;activeCount:number}){
 const [expanded,setExpanded]=useState(false);
 return <section className={`app-filter-shell${expanded?' is-open':''}`} aria-label="Search and filter vendors">
  <button className="app-filter-toggle" type="button" aria-expanded={expanded} aria-controls="app-filter-fields" onClick={()=>setExpanded(value=>!value)}><SlidersHorizontal size={18} aria-hidden="true"/><span>Search & filters</span>{activeCount>0&&<span className="app-filter-count">{activeCount} active</span>}<ChevronDown className="app-filter-chevron" size={18} aria-hidden="true"/></button>
  <div id="app-filter-fields" className="app-filter-panel"><SearchForm compact action="/app/vendors" categories={categories} locations={locations} category={category} service={service} city={city} q={q}/></div>
 </section>;
}
