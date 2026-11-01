// Shared by private dashboard playback and the read-only stream overlay.
export class PcmPlayer {
  constructor({Context=globalThis.AudioContext||globalThis.webkitAudioContext,caption=()=>{},status=()=>{},later=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}={}){
    Object.assign(this,{Context,caption,status,later,cancel});this.nodes=new Set();this.volume=.7;this.muted=false;this.captions=true;this.next=0;this.session=null;
  }
  async unlock(){
    if(!this.context){this.context=new this.Context();this.gain=this.context.createGain();this.gain.connect(this.context.destination);}
    await this.context.resume();this.applyGain();if(this.context.state!=='running')throw Error('Click Enable audio in this browser');this.status('Audio ready');
  }
  applyGain(){if(this.gain)this.gain.gain.value=this.muted?0:this.volume;}
  clear(){for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();this.next=0;this.cancel(this.captionTimer);this.caption('');}
  accept(p){
    if(!p||typeof p.type!=='string')return;
    if(p.type==='stop'){this.clear();return;}
    if(p.type==='reset'||p.session!==this.session){this.clear();this.session=p.session;}
    if(typeof p.muted==='boolean')this.muted=p.muted;
    if(typeof p.volume==='number'&&p.volume>=0&&p.volume<=1)this.volume=p.volume;
    if(typeof p.captions==='boolean')this.captions=p.captions;
    this.applyGain();if(this.muted){this.clear();return;}
    if(!this.captions)this.caption('');
    if(p.type==='caption'){
      if(this.captions&&typeof p.text==='string'){this.caption(p.text);this.cancel(this.captionTimer);this.captionTimer=this.later(()=>this.caption(''),Math.min(15000,Math.max(4000,p.text.length*65)));}return;
    }
    if(p.type!=='pcm')return;
    if(!this.context||this.context.state!=='running'){this.status('Audio blocked — click Enable audio');return;}
    if(typeof p.audio!=='string'||p.audio.length>260000||!['16000','22050','24000','44100','48000'].includes(String(p.rate)))throw Error('Invalid audio payload');
    const raw=atob(p.audio);if(raw.length%2)throw Error('Invalid PCM');const duration=raw.length/(p.rate*2);
    const start=Math.max(this.context.currentTime+.025,this.next);
    if(start+duration-this.context.currentTime>12||this.nodes.size>=200){this.clear();this.status('Audio backlog cleared');return;}
    const buffer=this.context.createBuffer(1,raw.length/2,p.rate),samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++){const n=raw.charCodeAt(i*2)|(raw.charCodeAt(i*2+1)<<8);samples[i]=(n>=32768?n-65536:n)/32768;}
    const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.gain);source.onended=()=>{this.nodes.delete(source);source.disconnect();};this.nodes.add(source);source.start(start);this.next=start+duration;
  }
}
