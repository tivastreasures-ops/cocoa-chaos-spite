import test from 'node:test';
import assert from 'node:assert/strict';
test('running HTTP app isolates controls and exposes only read-only overlay transport',async()=>{
 const origin=process.env.CC_TEST_ORIGIN||'http://localhost:3001';const home=await fetch(origin);assert.equal(home.status,200);const cookie=home.headers.get('set-cookie').split(';')[0];
 const s=await (await fetch(origin+'/api/status',{headers:{Cookie:cookie}})).json();assert.ok(s.csrf);assert.equal(JSON.stringify(s).includes('access_token'),false);
 assert.equal((await fetch(origin+'/api/status')).status,403);
 assert.equal((await fetch(origin+'/api/preview',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"effect":"cocoa"}'})).status,403);
 const stream=await fetch(origin+'/api/events');assert.equal(stream.headers.get('content-type'),'text/event-stream');const reader=stream.body.getReader();await reader.read();
 const effect=await fetch(origin+'/api/preview',{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':s.csrf,'Content-Type':'application/json'},body:'{"effect":"cocoa"}'});assert.equal(effect.status,200);
 const chunk=await reader.read();assert.match(new TextDecoder().decode(chunk.value),/stream.overlay.effect/);await reader.cancel();
 assert.equal((await fetch(origin+'/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
 assert.equal((await fetch(origin+'/.private/tokens.json')).status,404);assert.equal((await fetch(origin+'/.env')).status,404);
 assert.equal((await fetch(origin+'/auth/twitch/callback?state=fake&code=fake')).status,400);
 assert.equal((await fetch(origin+'/overlay')).status,200);
});
test('Sebastian private audio requires Director session; preview tests cannot start paid generation',async()=>{
 const origin=process.env.CC_TEST_ORIGIN||'http://localhost:3001';const home=await fetch(origin);const cookie=home.headers.get('set-cookie').split(';')[0];
 const s=await(await fetch(origin+'/api/status',{headers:{Cookie:cookie}})).json();assert.equal(s.previewOnly,true);assert.equal(s.sebastian.route,'dashboard');assert.equal(s.sebastian.paidSessionActive,false);assert.equal(s.sebastian.microphone,false);
 assert.equal((await fetch(origin+'/api/sebastian/events')).status,403);
 assert.equal((await fetch(origin+'/api/sebastian/start',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"approvePaid":true}'})).status,403);
 const privateFeed=await fetch(origin+'/api/sebastian/events',{headers:{Cookie:cookie}});const reader=privateFeed.body.getReader();await reader.read();
 const post=async(action,data)=>{await new Promise(r=>setTimeout(r,300));return fetch(origin+'/api/sebastian/'+action,{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':s.csrf,'Content-Type':'application/json'},body:JSON.stringify(data)});};
 const tone=await post('test',{});assert.equal(tone.status,200);const chunk=new TextDecoder().decode((await reader.read()).value);assert.match(chunk,/stream.voice.audio/);assert.match(chunk,/pcm/);await reader.cancel();
 const denied=await post('start',{approvePaid:true});assert.equal(denied.status,400);assert.match((await denied.json()).error,/disabled in preview/);
 const final=await(await fetch(origin+'/api/status',{headers:{Cookie:cookie}})).json();assert.equal(final.sebastian.paidSessionActive,false);assert.equal(final.liveCount,0);assert.equal(final.subscriptionCount,0);
});
