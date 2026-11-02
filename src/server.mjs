import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {join} from 'node:path';
import {root,origin,redirect,scopes,subscriptionScope,canvas,port,previewOnly,hosted,chatEnabled,bindHost,expectedHost} from './config.mjs';
import {Auth} from './auth.mjs';
import {Commands,effects} from './commands.mjs';
import {SubscriptionEffects} from './subscriptions.mjs';
import {Transport,event,clean} from './events.mjs';
import {Assistant} from './assistant.mjs';
import {Twitch} from './twitch.mjs';
import {Connection} from './connection.mjs';
import {createVoiceBridge} from './voice.mjs';
import {Sebastian} from './sebastian.mjs';
import {HostedAccess} from './hosted-access.mjs';
const auth=new Auth();if(!previewOnly)await auth.init();
const transport=new Transport(),assistant=new Assistant(),logs=[],pendingVoice=[];
// Internal integration bus keeps chat context off the public overlay feed.
export const integrationBus=new EventEmitter();
const localAdmin=randomBytes(32).toString('hex');
const adminCookie=hosted||port===3000?'cc_admin':'cc_admin_'+port;
const access=hosted?new HostedAccess({password:process.env.CC_DIRECTOR_PASSWORD,overlayToken:process.env.CC_OVERLAY_TOKEN,origin}):null;
function log(message){logs.push({time:new Date().toISOString(),message});if(logs.length>40)logs.shift();console.log(new Date().toISOString(),message);}
const commands=new Commands(e=>{integrationBus.emit(e.type,e);if(e.type==='stream.overlay.effect')transport.emit(e);},message=>auth.reply(message));
const previews=new Commands(e=>{if(e.type==='stream.overlay.effect')transport.emit(e);},async()=>{});
const subscriptions=new SubscriptionEffects(commands);let subscriptionCount=0,lastSubscription=null;
let lastChat=null,liveCount=0,previewCount=0;
const twitch=new Twitch(auth,async m=>{lastChat={name:m.name,text:m.text,time:new Date().toISOString()};liveCount++;assistant.add(m);integrationBus.emit('stream.chat.received',event('stream.chat.received','twitch',{id:m.id,name:m.name,text:m.text}));log('Real Twitch chat received');try{const result=await commands.handle(m);if(result!=='ignored')log(`Chat command ${m.text.trim().toLowerCase()}: ${result}`);}catch{log('Command effect sent; Twitch reply failed');}},log,WebSocket,s=>{if(subscriptions.handle(s)){subscriptionCount++;lastSubscription={name:s.name,time:new Date().toISOString()};log('Real Twitch channel.subscribe event received');}});
const bridge=createVoiceBridge({assistant,commands,auth,diagnostic:log});
const privateAudio=new Transport();
const sebastian=new Sebastian({previewOnly,log,emit:(route,payload)=>{const e=event('stream.voice.audio','sebastian',payload);(route==='overlay'?transport:privateAudio).emit(e);}});await sebastian.init();
const states=new Map();let lastAction=0;
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function cookie(req,name){return req.headers.cookie?.split('; ').find(v=>v.startsWith(name+'='))?.slice(name.length+1);}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>10000)throw Error('Request too large');}return JSON.parse(s||'{}');}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}
const connection=new Connection(auth,twitch,log,{allowStart:chatEnabled});
const validate=()=>connection.validate();
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
  try{
    if(req.headers.host!==expectedHost){json(res,403,{error:'Unexpected site host'});return;}
    const u=new URL(req.url,origin),path=u.pathname;
    if(u.origin!==origin){json(res,403,{error:'Unexpected site origin'});return;}
    const sessionToken=cookie(req,adminCookie);
    const authenticated=hosted?access.valid(sessionToken):equal(sessionToken,localAdmin);
    const admin=hosted?(authenticated?sessionToken:''):localAdmin;
    if(hosted&&req.method==='POST'&&path==='/api/login'){
      if(req.headers.origin!==origin){json(res,403,{error:'Unexpected origin'});return;}
      try{const b=await body(req);const token=access.login(b.password);res.setHeader('Set-Cookie',access.cookie('cc_admin',token,28800));json(res,200,{ok:true});}catch{json(res,401,{error:'Sign-in failed or attempts limited; wait a minute before retrying'});}return;
    }
    if(req.method==='GET'&&path==='/health'){json(res,200,{ok:true});return;}
    if(hosted&&req.method==='POST'&&path==='/api/overlay-session'){
      if(req.headers.origin!==origin){json(res,403,{error:'Unexpected origin'});return;}
      try{const b=await body(req);const token=access.overlaySession(b.token);res.setHeader('Set-Cookie',access.cookie('cc_overlay',token,86400));json(res,200,{ok:true});}catch{json(res,403,{error:'Overlay link invalid or attempts limited'});}return;
    }
    if(hosted&&!authenticated&&(path==='/'||path==='/login')){
      if(req.method!=='GET'){json(res,401,{error:'Sign in first'});return;}
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(join(root,'public','login.html')));return;
    }
    if(hosted&&!authenticated&&((path.startsWith('/api/')&&!['/api/events','/api/canvas','/api/voice'].includes(path))||(path.startsWith('/auth/')&&path!=='/auth/twitch/callback'))){json(res,401,{error:'Sign in to the Director dashboard'});return;}

    if(req.method==='POST'){
      const voice=path==='/api/voice';
      if(voice){const key=process.env.VOICE_BRIDGE_TOKEN;if(!key||key.length<32||!equal(req.headers.authorization,`Bearer ${key}`)){json(res,401,{error:'Voice bridge disabled or unauthorized'});return;}}
      else if(req.headers.origin!==origin||!equal(req.headers['x-csrf-token'],admin)||!equal(cookie(req,adminCookie),admin)){json(res,403,{error:'Open the local dashboard before using controls'});return;}
      if(Date.now()-lastAction<250){json(res,429,{error:'Slow down'});return;}lastAction=Date.now();
      const b=await body(req);
      if(path==='/api/logout'&&hosted){access.logout(sessionToken);states.clear();sebastian.stop('Director signed out');for(const r of [...privateAudio.overlays,...transport.overlays])if(r.directorToken===sessionToken)r.end();res.setHeader('Set-Cookie',access.cookie('cc_admin','',0));json(res,200,{ok:true});}
      else if(path==='/api/overlay-link'&&hosted){json(res,200,{url:access.overlayLink()});}
      else if(path==='/api/setup'){if(previewOnly)throw Error('Preview sandbox does not accept credentials');await auth.configure(b.clientId,b.clientSecret);json(res,200,{ok:true});}
      else if(path==='/api/reconnect'){if(previewOnly)throw Error('Twitch disabled in preview sandbox');if(!auth.tokens)throw Error('Authorize Twitch first');await connection.validate(true);json(res,200,{ok:true});}
      else if(path==='/api/disconnect'){await connection.disconnect();json(res,200,{ok:true});}
      else if(path.startsWith('/api/sebastian/')){
        const action=path.slice('/api/sebastian/'.length);let result={ok:true};
        if(action==='setup')await sebastian.configure(b.apiKey);
        else if(action==='verify')result=await sebastian.verify();
        else if(action==='start')await sebastian.start(b.approvePaid);
        else if(action==='stop')sebastian.stop();
        else if(action==='settings')result=sebastian.settings(b);
        else if(action==='test')sebastian.testTone();
        else if(action==='message')sebastian.message(b.text);
        else throw Error('Unknown Sebastian control');
        json(res,200,result);
      }
      else if(path==='/api/preview'){if(!effects.includes(b.effect))throw Error('Invalid effect');let result;if(b.effect==='calculator'){if(Date.now()-(server.lastCalculatorPreview||0)<6000)throw Error('Preview cooldown');server.lastCalculatorPreview=Date.now();previews.effect('calculator','Director · preview','preview-'+Date.now(),'preview');result='executed';}else result=await previews.handle({text:'!'+b.effect,userId:'preview-'+b.effect,name:'Director · preview',id:'preview-'+Date.now(),privileged:true,broadcaster:true},'preview');if(result==='executed')previewCount++;json(res,200,{result});}
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
      if(previewOnly)throw Error('Twitch authorization is disabled in the preview sandbox');
      if(!equal(cookie(req,adminCookie),admin))throw Error('Open dashboard first');
      if(!auth.configured)throw Error('Enter existing Twitch application credentials first');
      for(const [k,v] of states)if(v<Date.now())states.delete(k);
      if(states.size>=20)throw Error('Too many authorization attempts; wait ten minutes');
      const state=randomBytes(32).toString('hex');states.set(state,Date.now()+600000);
      const requested=[...new Set([...scopes,...(auth.grantedScopes||[]),...(u.searchParams.get('subscriptions')==='1'?[subscriptionScope]:[])])];
      res.writeHead(302,{Location:'https://id.twitch.tv/oauth2/authorize?'+new URLSearchParams({client_id:auth.clientId,redirect_uri:redirect,response_type:'code',scope:requested.join(' '),state,force_verify:'true'}),'Set-Cookie':`cc_oauth=${state}; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=600${hosted?'; Secure':''}`});res.end();return;
    }
    if(path==='/auth/twitch/callback'){
      if(previewOnly)throw Error('Twitch authorization is disabled in the preview sandbox');
      const state=u.searchParams.get('state');if(!state||!equal(cookie(req,'cc_oauth'),state)||!states.has(state)||states.get(state)<Date.now())throw Error('OAuth state invalid or expired');states.delete(state);
      const code=u.searchParams.get('code');if(!code||u.searchParams.has('error'))throw Error('Twitch authorization was not completed');
      await connection.authorize(code);log('Twitch account authorized');res.writeHead(302,{Location:'/','Set-Cookie':`cc_oauth=; HttpOnly; SameSite=Lax; Path=/auth; Max-Age=0${hosted?'; Secure':''}`});res.end();return;
    }
    if(path==='/api/sebastian/events'){
      if(!equal(cookie(req,adminCookie),admin)){json(res,403,{error:'Open dashboard'});return;}
      if(privateAudio.overlays.size>=6){json(res,429,{error:'Too many private audio clients'});return;}
      res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': private audio connected\n\n');res.directorToken=admin;privateAudio.add(res);return;
    }
    if(path==='/api/events'){
      const overlayCookie=cookie(req,'cc_overlay');if(hosted&&!authenticated&&!access.overlayValid(overlayCookie)){json(res,401,{error:'A protected overlay link is required'});return;}
      if(transport.overlays.size>=12){json(res,429,{error:'Too many overlays'});return;}
      res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');if(hosted){res.directorToken=authenticated?admin:null;res.overlayCookie=overlayCookie;}transport.add(res);return;
    }
    if(path==='/api/canvas'){json(res,200,canvas);return;}
    if(path==='/api/status'){
      if(!equal(cookie(req,adminCookie),admin)){json(res,403,{error:'Open dashboard'});return;}
      json(res,200,{csrf:admin,hosted,chatEnabled,configured:auth.configured,account:auth.account,channel:auth.account?.login||null,eventsub:twitch.status,authorization:connection.state,validationRetryAt:connection.nextRetry,lastChat,overlays:transport.overlays.size,liveCount,previewCount,subscriptionCount,lastSubscription,subscriptionStatus:twitch.subscriptionStatus,previewOnly,summary:assistant.summary(),queue:assistant.queue,voiceRequests:pendingVoice,logs,canvas,sebastian:sebastian.status(),voice:'Sebastian: '+sebastian.state+' · '+(sebastian.route==='dashboard'?'private dashboard':'stream overlay')+' · microphone off'});return;
    }
    const files={'/':'dashboard.html','/login.js':'login.js','/mobile.css':'mobile.css','/mobile.js':'mobile.js','/manifest.webmanifest':'manifest.webmanifest','/app-icon.svg':'app-icon.svg','/overlay':'overlay.html','/dashboard.js':'dashboard.js','/dashboard-update.css':'dashboard-update.css','/overlay.js':'overlay.js','/pcm-player.js':'pcm-player.js','/sebastian-dashboard.js':'sebastian-dashboard.js','/sebastian.css':'sebastian.css','/effect-queue.js':'effect-queue.js','/approved-art.js':'approved-art.js','/approved-art.css':'approved-art.css','/approved-art.js':'approved-art.js','/approved-art.css':'approved-art.css','/new-effects.js':'new-effects.js','/new-effects.css':'new-effects.css','/style.css':'style.css','/overlay.css':'overlay.css'};
    if(/^\/assets\/reactions\/(?:calculator|calculator-burst|hello|hydrate|cocoa-cup|cocoa-garnish|paper-stack|rain-[1-6]|run-[1-6]|flail-[1-4]|chaos-[1-4]|paper-[1-5])\.png$/.test(path)){res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=300');res.end(await readFile(join(root,'public',path.slice(1))));return;}
    if(/^\/assets\/reactions\/(?:calculator|calculator-burst|hello|hydrate|cocoa-cup|cocoa-garnish|paper-stack|rain-[1-6]|run-[1-6]|flail-[1-4]|chaos-[1-4]|paper-[1-5])\.png$/.test(path)){res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=300');res.end(await readFile(join(root,'public',path.slice(1))));return;}
    if(!files[path]){json(res,404,{error:'Not found'});return;}
    if(path==='/'&&!hosted){res.setHeader('Set-Cookie',`${adminCookie}=${admin}; HttpOnly; SameSite=Strict; Path=/`);}
    const file=files[path];res.setHeader('Content-Type',file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8');res.end(await readFile(join(root,'public',file)));
  }catch(e){json(res,400,{error:clean(e.message,150)});}
});
setInterval(()=>{for(const r of [...transport.overlays,...privateAudio.overlays]){if(hosted&&!(r.directorToken?access.valid(r.directorToken):access.overlayValid(r.overlayCookie))){r.end();continue;}r.write(': heartbeat\n\n');}},15000).unref();
if(!previewOnly)setInterval(()=>validate(),3600000).unref();
setInterval(()=>integrationBus.emit('stream.assistant.summary',event('stream.assistant.summary','assistant',assistant.summary())),15000).unref();
server.listen(port,bindHost,()=>{log(`Cocoa & Chaos & Spite: ${origin}${previewOnly?' · isolated previews; Twitch disabled':''}`);if(!previewOnly)validate();});
server.on('error',()=>console.error('Unable to listen on configured application port'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{connection.pause();twitch.stop();sebastian.stop('Server stopping');for(const r of [...transport.overlays,...privateAudio.overlays])r.end();server.close(()=>process.exit(0));});
