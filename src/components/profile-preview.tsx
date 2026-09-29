'use client';
import {useRef,useState} from 'react';
import {Eye,X,MapPin} from 'lucide-react';
import {PortfolioGallery} from './portfolio-gallery';

type Preview={name:string;summary:string;description:string;category:string;service:string;city:string;price:string;experience:string};
export function ProfilePreview({image,gallery,coverage}:{image:string;gallery:string[];coverage:string[]}){
 const dialog=useRef<HTMLDialogElement>(null);const[data,setData]=useState<Preview>();
 function open(button:HTMLButtonElement){
  const form=button.form;if(!form)return;
  const values=new FormData(form);
  const text=(name:string)=>String(values.get(name)??'').trim();
  setData({name:text('name'),summary:text('summary'),description:text('description'),category:text('category'),service:text('service'),city:text('city'),price:text('price'),experience:text('experience')});
  dialog.current?.showModal();
 }
 return <><button type="button" className="button outline" onClick={event=>open(event.currentTarget)}><Eye size={16}/>Preview</button>
  <dialog ref={dialog} className="profile-preview-dialog" aria-labelledby="profile-preview-title">
   <header className="preview-toolbar"><div><strong id="profile-preview-title">Your profile preview</strong><p>Private preview of your current edits. Nothing is saved or submitted.</p></div><button type="button" className="preview-close" aria-label="Close profile preview" onClick={()=>dialog.current?.close()}><X size={22}/></button></header>
   {data&&<div className="preview-content"><span className="section-label">{data.category||'Service category'}</span><div className="preview-identity">{image&&<img className="preview-logo" src={image} alt="Business logo"/>}<div><h2>{data.name||'Your business name'}</h2><p className="location"><MapPin size={16}/>{coverage.join(' · ')||data.city||'Your service locations'}</p></div></div><p>{data.summary||'Your short service summary will appear here.'}</p><div className="preview-facts"><div><span>Starting from</span><strong>{Number(data.price)>0?`₹${Number(data.price).toLocaleString('en-IN')}`:'Price to be added'}</strong></div><div><span>Experience</span><strong>{data.experience||'0'} years</strong></div><div><span>Subcategory</span><strong>{data.service||'Choose a subcategory'}</strong></div></div>{gallery.length?<PortfolioGallery images={gallery} name={data.name||'Your business'} sample={false}/>:<div className="preview-empty">Your portfolio photos will appear here after you upload them.</div>}<h3>About {data.name||'your business'}</h3><p className="preview-description">{data.description||'Tell customers about your services, experience, and what makes your business distinctive.'}</p><p className="notice">Contact and enquiry buttons appear on your public listing after approval and publication. Private verification documents never appear here.</p><button type="button" className="button" onClick={()=>dialog.current?.close()}>Back to editing</button></div>}
  </dialog></>;
}
