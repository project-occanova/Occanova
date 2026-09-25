import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {readState} from '@/lib/store';
import {Workspace} from '@/components/workspace';
import {AdminLifecycleForm,AdminVendorDetailsForm,AdminVendorForm} from '@/components/forms';
import {mobileOtpEnabled} from '@/lib/config';
export default async function Review({params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)redirect('/admin/login');if(user.role!=='admin')redirect('/dashboard');
 const {id}=await params;const state=await readState();const v=state.vendors.find(x=>x.id===id);if(!v)notFound();const account=state.users.find(x=>x.id===v.userId);
 return <Workspace admin email={user.email}>
  <Link className="back-link" href="/admin">← Back to all vendors</Link>
  <header id="overview" className="workspace-intro review-intro"><div><h1>{v.name}</h1><p>{v.category} · {v.service||'General service'} · {v.city}{v.sample?' · Sample listing':''}</p></div><span className={'status '+v.status}>{v.status}</span></header>
  <div className="review-summary"><div><span>Primary city</span><strong>{v.city}</strong></div><div><span>Service areas</span><strong>{v.locations.length}</strong></div><div><span>Portfolio images</span><strong>{v.gallery.length}</strong></div><div><span>Listing</span><strong>{v.published&&v.status==='approved'?'Public':'Hidden'}</strong></div></div>
  <section className="panel workspace-section review-decision"><div className="workspace-section-heading"><div><h2>Review & visibility</h2><p>Approve the profile, control public visibility, and record a clear decision.</p></div></div><AdminVendorForm vendor={v}/></section>
  <section className="panel workspace-section"><div className="workspace-section-heading"><div><h2>Business information</h2><p>Review and correct the vendor’s public details before approval.</p></div></div><AdminVendorDetailsForm vendor={v} categories={state.categories} locations={state.locations}/></section>
  <div className="two-panels workspace-section-grid">
   <section className="panel workspace-section"><div className="workspace-section-heading"><div><h2>Media & verification</h2><p>Review public portfolio media and private verification documents.</p></div></div><h3>Portfolio</h3>{v.gallery.length?<div className="review-gallery">{v.gallery.map((x,i)=><a href={x} key={x} target="_blank" rel="noreferrer"><img src={x} alt={`Portfolio ${i+1}`}/></a>)}</div>:<p className="notice">No portfolio images have been uploaded.</p>}<h3>Verification documents</h3>{v.documents?.length?<div className="document-links">{v.documents.map((x,i)=><a href={x} key={x} target="_blank" rel="noreferrer">Open document {i+1}</a>)}</div>:<p className="notice">No verification documents have been uploaded.</p>}<dl className="review-details"><div><dt>Public slug</dt><dd>{v.slug}</dd></div><div><dt>Listing type</dt><dd>{v.sample?'Illustrative sample':'Vendor account'}</dd></div></dl></section>
   <section className="panel workspace-section"><div className="workspace-section-heading"><div><h2>Account access</h2><p>Check account verification, or deactivate and restore access with an audited reason.</p></div></div><dl className="review-details account-verification"><div><dt>Account email</dt><dd>{account?.email||'No linked account'}</dd></div><div><dt>Mobile number</dt><dd>{account?.phone||'Not provided'}</dd></div><div><dt>Mobile verification</dt><dd><span className={`status ${account?.phoneVerified?'verified':'pending'}`}>{account?.phoneVerified?'Verified':'Required'}</span></dd></div></dl>{v.userId&&mobileOtpEnabled()&&!account?.phoneVerified&&<p className="notice">This vendor cannot be approved until the account mobile number is verified by OTP.</p>}<AdminLifecycleForm vendor={v}/></section>
  </div>
 </Workspace>;
}
