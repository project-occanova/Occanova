import Link from 'next/link';
import {redirect} from 'next/navigation';
import {ArrowLeft,LockKeyhole} from 'lucide-react';
import {AdminLoginForm} from '@/components/forms';
import {currentUser} from '@/lib/auth';
import {ensureConfiguredAdmin} from '@/lib/admin-bootstrap';
import {readOnlyDeployment} from '@/lib/config';

export const dynamic='force-dynamic';

export default async function AdminLogin(){
  const adminReady=await ensureConfiguredAdmin();
  const user=await currentUser();
  if(user?.role==='admin')redirect('/admin');
  return <main id="main" className="admin-login-shell">
    <section className="admin-login-brand">
      <Link href="/" className="admin-login-wordmark">OCCANOVA</Link>
      <div>
        <span>PRIVATE OPERATIONS</span>
        <h1>The quiet place behind every celebration.</h1>
        <p>Review partners, manage discovery, and keep the Occanova directory trusted.</p>
      </div>
      <small>Restricted to authorised Occanova administrators.</small>
    </section>
    <section className="admin-login-entry">
      <Link className="back-link" href="/"><ArrowLeft size={16}/>Return to website</Link>
      <div className="admin-login-card">
        <span className="admin-login-icon"><LockKeyhole size={22}/></span>
        <span className="section-label">ADMINISTRATION</span>
        <h2>Sign in to Admin Studio</h2>
        <p>{user?.role==='vendor'?'You are signed in as a vendor. Enter administrator credentials to switch to Admin Studio.':'Use your administrator credentials to continue.'}</p>
        {readOnlyDeployment()?<div className="notice">Administration is temporarily unavailable while the database is being connected.</div>:adminReady?<AdminLoginForm/>:<div className="notice">The administrator account is not configured yet.</div>}
      </div>
    </section>
  </main>;
}
