import test from 'node:test';
import assert from 'node:assert/strict';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {hostingConfig} from '../src/hosting-config.mjs';
import {Connection} from '../src/connection.mjs';
import {HostedAccess} from '../src/hosted-access.mjs';
const env={CC_HOSTED:'1',PUBLIC_ORIGIN:'https://companion.example.com',CC_DIRECTOR_PASSWORD:'fake-director-password-for-tests',CC_OVERLAY_TOKEN:'fake-separate-overlay-token-for-tests-only',CC_DATA_DIR:join(tmpdir(),'cc-persistent-test'),PORT:'3301'};
const app=resolve('app-test');
test('hosted configuration is opt-in, HTTPS-only, explicit and keeps private data outside app root',()=>{
 assert.equal(hostingConfig({},app).origin,'http://localhost:3000');assert.equal(hostingConfig({},app).bindHost,'127.0.0.1');
 const c=hostingConfig(env,app);assert.equal(c.origin,'https://companion.example.com');assert.equal(c.expectedHost,'companion.example.com');assert.equal(c.redirect,'https://companion.example.com/auth/twitch/callback');assert.equal(c.bindHost,'0.0.0.0');assert.equal(c.chatEnabled,false);assert.equal(hostingConfig({...env,CC_TWITCH_INGEST:'1'},app).chatEnabled,true);
 for(const overrides of [{PUBLIC_ORIGIN:'http://example.com'},{PUBLIC_ORIGIN:'https://example.com/subpath'},{PUBLIC_ORIGIN:'https://user:password@example.com/'},{CC_DIRECTOR_PASSWORD:''},{CC_OVERLAY_TOKEN:''},{CC_OVERLAY_TOKEN:env.CC_DIRECTOR_PASSWORD},{CC_DATA_DIR:app},{CC_DATA_DIR:join(app,'public','secrets')},{TWITCH_REDIRECT_URI:'http://localhost:3000/auth/twitch/callback'},{PORT:'invalid'}])assert.throws(()=>hostingConfig({...env,...overrides},app));
});
test('Director login is bounded, expires, signs out and produces secure cookies',()=>{
 let now=100000;const a=new HostedAccess({password:env.CC_DIRECTOR_PASSWORD,overlayToken:env.CC_OVERLAY_TOKEN,origin:env.PUBLIC_ORIGIN,now:()=>now});
 assert.throws(()=>a.login('wrong'));const token=a.login(env.CC_DIRECTOR_PASSWORD);assert.equal(a.valid(token),true);assert.equal(a.valid('guessed'),false);
 assert.match(a.cookie('cc_admin',token,28800),/HttpOnly; Secure; SameSite=Lax/);a.logout(token);assert.equal(a.valid(token),false);
 const next=a.login(env.CC_DIRECTOR_PASSWORD);now+=8*3600000;assert.equal(a.valid(next),false);
 for(let i=0;i<5;i++)assert.throws(()=>a.login('wrong'));assert.throws(()=>a.login(env.CC_DIRECTOR_PASSWORD),/Too many/);
});
test('read-only overlay cookies are signed, origin-bound, expire and are revoked by key rotation',()=>{
 let now=100000;const options={password:env.CC_DIRECTOR_PASSWORD,overlayToken:env.CC_OVERLAY_TOKEN,origin:env.PUBLIC_ORIGIN,now:()=>now};const a=new HostedAccess(options);
 assert.throws(()=>a.overlaySession('wrong'));const token=a.overlaySession(env.CC_OVERLAY_TOKEN);assert.equal(a.overlayValid(token),true);assert.equal(a.valid(token),false);assert.equal(a.overlayValid(token+'x'),false);
 assert.equal(new HostedAccess({...options,origin:'https://other.example.com'}).overlayValid(token),false);assert.equal(new HostedAccess({...options,overlayToken:'rotated-fake-overlay-key'}).overlayValid(token),false);
 const u=new URL(a.overlayLink());assert.equal(u.search,'');assert.ok(u.hash.startsWith('#access='));now+=24*3600000;assert.equal(a.overlayValid(token),false);
});

test('staging cutover gate validates authorization without starting a second Twitch ingestion owner',async()=>{
 let starts=0;const auth={tokens:{access_token:'fake'},account:{id:'1'},validate:async()=>{}};const twitch={stopped:true,start:()=>starts++};const c=new Connection(auth,twitch,()=>{},{allowStart:false});await c.validate(true);assert.equal(c.state,'valid');assert.equal(starts,0);
});
