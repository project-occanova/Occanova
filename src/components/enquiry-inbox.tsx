'use client';
import {useEffect,useId,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Mail,Phone,Search} from 'lucide-react';
import type {Enquiry,Vendor} from '@/lib/types';

const labels={new:'New',contacted:'Contacted',closed:'Closed'};
function contactLink(contact:string){
 const text=contact.trim();
 if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))return {href:`mailto:${encodeURIComponent(text)}`,label:'Email',email:true};
 if(/^[+\d\s().-]+$/.test(text)&&text.replace(/\D/g,'').length>=10)return {href:`tel:${text.replace(/[^+\d]/g,'')}`,label:'Call',email:false};
 return undefined;
}
export function EnquiryTable({rows,vendors}:{rows:Enquiry[];vendors:Pick<Vendor,'id'|'name'>[]}){
 const router=useRouter(),id=useId();const[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[error,setError]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState<string[]>([]),[updates,setUpdates]=useState<Record<string,Enquiry['status']>>({});
 useEffect(()=>{setUpdates({});},[rows]);
 const names=new Map(vendors.map(v=>[v.id,v.name]));const status=(e:Enquiry)=>updates[e.id]??e.status;
 const search=query.trim().toLowerCase();
 const filtered=rows.filter(e=>(filter==='all'||status(e)===filter)&&(!search||[e.name,e.contact,e.city,e.service,e.message,names.get(e.vendorId)].some(value=>value?.toLowerCase().includes(search))));
 const counts={all:rows.length,new:0,contacted:0,closed:0};for(const row of rows)counts[status(row)]++;
 async function change(e:Enquiry,next:Enquiry['status']){
  setSaving(ids=>[...ids,e.id]);setError('');setMessage('');
  try{const response=await fetch('/api/enquiry-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:e.id,status:next})});const body=await response.json();if(!response.ok)throw Error(body.error||'Could not update this enquiry. Please try again.');setUpdates(previous=>({...previous,[e.id]:next}));setMessage(`${e.name} marked as ${labels[next].toLowerCase()}.`);router.refresh();}
  catch(error){setError((error as Error).message);}finally{setSaving(ids=>ids.filter(value=>value!==e.id));}
 }
 if(!rows.length)return <div className="empty-state"><Mail size={28}/><h3>Your next conversation starts here.</h3><p>Customer enquiries will appear here with their event details and contact information.</p></div>;
 return <div className="enquiry-inbox">
  <div className="inbox-toolbar"><label className="inbox-search" htmlFor={id}><Search size={18}/><input id={id} type="search" aria-label="Search enquiries" placeholder="Search name, city, service or message" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="inbox-filters" aria-label="Filter enquiries by status">{(['all','new','contacted','closed'] as const).map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'All':labels[value]}<span>{counts[value]}</span></button>)}</div></div>
  <p className="inbox-result-count" role="status">{filtered.length} of {rows.length} enquiries{message&&` · ${message}`}</p>{error&&<p role="alert" className="error">{error}</p>}
  {filtered.length?<div className="table-wrap responsive-table enquiry-results"><table><thead><tr><th>Customer</th><th>Vendor & service</th><th>Event</th><th>Received</th><th>Status</th></tr></thead><tbody>{filtered.map(e=>{const contact=contactLink(e.contact);return <tr key={e.id}><td data-label="Customer"><strong>{e.name}</strong><small>{e.contact}</small>{contact&&<a className="inbox-contact" href={contact.href}>{contact.email?<Mail size={15}/>:<Phone size={15}/>} {contact.label} customer</a>}<details><summary>View message</summary><p>{e.message}</p><small>Customer consent to share confirmed</small></details></td><td data-label="Service"><strong>{names.get(e.vendorId)||'Your business'}</strong><small>{e.service}</small></td><td data-label="Event"><strong>{e.city}</strong><small>{e.date?new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Date not provided'}</small></td><td data-label="Received">{new Date(e.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})}</td><td data-label="Status"><select disabled={saving.includes(e.id)} aria-label={`Status for ${e.name}`} value={status(e)} onChange={event=>change(e,event.target.value as Enquiry['status'])}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>{saving.includes(e.id)&&<small role="status">Saving…</small>}</td></tr>;})}</tbody></table></div>:<div className="empty-state"><h3>No enquiries match.</h3><p>Try another search or show all statuses.</p><button type="button" className="button outline small" onClick={()=>{setQuery('');setFilter('all');}}>Clear filters</button></div>}
 </div>;
}
