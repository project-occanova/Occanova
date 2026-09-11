import type { Vendor } from './types';
export const slugify = (s:string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function isFeatured(v:Vendor, now=Date.now()) { return v.featured && (!v.featuredStart || Date.parse(v.featuredStart)<=now) && (!v.featuredEnd || Date.parse(v.featuredEnd+'T23:59:59.999Z')>=now); }
export function publicVendors(vendors:Vendor[], filter:{category?:string; city?:string; q?:string}={}) {
  return vendors.filter(v=>v.status==='approved' && v.published && (!filter.category || slugify(v.category)===slugify(filter.category)) && (!filter.city || v.locations.some(l=>slugify(l)===slugify(filter.city!)||slugify(l)==='pan-india')) && (!filter.q || `${v.name} ${v.summary} ${v.category} ${v.service||''}`.toLowerCase().includes(filter.q.toLowerCase())))
    .sort((a,b)=>Number(isFeatured(b))-Number(isFeatured(a)) || (isFeatured(a)&&isFeatured(b)?a.priority-b.priority:0) || a.name.localeCompare(b.name));
}
export const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
