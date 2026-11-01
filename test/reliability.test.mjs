import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Auth,TwitchAuthError} from '../src/auth.mjs';
import {Connection} from '../src/connection.mjs';
import {Twitch} from '../src/twitch.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=(status,value={})=>({status,ok:status>=200&&status<300,json:async()=>value});
function setup(validate){
  const tasks=new Map();let next=0,starts=0,stops=0,deleted=0;
  const auth={tokens:{access_token:'fake'},account:{id:'1'},grantedScopes:['test'],validate,disconnect:async()=>{deleted++;auth.tokens=null;auth.account=null;}};
  const twitch={stopped:true,start(){starts++;this.stopped=false;},stop(){stops++;this.stopped=true;}};
  const c=new Connection(auth,twitch,()=>{},{now:()=>100000,later:(fn,ms)=>{tasks.set(++next,{fn,ms});return next;},cancel:id=>tasks.delete(id)});
  return {c,auth,twitch,tasks,counts:()=>({starts,stops,deleted})};
}
test('network, timeout, 429 and 5xx preserve persisted authorization',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'cc-auth-'));
  try{
    const a=new Auth(undefined,{directory});a.tokens={access_token:'fake',refresh_token:'fake-refresh'};await a.save('tokens',a.tokens);
    const before=await readFile(join(directory,'tokens.json'),'utf8');
    for(const result of [new TypeError('offline'),new DOMException('timeout','TimeoutError'),response(429),response(503)]){
      a.fetch=async()=>{if(result instanceof Error)throw result;return result;};
      const {c,auth,tasks}=setup(()=>a.validate());auth.tokens=a.tokens;await c.validate();
      assert.equal(c.state,'temporarily unavailable');assert.equal(tasks.size,1);
      assert.equal(await readFile(join(directory,'tokens.json'),'utf8'),before);
    }
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('validation retries back off, remain single flight, and recover automatically',async()=>{
  let fail=true,calls=0;const x=setup(async()=>{calls++;await tick();if(fail)throw Error('offline');});
  await Promise.all([x.c.validate(),x.c.validate(),x.c.validate()]);assert.equal(calls,1);
  for(const ms of [1000,2000,4000]){const [id,task]=[...x.tasks][0];assert.equal(task.ms,ms);x.tasks.delete(id);task.fn();await tick();await tick();}
  assert.equal(x.c.nextRetry,108000);fail=false;await x.c.validate();
  assert.equal(x.c.state,'valid');assert.equal(x.tasks.size,0);assert.equal(x.counts().starts,1);assert.equal(x.counts().deleted,0);
});
test('confirmed invalid authorization ends session without retrying or deleting credentials',async()=>{
  const x=setup(async()=>{throw new TwitchAuthError('invalid refresh','authorization');});await x.c.validate();
  assert.equal(x.c.state,'authorization required');assert.equal(x.auth.account,null);assert.deepEqual(x.auth.grantedScopes,[]);assert.equal(x.tasks.size,0);assert.equal(x.counts().deleted,0);assert.ok(x.auth.tokens);
});
test('explicit disconnect cancels retry and a pending validation cannot restart Twitch',async()=>{
  let resolve;const x=setup(()=>new Promise(r=>resolve=r));const pending=x.c.validate();await x.c.disconnect();resolve();await pending;
  assert.equal(x.counts().starts,0);assert.equal(x.c.state,'not authorized');assert.equal(x.tasks.size,0);
  const y=setup(async()=>{throw Error('offline');});await y.c.validate();await y.c.disconnect();assert.equal(y.tasks.size,0);
});
test('401 validates with one refresh, rotating grant safely; refresh rejection is distinguished from outage',async()=>{
  const a=new Auth();a.tokens={access_token:'old',refresh_token:'old-refresh'};a.credentials={clientId:'client'};let saves=0;a.save=async()=>saves++;
  const replies=[response(401),response(200,{access_token:'new',refresh_token:'new-refresh'}),response(200,{client_id:'client',user_id:'1',login:'director',scopes:['user:read:chat','user:write:chat']})];
  a.fetch=async()=>replies.shift();await a.validate();assert.equal(a.tokens.refresh_token,'new-refresh');assert.equal(saves,1);assert.equal(a.account.id,'1');
  for(const [reply,kind] of [[response(400,{message:'Invalid refresh token'}),'authorization'],[response(401),'authorization'],[response(500),'temporary'],[response(400,{message:'Invalid client secret'}),'temporary']]){
    a.fetch=async()=>reply;await assert.rejects(a.refresh(),e=>e.kind===kind);
  }
});
test('late refresh cannot resurrect explicitly disconnected tokens on disk',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'cc-auth-'));let resolve;
  try{const a=new Auth(()=>new Promise(r=>resolve=r),{directory});a.tokens={refresh_token:'fake'};const pending=a.refresh();await a.disconnect();resolve(response(200,{access_token:'late',refresh_token:'late'}));await assert.rejects(pending,e=>e.kind==='cancelled');assert.equal(a.tokens,null);await assert.rejects(readFile(join(directory,'tokens.json')),e=>e.code==='ENOENT');}
  finally{await rm(directory,{recursive:true,force:true});}
});
class Socket extends EventTarget{
  static all=[];constructor(){super();Socket.all.push(this);}
  frame(message_type,payload){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({metadata:{message_type},payload})}));}
  close(){if(this.closed)return;this.closed=true;this.dispatchEvent(new Event('close'));}
}
function transport(api){Socket.all=[];return new Twitch({account:{id:'1'},grantedScopes:['channel:read:subscriptions'],api},()=>{},()=>{},Socket);}
test('optional subscription cannot report active after stop or socket loss',async()=>{
  for(const stop of [t=>t.stop(),t=>t.active.close()]){
    let finish;const t=transport(async(_p,b)=>{if(b.type==='channel.subscribe')await new Promise(r=>finish=r);});
    try{t.start();Socket.all[0].frame('session_welcome',{session:{id:'s'}});await tick();assert.equal(t.subscriptionStatus,'connecting');stop(t);finish();await tick();assert.notEqual(t.subscriptionStatus,'subscribed');}finally{t.stop();}
  }
});
test('late chat subscription completion cannot activate a closed socket',async()=>{
  let finish;const t=transport(()=>new Promise(r=>finish=r));
  try{t.start();const s=Socket.all[0];s.frame('session_welcome',{session:{id:'s'}});s.close();finish();await tick();assert.equal(t.active,null);assert.equal(t.status,'reconnecting');assert.notEqual(t.subscriptionStatus,'subscribed');}finally{t.stop();}
});
test('socket loss clears subscription status; migration preserves subscriptions without duplicates',async()=>{
  let calls=0;const t=transport(async()=>calls++);
  try{t.start();const first=Socket.all[0];first.frame('session_welcome',{session:{id:'s'}});await tick();assert.equal(t.subscriptionStatus,'subscribed');assert.equal(calls,2);
    first.frame('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=test'}});const second=Socket.all[1];second.frame('session_welcome',{session:{id:'m'}});await tick();assert.equal(t.subscriptionStatus,'subscribed');assert.equal(calls,2);
    second.close();assert.equal(t.subscriptionStatus,'reconnecting');t.stop();assert.equal(t.subscriptionStatus,'offline');
  }finally{t.stop();}
});
