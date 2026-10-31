import {event} from './events.mjs';
export class Commands {
  constructor(emit,reply,now=Date.now){this.emit=emit;this.reply=reply;this.now=now;this.users=new Map();this.global=0;this.replies=[];}
  async handle(m,source='twitch') {
    const command=m.text.trim().toLowerCase();
    if(!['!hello','!cocoa','!chaos'].includes(command)) return 'ignored';
    if(command==='!chaos'&&!m.privileged) return 'permission denied';
    const now=this.now();
    if(now-this.global<6000||now-(this.users.get(m.userId)||0)<20000) return 'cooldown';
    this.global=now;this.users.set(m.userId,now);
    for(const [id,time] of this.users) if(now-time>60000)this.users.delete(id);
    const effect=command.slice(1);
    this.emit(event('stream.command.executed',source,{command,user:m.name,messageId:m.id}));
    this.emit(event('stream.overlay.effect',source,{effect,user:m.name,durationMs:5500,messageId:m.id}));
    this.replies=this.replies.filter(t=>now-t<30000);
    if(source==='twitch'&&this.replies.length<5){
      this.replies.push(now);
      await this.reply(effect==='hello'?`Welcome, ${m.name}! The faculty office has saved you a seat.`:effect==='cocoa'?`Hot cocoa for ${m.name}. Marshmallow budget: thoroughly exceeded.`:'The paperwork has staged a harmless rebellion.');
    }
    return 'executed';
  }
}
