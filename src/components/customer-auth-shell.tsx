import type {ReactNode} from 'react';
import {Header,Footer,PreviewNotice} from './ui';

export function CustomerAuthShell({title,subtitle,heading,children}:{title:string;subtitle:string;heading:string;children:ReactNode}){
 return <><Header/><main id="main" className="container auth-layout"><div className="auth-intro"><img className="full-logo" src="/occanova-logo.jpg" alt="Occanova — Your event, your way."/><h1>{title}</h1><p>{subtitle}</p></div><div className="panel auth-panel"><h2>{heading}</h2>{children}</div></main><Footer/><PreviewNotice/></>;
}
