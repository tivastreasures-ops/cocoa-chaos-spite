import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {join} from 'node:path';
import {root,origin,redirect,scopes,canvas} from './config.mjs';
import {Auth} from './auth.mjs';
import {Commands} from './commands.mjs';
import {Transport,event,clean} from './events.mjs';
import {Assistant} from './assistant.mjs';
import {Twitch} from './twitch.mjs';
import {createVoiceBridge} from './voice.mjs';
const auth=new Auth();await auth.init();
const transport=new Transport(),assistant=new Assistant(),logs=[],pendingVoice=[];
// Internal integration bus keeps chat context off the public overlay feed.
export const integrationBus=new EventEmitter();
const admin=randomBytes(32).toString('hex');
function log(message){logs.push({time:new Date().toISOString(),message});if(logs.length>40)logs.shift();console.log(new Date().toISOString(),message);}
const commands=new Commands(e=>{integrationBus.emit(e.type,e);if(e.type==='stream.overlay.effect')transport.emit(e);},message=>auth.reply(message));
let lastChat=null,liveCount=0,previewCount=0;
const twitch=new Twitch(auth,async m=>{lastChat={name:m.name,text:m.text,time:new Date().toISOString()};liveCount++;assistant.add(m);integrationBus.emit('stream.chat.received',event('stream.chat.received','twitch',{id:m.id,name:m.name,text:m.text}));log('Real Twitch chat received');try{const result=await commands.handle(m);if(result!=='ignored')log(`Chat command: ${result}`);}catch{log('Command effect sent; Twitch reply failed');}},log);
const bridge=createVoiceBridge({assistant,commands,auth,diagnostic:log});
const states=new Map();let lastAction=0;
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function cookie(req,name){return req.headers.cookie?.split('; ').find(v=>v.startsWith(name+'='))?.slice(name.length+1);}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>10000)throw Error('Request too large');}return JSON.parse(s||'{}');}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}
async function validate(){try{await auth.validate();if(auth.account&&twitch.stopped)twitch.start();}catch{twitch.stop();await auth.disconnect();log('Authorization validation failed; please connect Twitch again');}}
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
  try{
    if(req.headers.host!=='localhost:3000'){json(res,403,{error:'Use localhost:3000'});return;}
    const u=new URL(req.url,origin),path=u.pathname;
    if(req.method==='POST'){
      const voice=path==='/api/voice';
      if(voice){const key=process.env.VOICE_BRIDGE_TOKEN;if(!key||key.length<32||!equal(req.headers.authorization,`Bearer ${key}`)){json(res,401,{error:'Voice bridge disabled or unauthorized'});return;}}
      else if(req.headers.origin!==origin||!equal(req.headers['x-csrf-token'],admin)||!equal(cookie(req,'cc_admin'),admin)){json(res,403,{error:'Open the local dashboard before using controls'});return;}
      if(Date.now()-lastAction<250){json(res,429,{error:'Slow down'});return;}lastAction=Date.now();
      const b=await body(req);
      if(path==='/api/setup'){await auth.configure(b.clientId,b.clientSecret);json(res,200,{ok:true});}
      else if(path==='/api/reconnect'){twitch.reconnect();json(res,200,{ok:true});}
      else if(path==='/api/disconnect'){twitch.stop();await auth.disconnect();json(res,200,{ok:true});}
      else if(path==='/api/preview'){if(!['hello','cocoa','chaos'].includes(b.effect))throw Error('Invalid effect');const result=await commands.handle({text:'!'+b.effect,userId:'director-preview',name:'Director · preview',id:'preview-'+Date.now(),privileged:true},'preview');if(result==='executed')previewCount++;json(res,200,{result});}
      else if(path==='/api/suggest'){json(res,200,assistant.suggest(b.messageId,b.action,b.reason));}
      else if(path==='/api/decision'){json(res,200,assistant.decide(b.id,b.approved===true));}
      else if(path==='/api/reply'){if(typeof b.message!=='string'||!b.message.trim()||b.message.length>450)throw Error('Reply must be 1–450 characters');if(Date.now()-(server.lastReply||0)<6000)throw Error('Reply cooldown');server.lastReply=Date.now();await auth.reply(b.message);json(res,200,{ok:true});}
      else if(path==='/api/voice'){if(pendingVoice.length>=20)throw Error('Voice approval queue full');const result=await bridge(b.name,b.arguments);if(result.approvalRequired){result.id=randomBytes(12).toString('hex');pendingVoice.push({id:result.id,...result.request});}json(res,200,result);}
      else if(path==='/api/voice-decision'){
        const index=pendingVoice.findIndex(v=>v.id===b.id);if(index<0)throw Error('Request not found');const [v]=pendingVoice.splice(index,1);
        if(b.approved===true){if(v.kind==='reply')await auth.reply(v.message);else await commands.handle({text:'!'+v.effect,userId:'director-voice',name:'Director',id:v.id,privileged:true},'director');}json(res,200,{ok:true});
      }else json(res,404,{error:'Unknown route'});
      return;
    }
    if(req.method!=='GET'){json(res,405,{error:'Method not allowed'});return;}
    if(path==='/auth/twitch'){
      if(!equal(cookie(req,'cc_admin'),admin))throw Error('Open dashboard first');
      if(!auth.configured)throw Error('Enter existing Twitch application credentials first');
      for(const [k,v] of states)if(v<Date.now())states.delete(k);
      if(states.size>=20)throw Error('Too many authorization attempts; wait ten minutes');
      const state=randomBytes(32).toString('hex');states.set(state,Date.now()+600000);
      res.writeHead(302,{Location:'https://id.twitch.tv/oauth2/authorize?'+new URLSearchParams({client_id:auth.clientId,redirect_uri:redirect,response_type:'code',scope:scopes.join(' '),state,force_verify:'true'}),'Set-Cookie':`cc_oauth=${state}; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=600`});res.end();return;
    }
    if(path==='/auth/twitch/callback'){
      const state=u.searchParams.get('state');if(!state||!equal(cookie(req,'cc_oauth'),state)||!states.has(state)||states.get(state)<Date.now())throw Error('OAuth state invalid or expired');states.delete(state);
      const code=u.searchParams.get('code');if(!code||u.searchParams.has('error'))throw Error('Twitch authorization was not completed');
      twitch.stop();try{await auth.authorize(code);}catch(e){await auth.disconnect();throw e;}twitch.start();log('Twitch account authorized');res.writeHead(302,{Location:'/','Set-Cookie':'cc_oauth=; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=0'});res.end();return;
    }
    if(path==='/api/events'){
      if(transport.overlays.size>=12){json(res,429,{error:'Too many overlays'});return;}
      res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});res.write(': connected\n\n');transport.add(res);return;
    }
    if(path==='/api/canvas'){json(res,200,canvas);return;}
    if(path==='/api/status'){
      if(!equal(cookie(req,'cc_admin'),admin)){json(res,403,{error:'Open dashboard'});return;}
      json(res,200,{csrf:admin,configured:auth.configured,account:auth.account,channel:auth.account?.login||null,eventsub:twitch.status,lastChat,overlays:transport.overlays.size,liveCount,previewCount,summary:assistant.summary(),queue:assistant.queue,voiceRequests:pendingVoice,logs,canvas,voice:'Sebastian live voice: not connected; authenticated tool contract only'});return;
    }
    const files={'/':'dashboard.html','/overlay':'overlay.html','/dashboard.js':'dashboard.js','/overlay.js':'overlay.js','/style.css':'style.css','/overlay.css':'overlay.css'};
    if(!files[path]){json(res,404,{error:'Not found'});return;}
    if(path==='/'){res.setHeader('Set-Cookie',`cc_admin=${admin}; HttpOnly; SameSite=Strict; Path=/`);}
    const file=files[path];res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8');res.end(await readFile(join(root,'public',file)));
  }catch(e){json(res,400,{error:clean(e.message,150)});}
});
setInterval(()=>{for(const r of transport.overlays)r.write(': heartbeat\n\n');},15000).unref();
setInterval(()=>validate(),3600000).unref();
setInterval(()=>integrationBus.emit('stream.assistant.summary',event('stream.assistant.summary','assistant',assistant.summary())),15000).unref();
server.listen(3000,'127.0.0.1',()=>{log('Cocoa & Chaos & Spite: http://localhost:3000');validate();});
server.on('error',()=>console.error('Unable to listen on localhost:3000; check whether another app is using port 3000.'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{twitch.stop();for(const r of transport.overlays)r.end();server.close(()=>process.exit(0));});
