import {PcmPlayer} from './pcm-player.js';
import {EffectQueue} from './effect-queue.js';
import {renderNewEffect} from './new-effects.js';
const canvas=document.getElementById('canvas');let width=1920,height=1080;
function resize(){canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.style.transform=`scale(${Math.min(innerWidth/width,innerHeight/height)})`;}
fetch('/api/canvas').then(r=>r.json()).then(c=>{const q=new URLSearchParams(location.search);for(const k of ['width','height']){const n=Number(q.get(k)||c[k]);if(Number.isInteger(n)&&n>=320&&n<=7680){if(k==='width')width=n;else height=n;}}resize();});addEventListener('resize',resize);resize();
function make(tag,cls,text,parent){const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;(parent||canvas).append(n);return n;}
function render(e){
 const layer=make('div','effect'),p=e.payload;layer.dataset.effect=p.effect;
 if(p.effect==='hello'){const box=make('div','greeting','',layer);make('small','',e.source==='preview'?'DIRECTOR PREVIEW':'COCOA & CHAOS & SPITE',box);make('h1','',`Welcome, ${p.user.slice(0,50)}.`,box);make('p','','The faculty office saved you a seat.',box);for(let i=0;i<12;i++){const s=make('div','star','✦',layer);s.style.left=5+Math.random()*55+'%';s.style.top=35+Math.random()*50+'%';s.style.setProperty('--delay',Math.random()+'s');}}
 if(p.effect==='cocoa'){const mug=make('div','cocoa','',layer);make('span','','✦',mug);make('div','cocoa-label','Marshmallow budget: exceeded.',layer);for(let i=0;i<65;i++){const m=make('i','marshmallow','',layer);m.style.right=120+Math.random()*330+'px';m.style.bottom=290+Math.random()*85+'px';m.style.setProperty('--delay',Math.random()*.7+'s');}}
 if(p.effect==='chaos'){for(let i=0;i<30;i++){const paper=make('div','paper','',layer);paper.style.left=Math.random()*95+'%';paper.style.setProperty('--delay',Math.random()*.5+'s');paper.style.setProperty('--drift',(Math.random()-.5)*500+'px');paper.style.setProperty('--fall',height+400+'px');}const label=make('div','greeting','',layer);make('small','','FACULTY OFFICE INCIDENT #001',label);make('h1','','The paperwork has escaped.',label);}
 renderNewEffect(p.effect,layer,{width,height,user:p.user});
 return ()=>layer.remove();
}
const queue=new EffectQueue(render);
const caption=document.createElement('div');caption.className='voice-caption';document.body.append(caption);
const enable=document.createElement('button');enable.className='voice-enable';enable.textContent='Enable Sebastian audio';enable.hidden=true;document.body.append(enable);
const audio=new PcmPlayer({caption:text=>{caption.textContent=text;},status:text=>{enable.hidden=!text.includes('blocked');}});
enable.onclick=()=>audio.unlock().then(()=>enable.hidden=true).catch(()=>enable.hidden=false);
audio.unlock().catch(()=>enable.hidden=false);
const feed=new EventSource('/api/events');feed.onmessage=msg=>{try{const e=JSON.parse(msg.data);if(e.type==='stream.voice.audio')audio.accept(e.payload);else queue.accept(e);}catch{/* Invalid browser events are discarded. */}};feed.onerror=()=>audio.clear();
