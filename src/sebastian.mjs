import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {root,dataDir} from './config.mjs';

export const SEBASTIAN_AGENT='agent_4301m69cqaa8e1h8cvbd9g3a1pq2';
export const SEBASTIAN_VOICE='2X0uNJ4yDHqWnhVL8Ry4';
const rates=new Set([16000,22050,24000,44100,48000]);
export class Sebastian {
  constructor({fetcher=fetch,Socket=WebSocket,emit=()=>{},log=()=>{},previewOnly=false,directory=dataDir,key=process.env.ELEVENLABS_API_KEY||'',later=setTimeout,cancel=clearTimeout}={}){
    Object.assign(this,{fetch:fetcher,Socket,emit,log,previewOnly,directory,key,later,cancel});
    this.state='not connected';this.route='dashboard';this.muted=false;this.volume=.7;this.captions=true;this.generation=0;this.rate=16000;this.session=null;
  }
  async init(){if(this.previewOnly)return;try{const saved=JSON.parse(await readFile(join(this.directory,'sebastian.json'),'utf8'));this.key||=saved.apiKey||'';}catch(e){if(e.code!=='ENOENT')this.state='local credential file unreadable';}}
  status(){return {agentId:SEBASTIAN_AGENT,voiceId:SEBASTIAN_VOICE,configured:Boolean(this.key),state:this.state,route:this.route,muted:this.muted,volume:this.volume,captions:this.captions,session:this.session,expiresAt:this.expiresAt||null,verifiedAt:this.verifiedAt||null,paidSessionActive:Boolean(this.socket),microphone:false};}
  async configure(apiKey){
    if(this.previewOnly)throw Error('Credentials disabled in preview sandbox');
    if(this.connecting||this.socket)throw Error('Stop Sebastian before changing credentials');
    if(typeof apiKey!=='string'||apiKey.length<20||apiKey.length>300||/\s/.test(apiKey)||!apiKey.startsWith('sk_'))throw Error('Use the secret ElevenLabs key starting sk_, not its key ID. Copy it when creating or rotating the key.');
    await mkdir(this.directory,{recursive:true,mode:0o700});const p=join(this.directory,'sebastian.json');await writeFile(p+'.tmp',JSON.stringify({apiKey}),{mode:0o600});await rename(p+'.tmp',p);this.key=apiKey;this.verifiedAt=null;
  }
  async api(path){
    if(!this.key)throw Error('Add an ElevenLabs API key locally first; the connected workspace does not share its key with this app');
    const r=await this.fetch('https://api.elevenlabs.io/v1/'+path,{headers:{'xi-api-key':this.key},signal:AbortSignal.timeout(15000)});
    if(!r.ok){
      const b=await r.json().catch(()=>({}));
      const messages={
        api_key_id_used_as_api_key:'Saved value is a key ID. Replace it with the secret key starting sk_, shown when you create or rotate the key.',
        invalid_api_key:'ElevenLabs rejected this key. Check the secret key or replace it locally.',
        missing_permissions:'This key lacks permission for this agent. Review its ElevenLabs agent/conversation permissions.'
      };
      throw Error(messages[b.detail?.status]||`ElevenLabs access failed (${r.status}); check workspace access and key permissions`);
    }
    return r.json();
  }
  async verify(){
    if(this.previewOnly)throw Error('Live ElevenLabs access disabled in preview sandbox');
    const a=await this.api('convai/agents/'+SEBASTIAN_AGENT);
    if(a.agent_id!==SEBASTIAN_AGENT||a.conversation_config?.tts?.voice_id!==SEBASTIAN_VOICE)throw Error('Sebastian identity or approved voice differs; Director review required');
    const format=a.conversation_config.tts.agent_output_audio_format;
    if(!/^pcm_\d+$/.test(format)||!rates.has(Number(format.slice(4))))throw Error('Unsupported agent audio format; no agent settings were changed');
    this.rate=Number(format.slice(4));this.verifiedAt=new Date().toISOString();return {verified:true,agentId:SEBASTIAN_AGENT,voiceId:SEBASTIAN_VOICE,format};
  }
  output(type,payload={},route=this.route){this.emit(route,{type,session:this.session,...payload});}
  settings({route=this.route,muted=this.muted,volume=this.volume,captions=this.captions}={}){
    if(!['dashboard','overlay'].includes(route)||typeof muted!=='boolean'||typeof captions!=='boolean'||typeof volume!=='number'||!Number.isFinite(volume)||volume<0||volume>1)throw Error('Invalid audio controls');
    if(route!==this.route){this.output('stop',{},this.route);this.route=route;}
    Object.assign(this,{muted,volume,captions});this.output('settings',{muted,volume,captions});return this.status();
  }
  async start(approvePaid){
    if(approvePaid!==true)throw Error('Director approval required: ElevenLabs agent sessions consume service credits');
    if(this.previewOnly)throw Error('Paid generation disabled in preview sandbox');
    if(this.connecting||this.socket)throw Error('Sebastian already connecting or connected');
    const generation=++this.generation;this.connecting=true;this.state='verifying identity';
    try{
      await this.verify();if(generation!==this.generation)return;
      const signed=await this.api('convai/conversation/get-signed-url?agent_id='+SEBASTIAN_AGENT);
      if(generation!==this.generation)return;
      const url=new URL(signed.signed_url);
      if(url.protocol!=='wss:'||url.hostname!=='api.elevenlabs.io'||url.pathname!=='/v1/convai/conversation'||url.username||url.password||url.port||url.searchParams.get('agent_id')!==SEBASTIAN_AGENT)throw Error('Rejected unexpected ElevenLabs session URL');
      this.session=randomUUID();this.expiresAt=Date.now()+60000;this.audioSeconds=0;this.metadata=false;this.lastMessage=0;this.state='connecting';
      const s=this.socket=new this.Socket(url.href);const current=()=>generation===this.generation&&this.socket===s;
      this.output('reset',{muted:this.muted,volume:this.volume,captions:this.captions});
      this.limit=this.later(()=>{if(current())this.stop('60-second session limit reached');},60000);this.limit?.unref?.();
      this.handshake=this.later(()=>{if(current()&&!this.metadata)this.stop('Agent handshake timed out');},15000);this.handshake?.unref?.();
      s.addEventListener('open',()=>{if(current())s.send(JSON.stringify({type:'conversation_initiation_client_data'}));});
      s.addEventListener('message',raw=>{if(!current())return;try{this.frame(raw.data,s);}catch{this.stop('Agent message rejected; session stopped');}});
      s.addEventListener('error',()=>{if(current())this.stop('Agent connection failed; no automatic paid retry');});
      s.addEventListener('close',()=>{if(current())this.stop('Agent session ended');});
      this.log('Director-approved Sebastian session requested; private/stream routing follows dashboard controls');
    }catch(e){if(generation===this.generation){this.stop('Agent connection unavailable');throw e;}}
    finally{if(generation===this.generation)this.connecting=false;}
  }
  frame(raw,s){
    if(typeof raw!=='string'||raw.length>350000)throw Error('Invalid agent frame');const m=JSON.parse(raw);
    if(m.type==='ping'){if(Number.isSafeInteger(m.ping_event?.event_id))s.send(JSON.stringify({type:'pong',event_id:m.ping_event.event_id}));return;}
    if(m.type==='conversation_initiation_metadata'){
      const format=m.conversation_initiation_metadata_event?.agent_output_audio_format;
      if(format!=='pcm_'+this.rate)throw Error('Audio format differs from verified configuration');
      this.metadata=true;this.cancel(this.handshake);this.state='connected';return;
    }
    if(!this.metadata)throw Error('Agent metadata required');
    if(m.type==='audio'){
      const audio=m.audio_event?.audio_base_64;
      if(typeof audio!=='string'||!audio.length||audio.length>260000||audio.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(audio))throw Error('Invalid audio');
      const bytes=Buffer.from(audio,'base64');if(bytes.length%2)throw Error('Invalid PCM');this.audioSeconds+=bytes.length/(this.rate*2);
      if(this.audioSeconds>90)throw Error('Excess audio');
      if(!this.muted)this.output('pcm',{audio,rate:this.rate,muted:this.muted,volume:this.volume,captions:this.captions});
    }else if(m.type==='agent_response'||m.type==='agent_response_correction'){
      const text=m.type==='agent_response'?m.agent_response_event?.agent_response:m.agent_response_correction_event?.corrected_agent_response;
      if(typeof text==='string')this.output('caption',{text:text.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,1200),captions:this.captions});
    }else if(m.type==='interruption')this.output('stop');
    else if(m.type==='client_tool_call'){
      // This connection has no authority to send chat, moderate or run effects.
      const call=m.client_tool_call;
      if(typeof call?.tool_call_id==='string')s.send(JSON.stringify({type:'client_tool_result',tool_call_id:call.tool_call_id,is_error:true,result:'Not executed. Use the separate Director approval controls.'}));
    }else if(m.type==='error'||m.type==='client_error')throw Error('Agent error');
  }
  message(text){
    if(!this.socket||!this.metadata||this.state!=='connected')throw Error('Start a Director-approved session first');
    if(typeof text!=='string'||!text.trim()||text.length>500||/[\u0000-\u001f\u007f]/.test(text))throw Error('Message must be 1–500 characters');
    if(Date.now()-this.lastMessage<6000)throw Error('Wait six seconds between Director messages');this.lastMessage=Date.now();
    this.socket.send(JSON.stringify({type:'user_message',text:text.trim()}));
  }
  stop(reason='Stopped by Director'){
    ++this.generation;this.connecting=false;this.cancel(this.limit);this.cancel(this.handshake);const s=this.socket;this.socket=null;if(s)s.close();this.output('stop');this.metadata=false;this.expiresAt=null;this.state=reason;
  }
  testTone(){
    if(this.socket||this.connecting)throw Error('Stop the agent before testing the audio path');
    this.session=randomUUID();this.output('reset',{muted:this.muted,volume:this.volume,captions:this.captions});
    const pcm=Buffer.alloc(16000);for(let i=0;i<8000;i++)pcm.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/16000)*2400*Math.sin(Math.PI*i/8000)),i*2);
    this.output('caption',{text:'Audio path test tone · not Sebastian’s voice · no ElevenLabs credits',captions:this.captions});
    this.output('pcm',{audio:pcm.toString('base64'),rate:16000,muted:this.muted,volume:this.volume,captions:this.captions});
  }
}
