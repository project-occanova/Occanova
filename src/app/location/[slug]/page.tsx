import {redirect} from 'next/navigation';
export default async function Location({params}:{params:Promise<{slug:string}>}){redirect('/vendors?city='+encodeURIComponent((await params).slug));}
