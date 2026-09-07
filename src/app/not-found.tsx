import Link from 'next/link';
import {Header,Footer} from '@/components/ui';
export default function NotFound(){return <><Header/><main id="main" className="container empty-state"><h1>This page has slipped away.</h1><p>The vendor may be unavailable, or this link may have changed.</p><Link className="button" href="/vendors">Explore vendors</Link></main><Footer/></>;}
