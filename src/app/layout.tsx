import type { Metadata } from 'next';
import {siteIndexable,siteUrl} from '@/lib/config';
import './globals.css';
const description='Discover event vendors across India, explore their work, and connect directly with the people who bring your celebration to life.';
const indexable=siteIndexable();
export const metadata:Metadata={
  metadataBase:new URL(siteUrl()),
  title:{default:'Occanova — Your event, your way.',template:'%s | Occanova'},
  description,
  applicationName:'Occanova',
  alternates:{canonical:'/'},
  openGraph:{title:'Occanova — Your event, your way.',description,url:'/',siteName:'Occanova',locale:'en_IN',type:'website',images:[{url:'/occanova-logo.jpg',alt:'Occanova — Your event, your way.'}]},
  twitter:{card:'summary_large_image',title:'Occanova — Your event, your way.',description,images:['/occanova-logo.jpg']},
  robots:{index:indexable,follow:indexable,noarchive:!indexable},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;}
