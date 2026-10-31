// Original CSS/SVG artwork. Replace these builders independently of chat permissions.
const NS='http://www.w3.org/2000/svg';
function html(tag,cls,parent,text){const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;parent.append(n);return n;}
function shape(parent,tag,attrs){const n=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,String(value));parent.append(n);return n;}
export function catArt(parent,marshmallow=false){
  const svg=shape(parent,'svg',{viewBox:'0 0 220 150',class:marshmallow?'cat-art marshmallow-art':'cat-art',role:'img','aria-label':marshmallow?'Marshmallow cat':'Mischievous office cat'});
  const fur=marshmallow?'#fff0dd':'#343649',accent=marshmallow?'#d5a8a9':'#e5bd91';
  shape(svg,'path',{d:'M162 100 C211 105 215 48 189 54',fill:'none',stroke:fur,'stroke-width':17,'stroke-linecap':'round',class:'cat-tail'});
  shape(svg,'ellipse',{cx:116,cy:100,rx:63,ry:32,fill:fur});
  const feet=shape(svg,'g',{class:'cat-feet'});for(const x of [72,99,142,165])shape(feet,'path',{d:`M${x} 106 l-9 26`,stroke:fur,'stroke-width':14,'stroke-linecap':'round'});
  shape(svg,'path',{d:'M35 67 L35 17 L63 37 Q80 30 96 38 L120 20 L119 77 Q113 106 78 106 Q36 104 35 67',fill:fur});
  shape(svg,'path',{d:'M43 45 L43 31 L57 43 M101 45 L113 33 L112 52',stroke:accent,'stroke-width':5,fill:'none'});
  for(const x of [60,94])shape(svg,'ellipse',{cx:x,cy:67,rx:4,ry:6,fill:marshmallow?'#685060':'#c3dfb4'});
  shape(svg,'path',{d:'M73 78 l5 4 5-4 M78 82 q-6 10-12 3 M78 82 q6 10 12 3',stroke:accent,'stroke-width':3,fill:'none','stroke-linecap':'round'});
  shape(svg,'path',{d:'M50 80 L22 75 M50 87 L22 92 M105 80 L130 73 M104 88 L129 93',stroke:accent,'stroke-width':2});return svg;
}
function caption(layer,title,subtitle){const c=html('div','new-caption',layer);html('small','',c,subtitle||'COCOA & CHAOS & SPITE');html('h1','',c,title);return c;}
export function renderNewEffect(effect,layer,{width,height,user}){
  if(effect==='hydrate'){
    const card=html('div','hydration-card',layer);html('div','water-glass',card);html('h1','',card,'HYDRATION CHECK!');html('p','',card,'Cat Girl, drink some water!');
    for(let i=0;i<12;i++){const d=html('i','water-drop',card);d.style.setProperty('--angle',i*30+'deg');}return;
  }
  if(effect==='mmm'){
    caption(layer,'A purr-fect marshmallow situation.','VERIFIED SUBSCRIBER TREAT');
    for(let i=0;i<32;i++){const c=html('div','marshmallow-cat',layer);c.style.left=Math.random()*92+'%';c.style.setProperty('--delay',Math.random()*.7+'s');c.style.setProperty('--fall',height+250+'px');c.style.setProperty('--tilt',(Math.random()-.5)*160+'deg');catArt(c,true);}return;
  }
  if(effect==='cat'||effect==='chaos'){
    const lane=html('div','cat-lane',layer);lane.style.setProperty('--travel',width+400+'px');const runner=html('div','cat-runner',lane);catArt(runner);
    for(let i=0;i<7;i++){const p=html('div','knocked-paper',lane,'FACULTY\nMEMO');p.style.left=45+i*4+'%';p.style.setProperty('--scatter',(i-3)*110+'px');p.style.setProperty('--turn',(i-3)*45+'deg');}
    if(effect==='cat')caption(layer,'The office has a new supervisor.','PAPERWORK IS A CAT TOY');return;
  }
  if(effect==='flail'){
    const dancer=html('div','catgirl-celebration',layer);
    const svg=shape(dancer,'svg',{viewBox:'0 0 400 480',role:'img','aria-label':'Original cat-eared figure flailing arms with a swishing tail'});
    const ink='#333845',edge='#b6cbaa';
    shape(svg,'path',{d:'M240 330 C365 390 375 252 325 265',stroke:ink,'stroke-width':25,fill:'none','stroke-linecap':'round',class:'girl-tail'});
    for(const side of ['left','right']){const g=shape(svg,'g',{class:'flail-arm '+side});shape(g,'path',{d:side==='left'?'M175 220 Q96 200 78 114 L62 66':'M225 220 Q303 196 326 110 L345 61',stroke:ink,'stroke-width':24,fill:'none','stroke-linecap':'round'});shape(g,'circle',{cx:side==='left'?62:345,cy:side==='left'?66:61,r:19,fill:ink});}
    shape(svg,'path',{d:'M164 214 Q200 188 235 214 L263 341 Q201 368 139 341 Z',fill:ink});
    shape(svg,'path',{d:'M169 335 L156 442 M229 335 L242 442',stroke:ink,'stroke-width':28,'stroke-linecap':'round'});
    shape(svg,'path',{d:'M142 143 L142 61 L178 88 Q204 74 226 91 L261 58 L259 148 Q257 201 201 202 Q144 201 142 143',fill:ink,stroke:edge,'stroke-width':3});
    shape(svg,'path',{d:'M170 145 Q179 133 188 145 M214 145 Q223 133 232 145 M190 168 Q202 180 216 166',stroke:edge,'stroke-width':5,fill:'none','stroke-linecap':'round'});
    caption(layer,'Maximum faculty enthusiasm.','CELEBRATION PROTOCOL: FLAIL');return;
  }
  if(effect==='calculator'){
    const box=html('div','deans-calculator',layer);html('small','',box,"DEAN’S CALCULATOR");html('div','calculator-display',box,'ERROR: TOO MUCH JOY');const keys=html('div','calculator-keys',box);for(const key of ['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'])html('span','',keys,key);
    for(let i=0;i<45;i++){const p=html('span',i%3===0?'flying-key':'number-confetti',layer,i%3===0?['+','=','7','×'][i%4]:String(i%10));p.style.setProperty('--dx',(Math.random()-.5)*width*.85+'px');p.style.setProperty('--dy',(Math.random()-.5)*height*.85+'px');p.style.setProperty('--spin',Math.random()*600+'deg');p.style.setProperty('--color',['#e7b394','#b6cbaa','#d6b0cf','#9bcbdc'][i%4]);}
    caption(layer,'The Dean has lost count.','NEW SUBSCRIPTION · THANK YOU, '+user.slice(0,40));
  }
}
