import test from 'node:test';
import assert from 'node:assert/strict';
import {Commands} from '../src/commands.mjs';
test('tiny preserves old subscriber access, fails closed for moderators, and enforces shared cooldowns',async()=>{
 let now=100000;const emitted=[];const c=new Commands(e=>emitted.push(e),async()=>{},()=>now);
 const viewer={text:'!tiny',userId:'viewer',name:'Viewer',id:'one',privileged:true};
 assert.equal(await c.handle(viewer),'verified subscriber required');
 assert.equal(emitted.length,0);
 assert.equal(await c.handle({...viewer,subscriberVerified:true}),'executed');
 assert.equal(emitted.at(-1).payload.effect,'tiny');
 now+=6001;assert.equal(await c.handle({...viewer,subscriberVerified:true}),'cooldown');
 assert.equal(await c.handle({...viewer,text:'!mmm',subscriberVerified:true}),'cooldown');
 now+=14000;assert.equal(await c.handle({...viewer,broadcaster:true}),'executed');
});
