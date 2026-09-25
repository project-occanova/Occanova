import Link from 'next/link';
import {
  ArrowUpRight,
  ClipboardList,
  LayoutDashboard,
  Layers,
  Mail,
  Menu,
  Settings2,
  Store,
  type LucideIcon,
} from 'lucide-react';
import {Logout} from './forms';

type WorkspaceItem={href:string;label:string;icon:LucideIcon};

function WorkspaceLinks({items,markFirst=false}:{items:WorkspaceItem[];markFirst?:boolean}){
  return <>{items.map(({href,label,icon:Icon},index)=><a key={href} href={href} aria-current={markFirst&&index===0?'page':undefined}><Icon size={17} aria-hidden="true"/><span>{label}</span></a>)}</>;
}

export function Workspace({admin=false,children,email}:{admin?:boolean;children:React.ReactNode;email:string}){
  const base=admin?'/admin':'/dashboard';
  const primary:WorkspaceItem[]=[
    {href:`${base}#overview`,label:'Overview',icon:LayoutDashboard},
    {href:`${base}#${admin?'vendors':'profile'}`,label:admin?'Vendor review':'Business profile',icon:Store},
    {href:`${base}#enquiries`,label:'Enquiries',icon:Mail},
  ];
  const manage:WorkspaceItem[]=admin?[
    {href:`${base}#taxonomy`,label:'Categories & locations',icon:Layers},
    {href:`${base}#activity`,label:'Activity log',icon:ClipboardList},
    {href:`${base}#account`,label:'Account',icon:Settings2},
  ]:[{href:`${base}#account`,label:'Account',icon:Settings2}];
  const mobile=[...primary,{href:`${base}#account`,label:'Account',icon:Settings2}];

  return <div className={`workspace${admin?' admin-workspace':''}`}>
    <aside className="sidebar">
      <Link href={base} className="sidebar-brand">OCCANOVA<small>{admin?'ADMIN STUDIO':'VENDOR STUDIO'}</small></Link>
      <div className="sidebar-nav-groups">
        <div className="sidebar-nav-group"><span>Workspace</span><nav aria-label="Workspace navigation"><WorkspaceLinks items={primary} markFirst/></nav></div>
        <div className="sidebar-nav-group"><span>{admin?'Manage':'Settings'}</span><nav aria-label={admin?'Management navigation':'Account navigation'}><WorkspaceLinks items={manage}/></nav></div>
      </div>
      <div className="sidebar-bottom"><Link href="/">Visit website<ArrowUpRight size={16}/></Link><Logout redirectTo={admin?'/admin/login':'/login'}/></div>
    </aside>

    <div className="workspace-content">
      <header className="workspace-header"><span>{admin?'Occanova administration':'Manage your business'}</span><span>{email}</span></header>
      <header className="workspace-mobile-header">
        <Link href={base} className="workspace-mobile-brand">OCCANOVA<small>{admin?'ADMIN STUDIO':'VENDOR STUDIO'}</small></Link>
        <details className="workspace-more">
          <summary aria-label="Open workspace navigation"><Menu size={22} aria-hidden="true"/></summary>
          <div><nav aria-label="Mobile workspace navigation"><WorkspaceLinks items={[...primary,...manage]}/></nav><Link className="workspace-visit" href="/">Visit website<ArrowUpRight size={15}/></Link><Logout redirectTo={admin?'/admin/login':'/login'}/></div>
        </details>
      </header>
      <main id="main" className="workspace-main">{children}</main>
      <nav className="workspace-mobile-nav" aria-label="Primary workspace navigation"><WorkspaceLinks items={mobile} markFirst/></nav>
    </div>
  </div>;
}
