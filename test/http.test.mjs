import test from 'node:test';
import assert from 'node:assert/strict';
test('running HTTP app isolates controls and exposes only read-only overlay transport',async()=>{
 const origin='http://localhost:3000';const home=await fetch(origin);assert.equal(home.status,200);const cookie=home.headers.get('set-cookie').split(';')[0];
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
