'use client';

import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {Taxon} from '@/lib/types';
import {slugify} from '@/lib/directory';

export function SearchForm({categories,locations,category='',service='',city='',q='',compact=false}:{categories:Taxon[];locations:Taxon[];category?:string;service?:string;city?:string;q?:string;compact?:boolean}){
  const activeCategories=categories.filter(x=>x.active);
  const initialCategory=category||activeCategories.find(x=>x.services?.some(item=>slugify(item)===slugify(service)))?.slug||'';
  const [selectedCategory,setSelectedCategory]=useState(initialCategory);
  const [selectedService,setSelectedService]=useState(slugify(service));
  const services=activeCategories.find(x=>x.slug===selectedCategory)?.services??[];

  return <form action="/vendors" className={compact?'filter-form':'search-form'}>
    <label><span>Category</span><select name="category" value={selectedCategory} onChange={event=>{setSelectedCategory(event.target.value);setSelectedService('');}}><option value="">All categories</option>{activeCategories.map(x=><option value={x.slug} key={x.slug}>{x.name}</option>)}</select></label>
    <label><span>Subcategory</span><select name="service" value={selectedService} onChange={event=>setSelectedService(event.target.value)} disabled={!selectedCategory}><option value="">All subcategories</option>{services.map(item=><option value={slugify(item)} key={item}>{item}</option>)}</select></label>
    <label><span>City or service area</span><select name="city" defaultValue={city}><option value="">All India</option>{locations.filter(x=>x.active).map(x=><option value={x.slug} key={x.slug}>{x.name}</option>)}</select></label>
    {compact?<label><span>Business name or keyword</span><input name="q" defaultValue={q} placeholder="Search vendors"/></label>:null}
    <button className="button" type="submit">{compact?'Apply filters':'Find vendors'}<ArrowUpRight size={18}/></button>
  </form>;
}
