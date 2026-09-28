import type {MetadataRoute} from 'next';
import {siteUrl} from '@/lib/config';
import {readState} from '@/lib/store';
import {publicVendors} from '@/lib/directory';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=siteUrl();
  const state=await readState();
  const vendors=publicVendors(state.vendors,{},state.users);
  return [
    {url:base,changeFrequency:'weekly',priority:1},
    {url:`${base}/vendors`,changeFrequency:'daily',priority:.9},
    ...vendors.map(v=>({url:`${base}/vendors/${v.slug}`,changeFrequency:'weekly' as const,priority:.7})),
  ];
}
