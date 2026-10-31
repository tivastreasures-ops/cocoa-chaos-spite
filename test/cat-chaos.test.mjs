import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Commands} from '../src/commands.mjs';
import {parseChat,parseSubscription,event} from '../src/events.mjs';
import {Twitch} from '../src/twitch.mjs';
import {SubscriptionEffects} from '../src/subscriptions.mjs';
import {EffectQueue} from '../public/effect-queue.js';
import {Auth} from '../src/auth.mjs';
const raw={broadcaster_user_id:'1',chatter_user_id:'2',chatter_user_name:'Viewer',message_id:'m1',message:{text:'!mmm'},badges:[]};
const m=(badges=[],more={})=>parseChat({...raw,badges,...more},'1');
test('mmm fails closed; mod is not sub; genuine subscriber/founder metadata and broadcaster qualify',async()=>{
 for(const person of [m(),m([{set_id:'moderator',id:'1'}]),m([{set_id:'sub-gifter',id:'1'}]),m([{set_id:'subscriber'}])]){
  const c=new Commands(()=>assert.fail('Denied effect emitted'),()=>assert.fail('Denied reply'),()=>100000);assert.equal(await c.handle(person),'verified subscriber required');
 }
 for(const person of [m([{set_id:'subscriber',id:'6'}]),m([{set_id:'founder',id:'0'}]),m([],{chatter_user_id:'1'})]){
  const out=[];const c=new Commands(e=>out.push(e),async()=>{},()=>100000);assert.equal(await c.handle(person),'executed');assert.equal(out[1].payload.effect,'mmm');
 }
 assert.equal(parseChat({...raw,source_broadcaster_user_id:'3',badges:[{set_id:'subscriber',id:'1'}]},'1'),null);
});
test('hydrate enforces 120s global, 180s viewer, and allows ordinary viewers',async()=>{
 let now=0;const c=new Commands(()=>{},async()=>{},()=>now);const viewer={...m(),text:'!hydrate'};
 assert.equal(await c.handle(viewer),'executed');now=119999;assert.equal(await c.handle({...viewer,userId:'3'}),'cooldown');
 now=120000;assert.equal(await c.handle(viewer),'cooldown');assert.equal(await c.handle({...viewer,userId:'3'}),'executed');
 now=240001;assert.equal(await c.handle(viewer),'executed');
});
test('cat is public; flail/chaos are mod/broadcaster only, with cooldowns',async()=>{
 for(const command of ['!cat','!hello','!cocoa','!flail','!chaos']){
  let now=100000;const c=new Commands(()=>{},async()=>{},()=>now);const person={...m(),text:command};
  if(['!flail','!chaos'].includes(command))assert.equal(await c.handle(person),'permission denied');
  person.privileged=true;assert.equal(await c.handle(person),'executed');now+=6001;assert.equal(await c.handle(person),'cooldown');now+=14000;assert.equal(await c.handle(person),'executed');
 }
});
test('chat text claiming subscription and !calculator cannot synthesize a subscription event',async()=>{
 const c=new Commands(()=>assert.fail('Not a real subscription'),()=>{},()=>100000);
 for(const text of ['I just subscribed','!calculator','!subscribe'])assert.equal(await c.handle({...m(),text}),'ignored');
});
test('subscription fixture validation rejects wrong channel, invalid tier and malformed data',async()=>{
 const f=JSON.parse(await readFile(new URL('./fixtures/channel-subscribe.json',import.meta.url),'utf8'));const e=f.payload.event;
 assert.ok(parseSubscription(e,'1','event1'));for(const bad of [null,{}, {...e,broadcaster_user_id:'3'},{...e,tier:'banana'},{...e,is_gift:'false'}])assert.equal(parseSubscription(bad,'1','event1'),null);
 const out=[],c=new Commands(e=>out.push(e),()=>{}),s=new SubscriptionEffects(c);assert.equal(s.handle(parseSubscription(e,'1','event1')),true);assert.equal(s.handle(parseSubscription(e,'1','event1')),false);assert.equal(out.length,1);assert.equal(out[0].source,'twitch');assert.equal(out[0].payload.effect,'calculator');
});
class Socket extends EventTarget{static all=[];constructor(){super();Socket.all.push(this);}frame(metadata,payload){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({metadata:{message_timestamp:new Date().toISOString(),...metadata},payload})}));}close(){if(this.closed)return;this.closed=true;this.dispatchEvent(new Event('close'));}}
const tick=()=>new Promise(r=>setTimeout(r,20));
test('installed-account reply omits forbidden field and fails closed during Shared Chat',async()=>{
 const a=new Auth();a.account={id:'1'};let sent;
 a.api=async(path,body)=>{if(path.startsWith('shared_chat/'))return {data:[]};sent=body;return {data:[{is_sent:true,message_id:'reply1'}]};};
 assert.equal(await a.reply('Hello'),'reply1');assert.equal('for_source_only' in sent,false);assert.equal(sent.broadcaster_id,'1');
 a.api=async(path)=>{assert.ok(path.startsWith('shared_chat/'));return {data:[{session_id:'shared'}]};};await assert.rejects(a.reply('Hello'),/suppressed/);
});
test('real EventSub type routes calculator; chat stays active if optional listener is unavailable',async()=>{
 Socket.all=[];const calls=[],events=[];const auth={account:{id:'1'},grantedScopes:['channel:read:subscriptions'],api:async(path,b)=>{calls.push(b.type);}};
 const t=new Twitch(auth,()=>{},()=>{},Socket,s=>events.push(s));t.start();const sock=Socket.all[0];sock.frame({message_type:'session_welcome'},{session:{id:'one'}});await tick();assert.deepEqual(calls,['channel.chat.message','channel.subscribe']);assert.equal(t.subscriptionStatus,'subscribed');
 const f=JSON.parse(await readFile(new URL('./fixtures/channel-subscribe.json',import.meta.url),'utf8'));sock.frame({...f.metadata,message_timestamp:new Date().toISOString()},f.payload);sock.frame({...f.metadata,message_timestamp:new Date().toISOString()},f.payload);await tick();assert.equal(events.length,1);
 sock.frame({message_type:'revocation'},{subscription:{type:'channel.subscribe'}});await tick();assert.equal(t.status,'subscribed');assert.equal(t.subscriptionStatus,'authorization required');t.stop();
 auth.api=async(path,b)=>{if(b.type==='channel.subscribe')throw Error('Forbidden');};const u=new Twitch(auth,()=>{},()=>{},Socket);u.start();Socket.all.at(-1).frame({message_type:'session_welcome'},{session:{id:'two'}});await tick();assert.equal(u.status,'subscribed');assert.match(u.subscriptionStatus,/unavailable/);u.stop();
});
test('two-scope chat grant does not attempt optional subscription listener',async()=>{Socket.all=[];const calls=[];const t=new Twitch({account:{id:'1'},api:async(p,b)=>calls.push(b.type)},()=>{},()=>{},Socket);t.start();Socket.all[0].frame({message_type:'session_welcome'},{session:{id:'one'}});await tick();assert.deepEqual(calls,['channel.chat.message']);assert.match(t.subscriptionStatus,/authorization/);t.stop();});
test('renderer queue serializes, bounds backlog, deduplicates and clears every effect',()=>{
 let now=0;const timers=[],played=[],cleared=[];const q=new EffectQueue(e=>{played.push(e.eventId);return ()=>cleared.push(e.eventId);},{now:()=>now,schedule:fn=>timers.push(fn)});
 const make=id=>({...event('stream.overlay.effect','preview',{effect:'cat',user:'Director',durationMs:5500}),eventId:id});const first=make('1');assert.equal(q.accept(first),true);assert.equal(q.accept(first),false);
 for(let i=2;i<=5;i++)assert.equal(q.accept(make(String(i))),true);assert.equal(q.accept(make('6')),false);assert.deepEqual(played,['1']);
 while(timers.length){now+=5500;timers.shift()();}assert.deepEqual(cleared,['1','2','3','4','5']);assert.equal(q.busy,false);assert.equal(q.pending.length,0);
 assert.equal(q.accept({...make('bad'),payload:{effect:'evil'}}),false);
});
test('default renderer scheduler calls browser timer without binding queue as receiver',()=>{
 const saved=globalThis.setTimeout;let callback;
 try{globalThis.setTimeout=function(fn){assert.equal(this,undefined);callback=fn;};
  let cleared=false;const q=new EffectQueue(()=>()=>{cleared=true;});q.accept(event('stream.overlay.effect','preview',{effect:'flail',user:'Director',durationMs:5500}));assert.equal(typeof callback,'function');callback();assert.equal(cleared,true);
 }finally{globalThis.setTimeout=saved;}
});
