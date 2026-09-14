import type {MetadataRoute} from 'next';
import {siteIndexable,siteUrl} from '@/lib/config';

export default function robots():MetadataRoute.Robots{
  const base=siteUrl();
  if(!siteIndexable())return {rules:{userAgent:'*',disallow:'/'},host:base};
  return {
    rules:{
      userAgent:'*',
      allow:'/',
      disallow:['/admin/','/api/','/dashboard','/login','/register','/forgot-password','/reset-password','/verify','/resend-verification'],
    },
    sitemap:`${base}/sitemap.xml`,
    host:base,
  };
}
