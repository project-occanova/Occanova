'use client';

import {useEffect} from 'react';

export function AppServiceWorker(){
 useEffect(()=>{
  if('serviceWorker' in navigator)void navigator.serviceWorker.register('/app-sw.js',{scope:'/app'}).catch(()=>{});
 },[]);
 return null;
}
