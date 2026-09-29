import type {ZodIssue} from 'zod';

const labels:Record<string,string>={email:'Email address',phone:'Mobile number',password:'Password',current:'Current password',name:'Name',owner:'Owner / contact person',summary:'Short service summary',description:'Business description',category:'Service category',service:'Subcategory',city:'City',locations:'Service locations',price:'Starting price',experience:'Years of experience',whatsapp:'WhatsApp number',message:'Message',contact:'Email or mobile number',date:'Event date',remarks:'Review remarks',consent:'Terms and privacy consent',autopayConsent:'AutoPay consent',plan:'Plan',featuredEnd:'Featured end date',featuredStart:'Featured start date'};
export function validationFeedback(issue:ZodIssue){
 const label=labels[String(issue.path[0])]||'This field';
 if(issue.code==='too_small')return `${label}: ${issue.type==='string'?`use at least ${issue.minimum} characters.`:issue.type==='array'?`select at least ${issue.minimum} option.`:`enter a value of at least ${issue.minimum}.`}`;
 if(issue.code==='too_big')return `${label}: ${issue.type==='string'?`use no more than ${issue.maximum} characters.`:issue.type==='array'?`select no more than ${issue.maximum} options.`:`enter a value no greater than ${issue.maximum}.`}`;
 if(issue.code==='invalid_literal')return `${label}: please confirm before continuing.`;
 if(issue.code==='invalid_type')return `${label}: ${issue.received==='undefined'?'please complete this field.':'enter a valid value.'}`;
 if(issue.code==='invalid_string'&&issue.validation==='email')return `${label}: enter a valid email address.`;
 if(issue.code==='custom'||issue.message.startsWith('Enter a valid'))return `${label}: ${issue.message}.`;
 return `${label}: check this field and try again.`;
}
