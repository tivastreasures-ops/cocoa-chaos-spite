import {PcmPlayer} from './pcm-player.js';
const $=id=>document.getElementById(id);
const player=new PcmPlayer({caption:text=>{$('sebastian-caption').textContent=text;},status:text=>{$('audio-state').textContent=text;}});
let csrf='';
async function post(action,data={}){
  const r=await fetch('/api/sebastian/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});const b=await r.json();if(!r.ok)throw Error(b.error||'Action failed');return b;
}
function report(e){$('audio-state').textContent=e.message;}
function controls(){return {route:$('speech-route').value,muted:$('speech-mute').checked,volume:Number($('speech-volume').value),captions:$('speech-captions').checked};}
async function poll(){try{
  const r=await fetch('/api/status');if(!r.ok)return;const s=await r.json();csrf=s.csrf;const v=s.sebastian;if(!v)return;
  $('sebastian-state').textContent=v.state+(v.expiresAt?' · ends '+new Date(v.expiresAt).toLocaleTimeString():'');
  $('sebastian-credentials').hidden=s.previewOnly;$('speech-start').disabled=!v.configured||s.previewOnly||v.paidSessionActive;$('speech-verify').disabled=!v.configured||s.previewOnly;
  if(document.activeElement!==$('speech-route'))$('speech-route').value=v.route;
  if(document.activeElement!==$('speech-volume'))$('speech-volume').value=v.volume;
  $('speech-mute').checked=v.muted;$('speech-captions').checked=v.captions;
  $('speech-message-button').disabled=!v.paidSessionActive;
}catch(e){report(e);}}
$('audio-enable').onclick=()=>player.unlock().catch(report);
$('speech-tone').onclick=async()=>{try{await player.unlock();await post('settings',controls());await new Promise(r=>setTimeout(r,300));await post('test');}catch(e){report(e);}};
$('speech-start').onclick=async()=>{
  if(!$('speech-paid').checked){report(Error('Approve this paid session first.'));return;}
  try{await player.unlock();await post('start',{approvePaid:true});$('speech-paid').checked=false;await poll();}catch(e){report(e);}
};
$('speech-stop').onclick=async()=>{player.clear();try{await post('stop');await poll();}catch(e){report(e);}};
$('speech-verify').onclick=async()=>{try{await post('verify');$('audio-state').textContent='Existing Sebastian and approved voice verified. No speech generated.';}catch(e){report(e);}};
$('sebastian-credentials').onsubmit=async e=>{e.preventDefault();try{await post('setup',{apiKey:$('elevenlabs-key').value.trim()});$('elevenlabs-key').value='';await poll();}catch(e){report(e);}};
$('speech-message').onsubmit=async e=>{e.preventDefault();try{await post('message',{text:$('speech-text').value});$('speech-text').value='';}catch(e){report(e);}};
for(const id of ['speech-route','speech-mute','speech-volume','speech-captions'])$(id).onchange=async()=>{try{await post('settings',controls());}catch(e){report(e);}};
const feed=new EventSource('/api/sebastian/events');feed.onmessage=e=>{try{const data=JSON.parse(e.data);player.accept(data.payload);}catch(e){report(e);}};feed.onerror=()=>{player.clear();$('audio-state').textContent='Audio feed reconnecting; reload dashboard if needed';};
poll();setInterval(poll,2500);
