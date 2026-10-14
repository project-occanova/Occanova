import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest{
 return {
  id:'/app',
  name:'Occanova — Find event vendors',
  short_name:'Occanova',
  description:'Discover event professionals across India and enquire directly.',
  start_url:'/app',
  scope:'/app',
  display:'standalone',
  background_color:'#fffcf5',
  theme_color:'#315b1c',
  icons:[{src:'/occanova-logo.jpg',sizes:'1254x1254',type:'image/jpeg',purpose:'any'}],
 };
}
