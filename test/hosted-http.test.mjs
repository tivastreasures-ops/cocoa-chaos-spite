import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,dirname,basename,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';
import {request} from 'node:http';
import {Readable} from 'node:stream';
test('hosted HTTP guards Director controls and isolates revocable overlay access without live services',async()=>{
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const dir=await mkdtemp(join(tmpdir(),'cc-hosted-')),origin='https://companion.example.com',password='fake-director-password-for-http-tests',overlayToken='fake-overlay-token-for-http-tests-only';
 const child=spawn(process.execPath,['app.cjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,CC_HOSTED:'1',CC_PREVIEW_ONLY:'1',PORT:String(port),PUBLIC_ORIGIN:origin,CC_DATA_DIR:dir,CC_DIRECTOR_PASSWORD:password,CC_OVERLAY_TOKEN:overlayToken,TWITCH_REDIRECT_URI:origin+'/auth/twitch/callback'},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
 // Model a TLS reverse proxy forwarding the original Host to its HTTP backend.
 const req=(path,options={})=>new Promise((resolve,reject)=>{
  const q=request({hostname:'127.0.0.1',port,path,method:options.method||'GET',headers:{Host:'companion.example.com',...options.headers}},r=>resolve(new Response(Readable.toWeb(r),{status:r.statusCode,headers:r.headers})));
  q.on('error',reject);q.setTimeout(6000,()=>q.destroy(Error('Test request timed out')));if(options.body)q.write(options.body);q.end();
 });
 let publicReader,privateReader;
 try{
  let ready=false;for(let i=0;i<60;i++){try{if((await req('/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.equal(ready,true,log);
  const home=await req('/');assert.match(await home.text(),/Director’s entrance/);assert.equal(home.headers.get('set-cookie'),null);
  for(const path of ['/api/status','/api/sebastian/events','/api/events','/auth/twitch'])assert.equal((await req(path)).status,401);
  assert.equal((await req('/api/status',{headers:{Cookie:'cc_admin=guessed'}})).status,401);
  const badHost=await fetch('http://127.0.0.1:'+port+'/health');assert.equal(badHost.status,403);
  const login=await req('/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password})});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/Secure/);const director=login.headers.get('set-cookie').split(';')[0];
  const state=await(await req('/api/status',{headers:{Cookie:director}})).json();assert.equal(state.hosted,true);assert.equal(state.previewOnly,true);assert.equal(JSON.stringify(state).includes(overlayToken),false);assert.equal(JSON.stringify(state).includes(password),false);
  const post=async(path,b,headers={})=>{await new Promise(r=>setTimeout(r,300));return req(path,{method:'POST',headers:{Origin:origin,Cookie:director,'X-CSRF-Token':state.csrf,'Content-Type':'application/json',...headers},body:JSON.stringify(b)});};
  assert.equal((await post('/api/sebastian/test',{}, {'X-CSRF-Token':'wrong'})).status,403);
  const link=await(await post('/api/overlay-link',{})).json();assert.equal(new URL(link.url).origin,origin);assert.equal(new URL(link.url).search,'');
  const exchange=await req('/api/overlay-session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:overlayToken})});assert.equal(exchange.status,200);const overlay=exchange.headers.get('set-cookie').split(';')[0];
  assert.equal((await req('/api/status',{headers:{Cookie:overlay}})).status,401);assert.equal((await req('/api/sebastian/events',{headers:{Cookie:overlay}})).status,401);
  assert.equal((await post('/api/preview',{effect:'hello'},{Cookie:overlay})).status,401);
  publicReader=(await req('/api/events',{headers:{Cookie:overlay}})).body.getReader();await publicReader.read();
  privateReader=(await req('/api/sebastian/events',{headers:{Cookie:director}})).body.getReader();await privateReader.read();
  assert.equal((await post('/api/sebastian/settings',{route:'overlay'})).status,200);await publicReader.read();
  assert.equal((await post('/api/sebastian/test',{})).status,200);assert.match(new TextDecoder().decode((await publicReader.read()).value),/stream.voice.audio/);
  assert.equal((await post('/api/sebastian/start',{approvePaid:true})).status,400);
  assert.equal((await post('/api/logout',{})).status,200);assert.equal((await req('/api/status',{headers:{Cookie:director}})).status,401);
  assert.equal((await req('/.private/tokens.json')).status,404);assert.equal((await req('/manifest.webmanifest')).status,200);
 }finally{
  await publicReader?.cancel().catch(()=>{});await privateReader?.cancel().catch(()=>{});child.kill();await Promise.race([once(child,'exit').catch(()=>{}),new Promise(r=>setTimeout(r,1000))]);
  assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('cc-hosted-'));await rm(dir,{recursive:true,force:true});
 }
});
