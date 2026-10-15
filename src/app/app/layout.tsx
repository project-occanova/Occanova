import type {Metadata,Viewport} from 'next';
import {AppHeader,AppBottomNav,AppFooter} from '@/components/app-ui';
import {AppServiceWorker} from '@/components/app-service-worker';

export const metadata:Metadata={title:{default:'Occanova app',template:'%s | Occanova app'},description:'Discover event vendors and manage your Occanova account.',robots:{index:false,follow:false,noarchive:true}};
export const viewport:Viewport={themeColor:'#315b1c'};

export default function CustomerAppLayout({children}:{children:React.ReactNode}){
 return <div className="app-shell"><AppHeader/>{children}<AppFooter/><AppBottomNav/><AppServiceWorker/></div>;
}
