const canvas=document.getElementById('canvas');let width=1920,height=1080,busy=false;const seen=new Set();
function resize(){canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.style.transform=`scale(${Math.min(innerWidth/width,innerHeight/height)})`;}
fetch('/api/canvas').then(r=>r.json()).then(c=>{const q=new URLSearchParams(location.search);for(const k of ['width','height']){const n=Number(q.get(k)||c[k]);if(Number.isInteger(n)&&n>=320&&n<=7680){if(k==='width')width=n;else height=n;}}resize();});addEventListener('resize',resize);resize();
function make(tag,cls,text,parent){const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;(parent||canvas).append(n);return n;}
function render(e){
 if(e?.schemaVersion!==1||e.type!=='stream.overlay.effect'||!['twitch','preview','director'].includes(e.source)||typeof e.eventId!=='string'||!['hello','cocoa','chaos'].includes(e.payload?.effect)||typeof e.payload.user!=='string'||e.payload.durationMs!==5500)return;
 if(seen.has(e.eventId)||busy)return;seen.add(e.eventId);if(seen.size>100)seen.delete(seen.values().next().value);busy=true;
 const layer=make('div','effect'),p=e.payload;layer.dataset.effect=p.effect;
 if(p.effect==='hello'){const box=make('div','greeting','',layer);make('small','',e.source==='preview'?'DIRECTOR PREVIEW':'COCOA & CHAOS & SPITE',box);make('h1','',`Welcome, ${p.user.slice(0,50)}.`,box);make('p','','The faculty office saved you a seat.',box);for(let i=0;i<12;i++){const s=make('div','star','✦',layer);s.style.left=5+Math.random()*55+'%';s.style.top=35+Math.random()*50+'%';s.style.setProperty('--delay',Math.random()+'s');}}
 if(p.effect==='cocoa'){const mug=make('div','cocoa','',layer);make('span','','✦',mug);make('div','cocoa-label','Marshmallow budget: exceeded.',layer);for(let i=0;i<65;i++){const m=make('i','marshmallow','',layer);m.style.right=120+Math.random()*330+'px';m.style.bottom=290+Math.random()*85+'px';m.style.setProperty('--delay',Math.random()*.7+'s');}}
 if(p.effect==='chaos'){for(let i=0;i<30;i++){const paper=make('div','paper','',layer);paper.style.left=Math.random()*95+'%';paper.style.setProperty('--delay',Math.random()*.5+'s');paper.style.setProperty('--drift',(Math.random()-.5)*500+'px');paper.style.setProperty('--fall',height+400+'px');}const label=make('div','greeting','',layer);make('small','','FACULTY OFFICE INCIDENT #001',label);make('h1','','The paperwork has escaped.',label);}
 setTimeout(()=>{layer.remove();busy=false;},5500);
}
const feed=new EventSource('/api/events');feed.onmessage=msg=>{try{render(JSON.parse(msg.data));}catch{/* Invalid browser events are discarded. */}};
