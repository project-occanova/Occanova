// The app works online and never caches vendor or customer data.
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.mode!=='navigate')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||url.pathname!=='/app'&&!url.pathname.startsWith('/app/'))return;
 event.respondWith(fetch(request).catch(()=>new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#315b1c"><title>Occanova is offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fffcf5;color:#20351c;font:16px/1.6 Arial,sans-serif;text-align:center;padding:24px;box-sizing:border-box}main{max-width:360px}h1{font:normal 36px/1.1 Georgia,serif;margin:0 0 16px}p{margin:0 0 22px}button{background:#315b1c;color:white;border:0;border-radius:6px;padding:14px 22px;font:inherit}</style><main><h1>We’ll be right here.</h1><p>Occanova needs a connection to show the latest vendors. Reconnect and try again.</p><button onclick="location.reload()">Try again</button></main></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
