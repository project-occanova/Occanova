const base=(process.env.SITE_URL||'https://www.occanova.com').replace(/\/$/,'');

async function request(path:string){
  const response=await fetch(base+path,{redirect:'follow',signal:AbortSignal.timeout(45_000)});
  if(!response.ok)throw Error(`${path} returned ${response.status}`);
  return response;
}

async function main(){
  const [home,directory,healthResponse,robots,vendorsResponse]=await Promise.all([request('/'),request('/vendors'),request('/api/health'),request('/robots.txt'),request('/api/vendors')]);
  const health=await healthResponse.json() as {ok?:boolean;database?:boolean;writable?:boolean;email?:boolean;mobileOtp?:boolean;storage?:boolean;intake?:boolean};
  const [homeText,directoryText,robotsText]=await Promise.all([home.text(),directory.text(),robots.text()]);
  if(!homeText.includes('Occanova')||!directoryText.includes('Find your kind of people.'))throw Error('Public page content marker is missing.');
  if(!health.ok||!health.database||!health.writable)throw Error(`Backend is unhealthy: ${JSON.stringify(health)}`);
  const expectedIndexable=process.env.EXPECT_INDEXABLE==='true';
  const expectedIntake=process.env.EXPECT_INTAKE==='true';
  if(expectedIndexable===/^Disallow:\s*\/\s*$/m.test(robotsText))throw Error(`robots.txt does not match EXPECT_INDEXABLE=${expectedIndexable}.`);
  if(typeof health.intake!=='boolean')throw Error('Deployment does not expose the public-intake release marker yet.');
  if(Boolean(health.intake)!==expectedIntake)throw Error(`Public intake does not match EXPECT_INTAKE=${expectedIntake}.`);
  const vendors=await vendorsResponse.json() as Record<string,unknown>[];
  if(!Array.isArray(vendors))throw Error('Vendor directory API did not return a list.');
  for(const vendor of vendors)for(const key of ['userId','owner','remarks','documents']){
    if(Object.hasOwn(vendor,key))throw Error(`Private vendor field ${key} appeared in the public API.`);
  }
  if(vendors[0]?.slug){
    const profile=await request(`/vendors/${encodeURIComponent(String(vendors[0].slug))}`);
    const html=await profile.text();
    if(!html.includes('application/ld+json'))throw Error('Vendor structured data is missing.');
    if(/\\?"(?:documents|remarks|userId)\\?":/.test(html))throw Error('Private vendor fields appeared in the public profile payload.');
  }
  console.log(JSON.stringify({ok:true,base,database:health.database,writable:health.writable,email:health.email,mobileOtp:health.mobileOtp,storage:health.storage,intake:health.intake,indexable:expectedIndexable}));
}

main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
