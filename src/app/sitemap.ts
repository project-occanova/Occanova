import type {MetadataRoute} from 'next';
import {readState} from '@/lib/store';
import {publicVendors} from '@/lib/directory';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const vercelHost=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL;
  const base=(process.env.NEXT_PUBLIC_SITE_URL||(vercelHost?`https://${vercelHost}`:'http://localhost:3000')).replace(/\/$/,'');
  const vendors=publicVendors((await readState()).vendors);
  return [
    {url:base,changeFrequency:'weekly',priority:1},
    {url:`${base}/vendors`,changeFrequency:'daily',priority:.9},
    ...vendors.map(v=>({url:`${base}/vendors/${v.slug}`,changeFrequency:'weekly' as const,priority:.7})),
  ];
}
