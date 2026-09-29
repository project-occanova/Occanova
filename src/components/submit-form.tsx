'use client';
import {useEffect,useRef,useState,type ComponentProps,type SubmitEvent as ReactSubmitEvent} from 'react';

type Control=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
type Issue={control:Control;message:string};
export function SubmitForm({children,onSubmit,onEdit,onInput,onChange,allowIncompleteDraft=false,...props}:ComponentProps<'form'>&{onEdit?:()=>void;allowIncompleteDraft?:boolean}){
 const[issues,setIssues]=useState<Issue[]>([]);const summary=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(issues.length)summary.current?.focus();},[issues]);
 function clear(){if(issues.length)setIssues([]);onEdit?.();}
 function submit(event:ReactSubmitEvent<HTMLFormElement>){
  if(allowIncompleteDraft&&(event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='draft'){setIssues([]);onSubmit?.(event);return;}
  const errors:Issue[]=[];
  for(const element of Array.from(event.currentTarget.elements)){
   if(!(element instanceof HTMLInputElement||element instanceof HTMLSelectElement||element instanceof HTMLTextAreaElement)||!element.willValidate)continue;
   const label=element.getAttribute('aria-label')||element.closest('.field')?.querySelector('span')?.textContent||({consent:'Terms and privacy consent',autopayConsent:'AutoPay consent',code:'Verification code'}[element.name as 'consent'])||element.name||'This field';
   const value=element.type==='password'?element.value:element.value.trim();
   const minLength='minLength' in element?element.minLength:-1;
   let message='';
   if(element.validity.valueMissing||(element.required&&!value))message=element.type==='checkbox'?`${label}: please confirm before continuing.`:`${label}: please complete this field.`;
   else if(minLength>0&&value&&value.length<minLength)message=`${label}: use at least ${minLength} characters.`;
   else if(element.validity.typeMismatch)message=`${label}: enter a valid ${element.type==='email'?'email address':'value'}.`;
   else if(element.validity.rangeUnderflow)message=`${label}: enter a value of at least ${(element as HTMLInputElement).min}.`;
   else if(!element.validity.valid)message=`${label}: check this field and try again.`;
   if(message)errors.push({control:element,message});
  }
  setIssues(errors);
  if(errors.length){event.preventDefault();onEdit?.();return;}
  onSubmit?.(event);
 }
 return <form {...props} noValidate onSubmit={submit} onInput={event=>{clear();onInput?.(event);}} onChange={event=>{clear();onChange?.(event);}}>
  {!!issues.length&&<div className="form-validation-summary" ref={summary} tabIndex={-1} role="alert"><strong>A few details need your attention.</strong><ul>{issues.slice(0,5).map(({control,message},index)=><li key={index}><button type="button" onClick={()=>control.focus()}>{message}</button></li>)}</ul>{issues.length>5&&<p>Complete the other required fields, then try again.</p>}</div>}
  {children}
 </form>;
}
