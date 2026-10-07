import type { Vendor,User } from './types';
import {slugify} from './slugs';
export {slugify} from './slugs';
import {categoryName,serviceName} from './taxonomy';
import {listingWithinPlan} from './plan-access';
export function isFeatured(v:Vendor, now=Date.now()) { return v.featured && (!v.featuredStart || Date.parse(v.featuredStart)<=now) && (!v.featuredEnd || Date.parse(v.featuredEnd+'T23:59:59.999Z')>=now); }
export function isPublicVendor(v:Vendor,owner?:Pick<User,'id'|'subscription'>){return v.status==='approved'&&v.published&&(v.sample||listingWithinPlan(owner?.subscription,v.gallery.length));}
export function publicVendors(vendors:Vendor[], filter:{category?:string; service?:string; city?:string; q?:string}={},users:Pick<User,'id'|'subscription'>[]=[]){
  filter={...filter,category:filter.category?categoryName(filter.category):undefined,service:filter.service?serviceName(filter.category||'',filter.service):undefined};
  const accounts=new Map(users.map(user=>[user.id,user]));
  return vendors.filter(v=>isPublicVendor(v,accounts.get(v.userId)) && (!filter.category || slugify(v.category)===slugify(filter.category)) && (!filter.service || slugify(v.service||'')===slugify(filter.service)) && (!filter.city || v.locations.some(l=>slugify(l)===slugify(filter.city!)||slugify(l)==='pan-india')) && (!filter.q || `${v.name} ${v.summary} ${v.category} ${v.service||''}`.toLowerCase().includes(filter.q.toLowerCase().trim())))
    .sort((a,b)=>Number(isFeatured(b))-Number(isFeatured(a)) || (isFeatured(a)&&isFeatured(b)?a.priority-b.priority:0) || a.name.localeCompare(b.name));
}
export const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);

// Explicit projections keep private fields out of API responses and client props.
export function publicVendorProfile(v:Vendor){
  return {id:v.id,name:v.name,slug:v.slug,category:v.category,service:v.service,
    city:v.city,locations:v.locations,experience:v.experience,description:v.description,
    summary:v.summary,price:v.price,phone:v.phone,whatsapp:v.whatsapp,email:v.email,
    image:v.image,gallery:v.gallery,featured:isFeatured(v),sample:v.sample};
}
export function enquiryVendor(v:Vendor){return {id:v.id,service:v.service,category:v.category};}
export function enquiryVendorNames(vendors:Vendor[],rows:{vendorId:string}[]){
  const ids=new Set(rows.map(row=>row.vendorId));
  return vendors.filter(v=>ids.has(v.id)).map(v=>({id:v.id,name:v.name}));
}
