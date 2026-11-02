// Approved Director artwork; all animation stays replaceable and local to the effect layer.
const base='/assets/reactions/';
function img(parent,file,cls){const e=document.createElement('img');e.src=base+file;e.className=cls;e.alt='';e.draggable=false;parent.append(e);return e;}
function node(parent,cls){const e=document.createElement('div');e.className=cls;parent.append(e);return e;}
function sequence(parent,prefix,count,order,cls){const host=node(parent,cls);order.forEach((frame,i)=>{const e=img(host,`${prefix}-${frame}.png`,'art-frame');e.style.setProperty('--frame',i);e.style.setProperty('--frames',order.length);});host.style.setProperty('--cycle',order.length/7+'s');return host;}
function label(parent,text){const e=node(parent,'art-caption');e.textContent=text;}
export function renderApprovedArt(effect,layer,{width,height,user}){
 layer.classList.toggle('portrait-art',width<height);
 if(effect==='hello'){img(layer,'hello.png','approved-hello art-arrive');label(layer,`Welcome, ${user.slice(0,50)}. The faculty office saved you a seat.`);return true;}
 if(effect==='cocoa'){const mug=node(layer,'approved-cocoa art-arrive');img(mug,'cocoa-cup.png','art-fill');for(let i=0;i<6;i++){const m=img(mug,'cocoa-garnish.png','approved-garnish');m.style.setProperty('--i',i);}label(layer,'Marshmallow budget: exceeded.');return true;}
 if(effect==='hydrate'){img(layer,'hydrate.png','approved-hydrate');label(layer,'HYDRATION CHECK! Cat Girl, drink some water!');for(let i=0;i<8;i++){const s=node(layer,'art-sparkle');s.textContent=i%2?'✦':'💧';s.style.left=30+Math.random()*40+'%';s.style.top=25+Math.random()*30+'%';s.style.animationDelay=i*.1+'s';}return true;}
 if(effect==='mmm'){for(let i=0;i<32;i++){const e=img(layer,`rain-${i%6+1}.png`,'approved-rain');e.style.left=5+Math.random()*85+'%';e.style.width=64+Math.random()*50+'px';e.style.setProperty('--fall',height+250+'px');e.style.setProperty('--drift',(Math.random()-.5)*160+'px');e.style.setProperty('--turn',(Math.random()-.5)*320+'deg');e.style.animationDuration=3.7+Math.random()*.8+'s';e.style.animationDelay=Math.random()*.7+'s';}label(layer,'A purr-fect marshmallow situation.');return true;}
 if(effect==='flail'){sequence(layer,'flail',4,[1,2,1,3,4,3,2,4],'approved-flail');label(layer,'Maximum faculty enthusiasm.');return true;}
 if(effect==='cat'){const lane=node(layer,'approved-cat-lane');lane.style.setProperty('--travel',width+450+'px');img(lane,'paper-stack.png','approved-stack');sequence(lane,'run',6,[1,2,3,4,5,6],'approved-runner');for(let i=0;i<9;i++){const p=img(lane,`paper-${i%5+1}.png`,'approved-loose');p.style.setProperty('--dx',(i-4)*60+'px');p.style.setProperty('--turn',(i-4)*50+'deg');}label(layer,'The office has a new supervisor.');return true;}
 if(effect==='chaos'){sequence(layer,'chaos',4,[1,2,3,4],'approved-chaos');return true;}
 if(effect==='calculator'){img(layer,'calculator.png','approved-calculator');img(layer,'calculator-burst.png','approved-burst');for(let i=0;i<35;i++){const n=node(layer,'number-confetti');n.textContent=String(i%10);n.style.setProperty('--dx',(Math.random()-.5)*width*.8+'px');n.style.setProperty('--dy',(Math.random()-.5)*height*.7+'px');n.style.setProperty('--spin',Math.random()*600+'deg');n.style.setProperty('--color',['#efbedb','#ffde9b','#b8dba6'][i%3]);}label(layer,'The Dean has lost count. Thank you, '+user.slice(0,40));return true;}
 return false;
}
