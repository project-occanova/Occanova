import Link from 'next/link';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {enquiryVendorNames,isFeatured,publicVendors} from '@/lib/directory';
import {readState} from '@/lib/store';
import {EnquiryTable,PasswordForm,TaxonomyForm} from '@/components/forms';
import {Workspace} from '@/components/workspace';
import {WorkspaceLiveUpdates} from '@/components/workspace-live-updates';
import {workspaceVersion} from '@/lib/workspace-version';
import {reviewLabels} from '@/lib/review-labels';
import {subscriptionPlans} from '@/lib/plans';

export const dynamic='force-dynamic';

export default async function Admin({searchParams}:{searchParams:Promise<Record<string,string>>}){
  const user=await currentUser();
  if(!user)redirect('/admin/login');
  if(user.role!=='admin')redirect('/dashboard');
  const s=await readState();
  const p=await searchParams;
  const filtered=s.vendors.filter(v=>(!p.q||`${v.name} ${v.service}`.toLowerCase().includes(p.q.toLowerCase()))&&(!p.status||v.status===p.status)&&(!p.category||v.category===p.category)&&(!p.service||v.service===p.service)&&(!p.city||v.city===p.city));
  const visible=publicVendors(s.vendors,{},s.users);const visibleIds=new Set(visible.map(vendor=>vendor.id));
  const pending=s.vendors.filter(x=>x.status==='pending').sort((a,b)=>(a.submittedAt||'').localeCompare(b.submittedAt||''));
  const registrations=s.registrations.filter(row=>!row.completedUserId&&(row.expires>Date.now()||row.subscription?.gatewayId)).toSorted((a,b)=>b.autopayConsentAt.localeCompare(a.autopayConsentAt));
  const awaitingProfiles=s.users.filter(account=>account.role==='vendor'&&account.verified&&!s.vendors.some(vendor=>vendor.userId===account.id));

  return <Workspace admin email={user.email}>
    <header id="overview" className="workspace-intro">
      <div><h1>Welcome back.</h1><p>Review vendors, manage discovery, and keep the Occanova directory healthy.</p></div>
      <span className="workspace-date">{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
    </header>

    <WorkspaceLiveUpdates admin version={workspaceVersion(s,user)}/>
    <div className="stat-grid workspace-stats admin-stats">
      <div><span>Total vendors</span><strong>{s.vendors.length}</strong></div>
      <div><Link href="/admin?status=pending#vendors"><span>Pending review</span><strong>{pending.length}</strong><small>Open review queue →</small></Link></div>
      <div><span>Public profiles</span><strong>{visible.length}</strong></div>
      <div><span>Total enquiries</span><strong>{s.enquiries.length}</strong></div>
    </div>

    <section id="pending-reviews" className="panel workspace-section attention-section" aria-labelledby="attention-heading">
      <div className="workspace-section-heading"><div><h2 id="attention-heading">Pending reviews ({pending.length})</h2><p>Review the oldest submissions first. New submissions appear here automatically.</p></div><Link href="/admin?status=pending#vendors">View all pending</Link></div>
      {pending.length?<div className="attention-list">{pending.slice(0,5).map(v=><article key={v.id}><div><strong>{v.name}</strong><span>{v.category} · {v.city}</span>{v.submittedAt&&<small>Submitted {new Date(v.submittedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',timeZone:'Asia/Kolkata'})}</small>}</div><span className="status pending">Pending review</span><Link className="button small" href={'/admin/vendors/'+v.id}>Review</Link></article>)}</div>:<div className="empty-state compact"><h3>You’re all caught up.</h3><p>New submissions will appear here for review.</p></div>}
    </section>

    <section id="registrations" className="panel workspace-section" aria-labelledby="registration-progress-heading">
      <div className="workspace-section-heading"><div><h2 id="registration-progress-heading">Registration progress</h2><p>Accounts activate after email verification and AutoPay authorization. Profile review happens afterwards.</p></div><span>{registrations.length} in progress</span></div>
      <div className="registration-rollout-counts"><span><strong>{registrations.filter(row=>!row.verified).length}</strong> Awaiting email verification</span><span><strong>{registrations.filter(row=>row.verified).length}</strong> Awaiting AutoPay setup</span><span><strong>{awaitingProfiles.length}</strong> Accounts awaiting a profile</span></div>
      {registrations.length?<><p className="quiet-note">Latest {Math.min(10,registrations.length)} registrations. Vendors can use Log in to resume setup or Resend verification email. AutoPay authorization cannot be bypassed by an administrator.</p><div className="table-wrap responsive-table"><table><thead><tr><th>Vendor contact</th><th>Plan</th><th>Next step</th><th>Latest step</th></tr></thead><tbody>{registrations.slice(0,10).map(row=><tr key={row.id}><td data-label="Contact"><strong>{row.email}</strong><small>{row.phone}</small></td><td data-label="Plan">{subscriptionPlans[row.plan].name}<small>₹{subscriptionPlans[row.plan].monthlyRupees}/month · GST included</small></td><td data-label="Next step">{!row.verified?'Verify email':row.subscription?.gatewayId?'Finish or check AutoPay authorization':'Set up AutoPay'}{row.subscription&&<small>Mandate: {row.subscription.status}</small>}</td><td data-label="Latest step">{new Date(row.autopayConsentAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})}</td></tr>)}</tbody></table></div></>:<div className="empty-state compact"><h3>No unfinished registrations.</h3><p>New signups will appear here until their accounts activate.</p></div>}
    </section>

    <section id="vendors" className="panel workspace-section">
      <div className="workspace-section-heading"><div><h2>Vendor directory</h2><p>Search, review, publish, and manage every registered business.</p></div><span>{filtered.length} vendors</span></div>
      <form className="admin-filters" action="/admin">
        <input name="q" defaultValue={p.q} placeholder="Search business name" aria-label="Search business name"/>
        <select name="status" defaultValue={p.status} aria-label="Approval status"><option value="">All statuses</option>{['draft','pending','approved','rejected','suspended','inactive'].map(x=><option key={x} value={x}>{reviewLabels[x as keyof typeof reviewLabels]}</option>)}</select>
        <select name="category" defaultValue={p.category} aria-label="Category"><option value="">All categories</option>{s.categories.map(x=><option key={x.slug}>{x.name}</option>)}</select>
        <select name="service" defaultValue={p.service} aria-label="Subcategory"><option value="">All subcategories</option>{s.categories.map(x=><optgroup key={x.slug} label={x.name}>{x.services?.map(service=><option key={service}>{service}</option>)}</optgroup>)}</select>
        <select name="city" defaultValue={p.city} aria-label="City"><option value="">All cities</option>{s.locations.map(x=><option key={x.slug}>{x.name}</option>)}</select>
        <button className="button small">Apply filters</button>
      </form>
      <div className="table-wrap responsive-table"><table><thead><tr><th>Business</th><th>Service / location</th><th>Status</th><th>Visibility</th><th>Action</th></tr></thead><tbody>{filtered.map(v=><tr key={v.id}><td data-label="Business"><strong>{v.name}</strong>{v.sample&&<small>Sample listing</small>}</td><td data-label="Service / location">{v.category}<small>{v.service} · {v.city}</small></td><td data-label="Status"><span className={'status '+v.status}>{reviewLabels[v.status]}</span></td><td data-label="Visibility">{visibleIds.has(v.id)?'Public':'Hidden'}{isFeatured(v)&&<small>Featured · priority {v.priority}</small>}</td><td data-label="Action"><Link className="button outline small" href={'/admin/vendors/'+v.id}>Review</Link></td></tr>)}</tbody></table>{!filtered.length&&<p className="empty-state">No vendors match these filters.</p>}</div>
    </section>

    <section id="enquiries" className="panel workspace-section">
      <div className="workspace-section-heading"><div><h2>Enquiries</h2><p>Customer requests sent through approved vendor profiles.</p></div><span>{s.enquiries.length} total</span></div>
      <EnquiryTable rows={s.enquiries.toReversed()} vendors={enquiryVendorNames(s.vendors,s.enquiries)}/>
    </section>

    <section id="taxonomy" className="two-panels workspace-section-grid">
      <div className="panel workspace-section"><div className="workspace-section-heading"><div><h2>Categories & subcategories</h2><p>Review the services customers can filter by, and add new ones.</p></div></div><TaxonomyForm type="categories" items={s.categories}/></div>
      <div className="panel workspace-section"><div className="workspace-section-heading"><div><h2>Operating locations</h2><p>Manage the cities and service areas vendors can select.</p></div></div><TaxonomyForm type="locations" items={s.locations}/></div>
    </section>

    <section id="activity" className="panel workspace-section">
      <div className="workspace-section-heading"><div><h2>Activity log</h2><p>A record of important review and directory changes.</p></div></div>
      {s.audit.length?<div className="activity-list">{s.audit.slice(0,30).map(x=><div key={x.id}><strong>{x.target}</strong><p>{x.action} · {x.remarks}</p><small>{x.actor} · {new Date(x.at).toLocaleString('en-IN')}</small></div>)}</div>:<div className="empty-state compact"><h3>No activity yet.</h3><p>Approval and visibility decisions will be recorded here.</p></div>}
    </section>

    <section id="account" className="panel workspace-section account-panel">
      <div className="workspace-section-heading"><div><h2>Admin account</h2><p>Signed in as {user.email}. Changing your password signs out all sessions.</p></div></div>
      <PasswordForm redirectTo="/admin/login"/>
    </section>
  </Workspace>;
}
