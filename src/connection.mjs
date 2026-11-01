// Owns validation retries; transport reconnects remain in Twitch.
export class Connection {
  constructor(auth,twitch,log,{later=setTimeout,cancel=clearTimeout,now=Date.now}={}) {
    Object.assign(this,{auth,twitch,log,later,cancel,now});
    this.generation=0;this.attempt=0;this.state='not authorized';this.nextRetry=null;
  }
  pause(){this.generation++;this.cancel(this.timer);this.timer=null;this.nextRetry=null;this.pending=null;}
  async disconnect(){this.pause();this.twitch.stop();await this.auth.disconnect();this.state='not authorized';}
  async authorize(code){
    this.pause();this.twitch.stop();this.auth.invalidate();
    try{await this.auth.authorize(code);}catch(e){await this.validate();throw e;}
    return this.validate();
  }
  validate(reconnect=false){
    if(this.pending)return this.pending;
    this.cancel(this.timer);this.timer=null;this.nextRetry=null;
    const generation=this.generation;
    const work=async()=>{
      if(!this.auth.tokens){this.state='not authorized';return;}
      this.state='validating';
      try{
        await this.auth.validate();
        if(generation!==this.generation)return;
        this.state='valid';this.attempt=0;
        if(this.auth.account&&(reconnect||this.twitch.stopped))this.twitch.start();
      }catch(e){
        if(generation!==this.generation||e.kind==='cancelled')return;
        // A failed check must never leave an unvalidated session running.
        this.twitch.stop();
        if(e.kind==='authorization'){
          this.auth.account=null;this.auth.grantedScopes=[];
          this.state='authorization required';this.log('Twitch authorization requires renewed consent; saved credentials preserved');return;
        }
        const delay=Math.min(60000,1000*2**Math.min(this.attempt++,6));
        this.state='temporarily unavailable';this.nextRetry=this.now()+delay;
        this.log('Twitch validation unavailable; authorization preserved; automatic retry scheduled');
        this.timer=this.later(()=>{this.timer=null;this.validate();},delay);this.timer?.unref?.();
      }
    };
    this.pending=work().finally(()=>{if(generation===this.generation)this.pending=null;});
    return this.pending;
  }
}
