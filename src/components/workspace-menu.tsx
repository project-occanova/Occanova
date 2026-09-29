'use client';
import {useEffect,useRef} from 'react';
import {Menu} from 'lucide-react';

export function WorkspaceMenu({children}:{children:React.ReactNode}){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  function outside(event:PointerEvent){if(ref.current?.open&&!ref.current.contains(event.target as Node))ref.current.open=false;}
  function escape(event:KeyboardEvent){if(event.key==='Escape'&&ref.current?.open){ref.current.open=false;ref.current.querySelector('summary')?.focus();}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 return <details ref={ref} className="workspace-more" onClick={event=>{if((event.target as Element).closest('a,button'))ref.current!.open=false;}}><summary aria-label="Open workspace navigation"><Menu size={22} aria-hidden="true"/></summary><div>{children}</div></details>;
}
