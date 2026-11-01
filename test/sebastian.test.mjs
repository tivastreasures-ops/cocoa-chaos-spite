import test from 'node:test';
import assert from 'node:assert/strict';
import {Sebastian,SEBASTIAN_AGENT,SEBASTIAN_VOICE} from '../src/sebastian.mjs';
import {PcmPlayer} from '../public/pcm-player.js';
class Socket extends EventTarget{
  static all=[];constructor(url){super();this.url=url;this.sent=[];Socket.all.push(this);}
  send(text){this.sent.push(JSON.parse(text));}
  frame(m){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(m)}));}
  close(){if(this.closed)return;this.closed=true;this.dispatchEvent(new Event('close'));}
}
const config={agent_id:SEBASTIAN_AGENT,conversation_config:{tts:{voice_id:SEBASTIAN_VOICE,agent_output_audio_format:'pcm_16000'}}};
function setup(options={}){
  Socket.all=[];const emitted=[],requests=[],timers=new Map();let id=0;
  const s=new Sebastian({key:'fake-key-for-tests-only',Socket,fetcher:async(url,init)=>{requests.push({url,init});return {ok:true,json:async()=>url.includes('get-signed-url')?{signed_url:'wss://api.elevenlabs.io/v1/convai/conversation?agent_id='+SEBASTIAN_AGENT+'&token=fake'}:structuredClone(config)};},emit:(route,p)=>emitted.push({route,p}),later:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},cancel:i=>timers.delete(i),...options});
  return {s,emitted,requests,timers};
}
const metadata={type:'conversation_initiation_metadata',conversation_initiation_metadata_event:{agent_output_audio_format:'pcm_16000'}};
test('paid start requires explicit approval; preview sandbox never contacts ElevenLabs',async()=>{
  const x=setup();for(const approval of [undefined,false,'true'])await assert.rejects(x.s.start(approval),/approval/);assert.equal(x.requests.length,0);assert.equal(Socket.all.length,0);
  x.s.previewOnly=true;await assert.rejects(x.s.start(true),/disabled/);assert.equal(x.requests.length,0);x.s.testTone();assert.equal(x.requests.length,0);assert.equal(x.emitted.at(-1).route,'dashboard');
});
test('existing identity verified before session; no config overrides, mic input, or secret leaks',async()=>{
  const x=setup();await x.s.start(true);const ws=Socket.all[0];assert.ok(x.requests[0].url.endsWith(SEBASTIAN_AGENT));assert.equal(x.requests.length,2);
  ws.dispatchEvent(new Event('open'));assert.deepEqual(ws.sent,[{type:'conversation_initiation_client_data'}]);ws.frame(metadata);assert.equal(x.s.state,'connected');
  x.s.message('Director requests a greeting.');assert.deepEqual(ws.sent.at(-1),{type:'user_message',text:'Director requests a greeting.'});assert.throws(()=>x.s.message('Again'),/six seconds/);
  assert.equal(JSON.stringify(x.s.status()).includes('fake-key'),false);assert.equal(JSON.stringify(x.emitted).includes('token=fake'),false);assert.equal(x.s.status().microphone,false);x.s.stop();
});
test('voice mismatch fails closed before paid socket is opened',async()=>{
  let calls=0;const x=setup({fetcher:async()=>{calls++;return {ok:true,json:async()=>({...config,conversation_config:{tts:{voice_id:'other',agent_output_audio_format:'pcm_16000'}}})};}});
  await assert.rejects(x.s.start(true),/approved voice/);assert.equal(calls,1);assert.equal(Socket.all.length,0);
});
test('unexpected signed URL is rejected; pending start is cancelled by stop',async()=>{
  const x=setup();const original=x.s.api.bind(x.s);x.s.api=async p=>p.includes('get-signed-url')?{signed_url:'wss://evil.example/?agent_id='+SEBASTIAN_AGENT}:original(p);await assert.rejects(x.s.start(true),/unexpected/);assert.equal(Socket.all.length,0);
  let resolve;const y=setup({fetcher:()=>new Promise(r=>resolve=r)});const pending=y.s.start(true);y.s.stop();resolve({ok:true,json:async()=>config});await pending;assert.equal(Socket.all.length,0);assert.equal(y.s.status().paidSessionActive,false);
});
test('private routing, explicit stream routing, mute and captions remain isolated',async()=>{
  const x=setup();await x.s.start(true);const ws=Socket.all[0];ws.frame(metadata);
  const audio={type:'audio',audio_event:{audio_base_64:Buffer.alloc(320).toString('base64')}};
  ws.frame(audio);assert.equal(x.emitted.at(-1).route,'dashboard');x.s.settings({route:'overlay'});assert.equal(x.emitted.at(-2).p.type,'stop');assert.equal(x.emitted.at(-2).route,'dashboard');ws.frame(audio);assert.equal(x.emitted.at(-1).route,'overlay');
  x.s.settings({muted:true});const before=x.emitted.length;ws.frame(audio);assert.equal(x.emitted.length,before);x.s.settings({captions:false,volume:.25});assert.equal(x.s.status().captions,false);
  assert.throws(()=>x.s.settings({route:'public'}));assert.throws(()=>x.s.settings({volume:NaN}));x.s.stop();
});
test('session duration is capped, tools cannot perform actions, and late frames are ignored',async()=>{
  const x=setup();await x.s.start(true);const ws=Socket.all[0];ws.frame(metadata);ws.frame({type:'client_tool_call',client_tool_call:{tool_call_id:'t',tool_name:'ban_user'}});assert.equal(ws.sent.at(-1).is_error,true);
  ws.frame({type:'ping',ping_event:{event_id:4}});assert.deepEqual(ws.sent.at(-1),{type:'pong',event_id:4});
  [...x.timers.values()].find(t=>t.ms===60000).fn();assert.ok(ws.closed);assert.equal(x.s.status().paidSessionActive,false);const n=x.emitted.length;ws.frame({type:'audio',audio_event:{audio_base_64:'AAAA'}});assert.equal(x.emitted.length,n);assert.equal(x.timers.size,0);
});
test('bad audio format closes session and never causes an automatic paid reconnect',async()=>{
  const x=setup();await x.s.start(true);Socket.all[0].frame({type:'conversation_initiation_metadata',conversation_initiation_metadata_event:{agent_output_audio_format:'ulaw_8000'}});assert.equal(x.s.status().paidSessionActive,false);assert.equal(Socket.all.length,1);assert.equal(x.timers.size,0);
});
class Context{
  constructor(){this.state='suspended';this.currentTime=10;this.destination={};this.sources=[];}
  async resume(){this.state='running';}
  createGain(){return {gain:{value:1},connect(){}};}
  createBuffer(_channels,length,rate){this.samples=new Float32Array(length);return {getChannelData:()=>this.samples,duration:length/rate};}
  createBufferSource(){const n={connect(){},disconnect(){},start(time){this.time=time;},stop(){this.stopped=true;}};this.sources.push(n);return n;}
}
test('PCM renderer queues without overlap, converts signed samples, clears on mute/session change and bounds backlog',async()=>{
  const p=new PcmPlayer({Context});await p.unlock();const pcm=Buffer.alloc(3200);pcm.writeInt16LE(-32768);const a={type:'pcm',session:'s',audio:pcm.toString('base64'),rate:16000};p.accept(a);assert.equal(p.context.samples[0],-1);p.accept(a);assert.ok(p.context.sources[1].time>=p.context.sources[0].time+.1);
  const old=[...p.nodes];p.accept({type:'settings',session:'s',muted:true});assert.equal(p.nodes.size,0);assert.ok(old.every(n=>n.stopped));p.accept({...a,session:'new',muted:false});assert.equal(p.session,'new');p.next=100;p.accept(a);assert.equal(p.nodes.size,1);p.next=100;p.accept(a);assert.equal(p.nodes.size,0);
});
test('browser audio caption timers are called without an invalid receiver',()=>{
  const savedSet=globalThis.setTimeout,savedClear=globalThis.clearTimeout;let callback;
  try{
    globalThis.setTimeout=function(fn){assert.equal(this,undefined);callback=fn;return 1;};
    globalThis.clearTimeout=function(){assert.equal(this,undefined);};
    const captions=[];const p=new PcmPlayer({caption:t=>captions.push(t)});p.accept({type:'caption',session:'test',text:'Director.'});assert.equal(captions.at(-1),'Director.');callback();assert.equal(captions.at(-1),'');p.clear();
  }finally{globalThis.setTimeout=savedSet;globalThis.clearTimeout=savedClear;}
});
