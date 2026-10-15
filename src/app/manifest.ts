import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest{
 return {
  id:'/app',
  name:'Occanova — Event vendors and accounts',
  short_name:'Occanova',
  description:'Discover event professionals, save vendors and manage your Occanova account.',
  start_url:'/app',
  scope:'/',
  display:'standalone',
  background_color:'#fffcf5',
  theme_color:'#315b1c',
  icons:[{src:'/occanova-logo.jpg',sizes:'1254x1254',type:'image/jpeg',purpose:'any'}],
 };
}
