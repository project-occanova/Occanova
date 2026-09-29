'use client';
import {useEffect,useState} from 'react';
export function AuthProgress({busy}:{busy:boolean}){
 const [slow,setSlow]=useState(false);
 useEffect(()=>{if(!busy){setSlow(false);return;}const timer=setTimeout(()=>setSlow(true),5000);return()=>clearTimeout(timer);},[busy]);
 return busy&&slow?<p className="notice" role="status">Still working on your request. Keep this page open and avoid submitting again. For email requests, also check your inbox and spam folder.</p>:null;
}
