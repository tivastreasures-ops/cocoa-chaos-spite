// Pure bounded queue; shared by the renderer and its automated tests.
export class EffectQueue {
  constructor(play,{schedule=(callback,ms)=>setTimeout(callback,ms),now=Date.now}={}){this.play=play;this.schedule=schedule;this.now=now;this.pending=[];this.busy=false;this.seen=new Set();}
  accept(e){
    if(e?.schemaVersion!==1||e.type!=='stream.overlay.effect'||!['twitch','preview','director'].includes(e.source)||typeof e.eventId!=='string'||e.eventId.length>100||!['hello','cocoa','chaos','hydrate','mmm','cat','flail','calculator'].includes(e.payload?.effect)||typeof e.payload.user!=='string'||e.payload.user.length>100||e.payload.durationMs!==5500)return false;
    if(this.seen.has(e.eventId)||this.pending.length>=4)return false;
    this.seen.add(e.eventId);if(this.seen.size>200)this.seen.delete(this.seen.values().next().value);
    this.pending.push({e,received:this.now()});this.next();return true;
  }
  next(){
    if(this.busy)return;
    while(this.pending.length){const {e,received}=this.pending.shift();if(this.now()-received>30000)continue;
      this.busy=true;let clear=()=>{};try{clear=this.play(e)||clear;}catch{this.busy=false;continue;}
      this.schedule(()=>{try{clear();}finally{this.busy=false;this.next();}},e.payload.durationMs);return;
    }
  }
}
