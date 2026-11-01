const $=id=>document.getElementById(id);let csrf='',lastLists='';
const notice=text=>{$('notice').textContent=text;};
async function post(path,data={}){try{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});const b=await r.json();if(!r.ok)throw Error(b.error);notice(b.result||'Done.');await refresh();return b;}catch(e){notice(e.message);}}
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function message(m,review=true){const div=node('div');div.className='message';div.append(node('strong',m.name),node('p',m.text));if(review){const b=node('button','Add to review tray');b.onclick=()=>post('/api/suggest',{messageId:m.id,action:'review',reason:'Director requested review'});div.append(b);}return div;}
async function refresh(){try{
 const r=await fetch('/api/status');if(!r.ok)throw Error('Dashboard session expired; reload this page');const s=await r.json();csrf=s.csrf;
 if($('authorization'))$('authorization').textContent='Authorization: '+s.authorization+(s.validationRetryAt?' · retry '+new Date(s.validationRetryAt).toLocaleTimeString():'');
 if($('subscription-status'))$('subscription-status').textContent=s.subscriptionStatus||'Update activation pending';
 if($('subscription-count'))$('subscription-count').textContent=(s.subscriptionCount||0)+' real subscription events · previews never count';
 if(s.previewOnly){$('subscription-auth').hidden=true;$('connection').dataset.preview='true';}
 $('connection').textContent=s.eventsub==='subscribed'?'● Twitch connected':'○ Twitch '+s.eventsub;$('setup').hidden=s.configured;$('account').textContent=s.account?.login||'Not authorized';$('channel').textContent=s.channel?'Channel: '+s.channel:'Waiting for authorization';$('eventsub').textContent=s.eventsub;$('overlays').textContent=s.overlays+' connected';$('canvas').textContent=s.canvas.width+' × '+s.canvas.height+' · transparent';$('counts').textContent=s.liveCount+' real messages · '+s.previewCount+' previews';$('last').textContent=s.lastChat?s.lastChat.name+': '+s.lastChat.text+' · '+s.lastChat.time:'None received';$('digest').textContent=s.summary.messageCount+' messages from '+s.summary.viewerCount+' viewers in '+s.summary.window+'.';$('voice').textContent=s.voice;
 const key=JSON.stringify([s.summary,s.queue,s.voiceRequests]);if(key!==lastLists){lastLists=key;
 $('questions').replaceChildren(...s.summary.questions.map(m=>message(m)));if(!s.summary.questions.length)$('questions').textContent='No questions surfaced yet.';
 $('highlights').replaceChildren(...s.summary.highlights.map(m=>message(m)));
 $('queue').replaceChildren(...s.queue.map(q=>{const d=message({name:q.viewer,text:q.text},false);d.append(node('p',q.action+' · '+q.status));if(q.status==='pending'){for(const [label,approved] of [['Approve for manual Twitch action',true],['Dismiss',false]]){const b=node('button',label);b.onclick=()=>post('/api/decision',{id:q.id,approved});d.append(b,document.createTextNode(' '));}}return d;}));
 $('voice-queue').replaceChildren(...s.voiceRequests.map(v=>{const d=node('div');d.append(node('p',v.kind==='reply'?'Suggested reply: '+v.message:'Suggested effect: '+v.effect));for(const approved of [true,false]){const b=node('button',approved?'Approve and execute':'Dismiss');b.onclick=()=>post('/api/voice-decision',{id:v.id,approved});d.append(b);}return d;}));}
 $('logs').replaceChildren(...s.logs.slice().reverse().map(l=>node('div',l.time.slice(11,19)+' '+l.message)));
 if(s.hosted&&!s.chatEnabled)$('connection').textContent='HOSTED STAGING · TWITCH INGESTION PAUSED';
 if(s.previewOnly){$('setup').hidden=true;$('connection').textContent='ISOLATED PREVIEW · TWITCH DISABLED';}
}catch(e){notice(e.message);}}
$('credentials').onsubmit=async e=>{e.preventDefault();await post('/api/setup',{clientId:$('client-id').value.trim(),clientSecret:$('client-secret').value.trim()});$('client-secret').value='';};
$('reconnect').onclick=()=>post('/api/reconnect');$('disconnect').onclick=()=>post('/api/disconnect');document.querySelectorAll('[data-effect]').forEach(b=>b.onclick=()=>post('/api/preview',{effect:b.dataset.effect}));
$('reply').onsubmit=async e=>{e.preventDefault();const result=await post('/api/reply',{message:$('reply-text').value});if(result)$('reply-text').value='';};
refresh();setInterval(refresh,2500);
