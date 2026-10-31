import test from 'node:test';
import assert from 'node:assert/strict';
import {Commands} from '../src/commands.mjs';
import {parseChat,event} from '../src/events.mjs';
import {Assistant} from '../src/assistant.mjs';
import {Auth} from '../src/auth.mjs';
import {Twitch} from '../src/twitch.mjs';
import {createVoiceBridge} from '../src/voice.mjs';
const chat={broadcaster_user_id:'1',chatter_user_id:'2',chatter_user_name:'Viewer',message_id:'m1',message:{text:'!hello'},badges:[]};
test('ordinary viewers can greet and request cocoa, but cannot request chaos',async()=>{
 let now=100000,events=[],replies=[];const c=new Commands(e=>events.push(e),async m=>replies.push(m),()=>now);
 const m=parseChat(chat,'1');assert.equal(await c.handle(m),'executed');assert.equal(events[1].payload.effect,'hello');
 now+=21000;assert.equal(await c.handle({...m,text:'!cocoa'}),'executed');assert.equal(events[3].payload.effect,'cocoa');
 now+=21000;assert.equal(await c.handle({...m,text:'!chaos'}),'permission denied');assert.equal(events.length,4);
 assert.equal(await c.handle({...m,text:'!chaos',privileged:true}),'executed');assert.equal(replies.length,3);
});
test('global and viewer cooldowns; previews never send real chat replies',async()=>{
 let now=100000,replies=0;const c=new Commands(()=>{},async()=>replies++,()=>now);const m=parseChat(chat,'1');
 await c.handle(m,'preview');assert.equal(replies,0);now+=1000;assert.equal(await c.handle({...m,userId:'3'}),'cooldown');now+=6000;assert.equal(await c.handle(m),'cooldown');now+=14000;assert.equal(await c.handle(m),'executed');assert.equal(replies,1);
});
test('invalid and cross-channel events are rejected; only moderator and broadcaster qualify',()=>{
 for(const e of [null,{}, {...chat,broadcaster_user_id:'3'},{...chat,message:null},{...chat,source_broadcaster_user_id:'99'}])assert.equal(parseChat(e,'1'),null);
 assert.equal(parseChat({...chat,badges:[{set_id:'subscriber',id:'1'}]},'1').privileged,false);
 assert.equal(parseChat({...chat,badges:[{set_id:'moderator',id:'1'}]},'1').privileged,true);
 assert.equal(parseChat({...chat,chatter_user_id:'1'},'1').privileged,true);
 assert.equal(parseChat({...chat,message:{text:'hello\u0000world'}},'1').text,'helloworld');
});
test('digest surfaces questions and manual moderation approval never invokes Twitch',()=>{
 const a=new Assistant();a.add({...parseChat(chat,'1'),text:'When is the next story?'});assert.equal(a.summary().questions.length,1);
 const q=a.suggest('m1','timeout','Review this');assert.equal(q.status,'pending');assert.match(a.decide(q.id,true).status,/manual/);assert.throws(()=>a.decide(q.id,true));
 for(let i=0;i<300;i++)a.add({id:String(i),userId:'2',text:'hello',timestamp:Date.now()});assert.equal(a.messages.length,200);
});
test('structured events carry integration metadata and only explicit payload',()=>{const e=event('stream.overlay.effect','twitch',{effect:'cocoa'});assert.equal(e.schemaVersion,1);assert.ok(e.eventId);assert.ok(Date.parse(e.timestamp));assert.deepEqual(e.payload,{effect:'cocoa'});});
test('parallel token refresh is single flight; API retries only once',async()=>{
 let calls=0;const a=new Auth();a.tokens={refresh_token:'fake'};a.exchange=async()=>{calls++;await new Promise(r=>setTimeout(r,5));};await Promise.all([a.refresh(),a.refresh(),a.refresh()]);assert.equal(calls,1);
 let requests=0;a.fetch=async()=>{requests++;return {status:401,ok:false};};await assert.rejects(a.api('chat/messages',{}));assert.equal(requests,2);
});
class Socket extends EventTarget {
 static all=[];constructor(url){super();this.url=url;Socket.all.push(this);}
 sendFrame(message_type,payload){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({metadata:{message_type,message_timestamp:new Date().toISOString()},payload})}));}
 close(){if(this.closed)return;this.closed=true;this.dispatchEvent(new Event('close'));}
}
const tick=()=>new Promise(r=>setTimeout(r,15));
test('voice tools cannot self-approve effects, send chat, or execute moderation',async()=>{
 const invoke=createVoiceBridge({assistant:new Assistant()});assert.equal((await invoke('get_chat_summary',{})).messageCount,0);
 const result=await invoke('send_chat_reply',{message:'Welcome to the office'});assert.equal(result.approvalRequired,true);assert.equal(result.request.kind,'reply');
 await assert.rejects(invoke('trigger_overlay_effect',{effect:'chaos'}),/cooldown/);
 const other=createVoiceBridge({assistant:new Assistant()});await assert.rejects(other('ban_user',{user_id:'2'}),/Unknown tool/);
});
test('EventSub subscribes, deduplicates real frames, migrates without resubscribing, rejects malformed events',async()=>{
 Socket.all=[];let subscribed=0,received=0;const auth={account:{id:'1'},api:async()=>{subscribed++;}};const t=new Twitch(auth,async()=>received++,()=>{},Socket);
 t.start();const first=Socket.all[0];first.sendFrame('session_welcome',{session:{id:'session',keepalive_timeout_seconds:10}});await tick();assert.equal(t.status,'subscribed');assert.equal(subscribed,1);
 const payload={subscription:{type:'channel.chat.message',version:'1'},event:chat};first.sendFrame('notification',payload);first.sendFrame('notification',payload);await tick();assert.equal(received,1);
 first.dispatchEvent(new MessageEvent('message',{data:'not json'}));assert.equal(t.status,'subscribed');
 first.sendFrame('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=x'}});await tick();const second=Socket.all[1];second.sendFrame('session_welcome',{session:{id:'migrated'}});await tick();assert.equal(subscribed,1);assert.ok(first.closed);assert.equal(t.active,second);
 second.close();assert.equal(t.status,'reconnecting');t.stop();assert.equal(t.status,'offline');
});
test('revocation stops EventSub and cancels reconnect',async()=>{Socket.all=[];const t=new Twitch({account:{id:'1'},api:async()=>{}},()=>{},()=>{},Socket);t.start();Socket.all[0].sendFrame('revocation',{});await tick();assert.equal(t.status,'authorization required');assert.equal(t.stopped,true);});
