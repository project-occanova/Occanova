const base=(process.env.SITE_URL||'https://www.occanova.com').replace(/\/$/,'');

async function request(path:string){
  const response=await fetch(base+path,{redirect:'follow',signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw Error(`${path} returned ${response.status}`);
  return response;
}

async function main(){
  const [home,directory,healthResponse,robots]=await Promise.all([request('/'),request('/vendors'),request('/api/health'),request('/robots.txt')]);
  const health=await healthResponse.json() as {ok?:boolean;database?:boolean;writable?:boolean;email?:boolean;storage?:boolean};
  const [homeText,directoryText,robotsText]=await Promise.all([home.text(),directory.text(),robots.text()]);
  if(!homeText.includes('Occanova')||!directoryText.includes('Find your kind of people.'))throw Error('Public page content marker is missing.');
  if(!health.ok||!health.database||!health.writable)throw Error(`Backend is unhealthy: ${JSON.stringify(health)}`);
  const expectedIndexable=process.env.EXPECT_INDEXABLE==='true';
  if(expectedIndexable===robotsText.includes('Disallow: /'))throw Error(`robots.txt does not match EXPECT_INDEXABLE=${expectedIndexable}.`);
  console.log(JSON.stringify({ok:true,base,database:health.database,writable:health.writable,email:health.email,storage:health.storage,indexable:expectedIndexable}));
}

main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
