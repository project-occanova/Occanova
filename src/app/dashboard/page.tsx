import Link from 'next/link';
import {ArrowRight,CheckCircle2,Circle} from 'lucide-react';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {hasStorage,mobileOtpEnabled} from '@/lib/config';
import {enquiryVendorNames} from '@/lib/directory';
import {readState} from '@/lib/store';
import {EnquiryTable,MobileVerification,PasswordForm,ProfileForm} from '@/components/forms';
import {Workspace} from '@/components/workspace';

export const metadata={robots:{index:false,follow:false,noarchive:true}};
export const dynamic='force-dynamic';

export default async function Dashboard(){
  const user=await currentUser();
  if(!user)redirect('/login');
  if(user.role==='admin')redirect('/admin');
  const s=await readState();
  const v=s.vendors.find(x=>x.userId===user.id);
  const enquiries=s.enquiries.filter(x=>x.vendorId===v?.id);
  const completion=v?Math.round([v.name,v.owner,v.category,v.service,v.city,v.description,v.phone,v.whatsapp,v.email,v.image,v.gallery.length].filter(Boolean).length/11*100):0;
  const steps=[
    ['Business details',!!(v?.name&&v.owner&&v.category&&v.service)],
    ['Coverage',!!(v?.city&&v.locations.length)],
    ['Media & verification',!!(v?.image&&v.gallery.length)],
    ['About the business',!!(v?.summary&&v.description)],
    ['Mobile number',Boolean(user.phoneVerified)],
  ] as const;
  const firstName=v?.owner.split(' ')[0];

  return <Workspace email={user.email}>
    <header id="overview" className="workspace-intro">
      <div><h1>{firstName?`Welcome back, ${firstName}.`:'Welcome to your vendor studio.'}</h1><p>Manage your profile, enquiries, and account from one clear workspace.</p></div>
      <span className={`status ${v?.status??'draft'}`}>{v?.status??'draft'}</span>
    </header>

    <section className="profile-overview" aria-labelledby="profile-status-heading">
      <div className="profile-status-card">
        <div className="workspace-section-heading"><div><h2 id="profile-status-heading">Your profile status</h2><p>Complete each part to help customers understand and trust your business.</p></div><strong>{completion}% complete</strong></div>
        <progress value={completion} max={100}/>
        <div className="profile-checklist">{steps.map(([label,done])=><span key={label} className={done?'complete':''}>{done?<CheckCircle2 size={17}/>:<Circle size={17}/>}{label}</span>)}</div>
        <a className="button" href="#profile">Continue profile <ArrowRight size={17}/></a>
      </div>
      <aside className="workspace-guidance"><h2>Get discovered across India.</h2><p>A complete and verified profile helps customers understand your work before they contact you.</p><div><strong>Simple. Credible. City by city.</strong><span>That’s Occanova.</span></div></aside>
    </section>

    <MobileVerification phone={user.phone} verified={Boolean(user.phoneVerified)} enabled={mobileOtpEnabled()}/>

    <div className="stat-grid workspace-stats">
      <div><span>Review status</span><strong className="capitalize">{v?.status??'Draft'}</strong></div>
      <div><span>New enquiries</span><strong>{enquiries.filter(x=>x.status==='new').length}</strong></div>
      <div><span>Total enquiries</span><strong>{enquiries.length}</strong></div>
      <div><span>Public listing</span><strong>{v?.published&&v.status==='approved'?'Published':'Not published'}</strong></div>
    </div>

    {v?.remarks&&<div className="notice workspace-notice"><strong>Occanova’s review:</strong> {v.remarks}</div>}

    <section id="profile" className="panel workspace-section">
      <div className="workspace-section-heading"><div><h2>Business profile</h2><p>Keep your services, locations, media, and public information up to date.</p></div>{v?.published&&v.status==='approved'&&<Link href={'/vendors/'+v.slug}>View public profile</Link>}</div>
      <ProfileForm vendor={v} categories={s.categories} locations={s.locations} email={user.email} phone={user.phone} storageEnabled={hasStorage()} mobileVerified={Boolean(user.phoneVerified)} mobileVerificationRequired={mobileOtpEnabled()}/>
    </section>

    <section id="enquiries" className="panel workspace-section">
      <div className="workspace-section-heading"><div><h2>Enquiries</h2><p>Customer requests sent directly to your business.</p></div><span>{enquiries.length} total</span></div>
      <EnquiryTable rows={enquiries.toReversed()} vendors={enquiryVendorNames(s.vendors,enquiries)}/>
    </section>

    <section id="account" className="panel workspace-section account-panel">
      <div className="workspace-section-heading"><div><h2>Account & security</h2><p>Signed in as {user.email}. Changing your password signs out all sessions.</p></div></div>
      <PasswordForm/>
    </section>
  </Workspace>;
}
