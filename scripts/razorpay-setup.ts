import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import {resolve} from 'node:path';
import {planIds,subscriptionPlans,type PlanId} from '../src/lib/plans';

type GatewayPlan={id:string;period:string;interval:number;item:{name:string;amount:number;currency:string};notes?:Record<string,string>};
const envPath=resolve('.env.local');
const create=process.argv.includes('--create');
function matches(plan:GatewayPlan,id:PlanId){return /^plan_[A-Za-z0-9]+$/.test(plan.id)&&plan.period==='monthly'&&plan.interval===1&&plan.item?.amount===subscriptionPlans[id].monthlyRupees*100&&plan.item?.currency==='INR';}

async function main(){
 let original='';
 try{original=await readFile(envPath,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 const env=parseEnv(original);
 const key=env.RAZORPAY_KEY_ID||process.env.RAZORPAY_KEY_ID||'';
 const secret=env.RAZORPAY_KEY_SECRET||process.env.RAZORPAY_KEY_SECRET||'';
 if(!/^rzp_test_[A-Za-z0-9]+$/.test(key)||!secret){
  throw Error('Add a Test Key ID (rzp_test_...) and Key Secret to .env.local. Live keys are refused by this command.');
 }
 const auth=Buffer.from(`${key}:${secret}`).toString('base64');
 async function api<T>(path:string,body?:unknown):Promise<T>{
  const response=await fetch(`https://api.razorpay.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`Razorpay returned HTTP ${response.status}. Check Test Mode credentials and Subscriptions access in the dashboard.`);
  return await response.json() as T;
 }
 const all:GatewayPlan[]=[];
 // Read every page before creating anything, so a retry reuses earlier successful plans.
 for(let skip=0;;skip+=100){
  const page=await api<{items:GatewayPlan[]}>(`plans?count=100&skip=${skip}`);
  if(!Array.isArray(page.items))throw Error('Razorpay returned an unexpected plan response.');
  all.push(...page.items);
  if(page.items.length<100)break;
  if(skip>=9900)throw Error('Too many plans to search safely. Set the four plan IDs manually.');
 }
 console.log('Connected to Razorpay Test Mode.');
 const updates:Record<string,string>={};
 let missing=false;
 for(const id of planIds){
  const variable=`RAZORPAY_PLAN_${id.toUpperCase()}`;
  const configured=env[variable];
  let plan=configured?all.find(item=>item.id===configured):undefined;
  if(configured&&!plan)plan=await api<GatewayPlan>(`plans/${configured}`);
  if(configured&&(!plan||!matches(plan,id)))throw Error(`${variable} does not match the monthly INR price. Correct it before continuing.`);
  plan??=all.find(item=>matches(item,id)&&(item.notes?.occanova_plan===id||item.item.name===`Occanova ${subscriptionPlans[id].name}`));
  if(!plan&&create){
   plan=await api<GatewayPlan>('plans',{period:'monthly',interval:1,item:{name:`Occanova ${subscriptionPlans[id].name}`,amount:subscriptionPlans[id].monthlyRupees*100,currency:'INR',description:'Monthly vendor subscription; trial is scheduled on the subscription, not the plan.'},notes:{occanova_plan:id}});
   if(!matches(plan,id))throw Error(`Unexpected response while creating ${subscriptionPlans[id].name}.`);
  }
  if(!plan){console.log(`${subscriptionPlans[id].name}: missing. Run npm run billing:setup to create it.`);missing=true;continue;}
  updates[variable]=plan.id;
  console.log(`${subscriptionPlans[id].name}: INR ${subscriptionPlans[id].monthlyRupees}/month - ${plan.id}`);
 }
 if(missing){process.exitCode=1;return;}
 if(!create){console.log(`Webhook secret: ${env.RAZORPAY_WEBHOOK_SECRET?'configured locally (delivery still needs testing)':'missing'}. Billing flag: ${env.SUBSCRIPTIONS_ENABLED==='true'?'enabled locally':'off'}.`);return;}
 // Do not erase unrelated local settings or enable billing automatically.
 if(await readFile(envPath,'utf8').catch(()=> '')!==original)throw Error('.env.local changed during setup. Retry before saving.');
 if(!env.RAZORPAY_WEBHOOK_SECRET)updates.RAZORPAY_WEBHOOK_SECRET=randomBytes(32).toString('hex');
 if(!env.SUBSCRIPTIONS_ENABLED)updates.SUBSCRIPTIONS_ENABLED='false';
 let next=original;
 for(const [name,value] of Object.entries(updates)){
  const pattern=new RegExp(`^${name}=.*$`,'gm');
  const entry=`${name}=${value}`;
  next=pattern.test(next)?next.replace(pattern,entry):`${next.trimEnd()}\n${entry}\n`;
 }
 const temporary=`${envPath}.${randomBytes(8).toString('hex')}.tmp`;
 try{await writeFile(temporary,next,{mode:0o600,flag:'wx'});await rename(temporary,envPath);}finally{await unlink(temporary).catch(()=>{});}
 console.log('Saved plan IDs and a local webhook secret in ignored .env.local. Billing remains at its existing setting.');
 console.log('A local webhook secret alone does not connect webhook delivery. Configure a public test endpoint before launch.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Razorpay setup failed.');process.exitCode=1;});
