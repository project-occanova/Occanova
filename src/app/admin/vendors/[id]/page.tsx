import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {readState} from '@/lib/store';
import {Workspace} from '@/components/workspace';
import {AdminLifecycleForm,AdminVendorDetailsForm,AdminVendorForm} from '@/components/forms';
export default async function Review({params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)redirect('/admin/login');if(user.role!=='admin')redirect('/dashboard');
 const {id}=await params;const state=await readState();const v=state.vendors.find(x=>x.id===id);if(!v)notFound();
 return <Workspace admin email={user.email}>
  <Link className="back-link" href="/admin">← Back to all vendors</Link>
  <div className="page-heading"><h1>{v.name}</h1><p>{v.category} · {v.service||'General service'} · {v.city}{v.sample?' · Sample listing':''}</p></div>
  <section className="panel"><div className="section-heading"><div><span className="section-label">Vendor record</span><h2>Business details</h2></div><span className={'status '+v.status}>{v.status}</span></div><AdminVendorDetailsForm vendor={v} categories={state.categories} locations={state.locations}/></section>
  <div className="two-panels">
   <section className="panel"><h2>Portfolio & verification</h2><p>Public media and private documents remain linked to the vendor’s storage account.</p><h3>Portfolio</h3>{v.gallery.length?<div className="review-gallery">{v.gallery.map((x,i)=><a href={x} key={x} target="_blank" rel="noreferrer"><img src={x} alt={`Portfolio ${i+1}`}/></a>)}</div>:<p className="notice">No portfolio images have been uploaded.</p>}<h3>Verification documents</h3>{v.documents?.length?<div className="document-links">{v.documents.map((x,i)=><a href={x} key={x} target="_blank" rel="noreferrer">Open document {i+1}</a>)}</div>:<p className="notice">No verification documents have been uploaded.</p>}<dl className="review-details"><div><dt>Public slug</dt><dd>{v.slug}</dd></div><div><dt>Listing type</dt><dd>{v.sample?'Illustrative sample':'Vendor account'}</dd></div></dl></section>
   <section className="panel"><h2>Review & visibility</h2><p>Only approved and published profiles appear in public discovery.</p><AdminVendorForm vendor={v}/><div className="panel-divider"><h3>Account access</h3><AdminLifecycleForm vendor={v}/></div></section>
  </div>
 </Workspace>;
}
