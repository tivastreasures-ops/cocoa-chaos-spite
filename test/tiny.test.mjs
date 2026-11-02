import test from 'node:test';
import assert from 'node:assert/strict';
import {Commands} from '../src/commands.mjs';
import {EffectQueue} from '../public/effect-queue.js';
test('tiny command reaches the overlay queue and automatically clears',async()=>{
 let played=false,cleared=false,finish;
 const queue=new EffectQueue(e=>{assert.equal(e.payload.effect,'tiny');played=true;return()=>cleared=true;},{schedule:callback=>{finish=callback;}});
 const c=new Commands(e=>{if(e.type==='stream.overlay.effect')assert.equal(queue.accept(e),true);},async()=>{},()=>100000);
 assert.equal(await c.handle({text:'!tiny',userId:'director',name:'Director',id:'tiny-check',broadcaster:true},'preview'),'executed');
 assert.equal(played,true);assert.equal(cleared,false);finish();assert.equal(cleared,true);assert.equal(queue.busy,false);
});
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
