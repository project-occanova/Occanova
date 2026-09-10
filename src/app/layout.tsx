import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:{default:'Occanova — Your event, your way.',template:'%s | Occanova'},description:'Discover event vendors, explore their work, and connect directly with the people who bring your celebration to life.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;}
