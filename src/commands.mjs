import {event} from './events.mjs';
export const effects=['hello','cocoa','chaos','hydrate','mmm','cat','flail','calculator'];
export const rules={hello:{access:'everyone'},cocoa:{access:'everyone'},cat:{access:'everyone'},chaos:{access:'moderators'},flail:{access:'moderators'},hydrate:{access:'everyone',globalMs:120000,viewerMs:180000},mmm:{access:'subscribers'}};
export class Commands {
  constructor(emit,reply,now=Date.now){this.emit=emit;this.reply=reply;this.now=now;this.users=new Map();this.global=-Infinity;this.special=new Map();this.replies=[];}
  async handle(m,source='twitch') {
    const command=m.text.trim().toLowerCase(),effect=command.slice(1),rule=rules[effect];
    if(!command.startsWith('!')||!rule)return 'ignored';
    if(rule.access==='moderators'&&!m.privileged)return 'permission denied';
    if(rule.access==='subscribers'&&!m.broadcaster&&!m.subscriberVerified)return 'verified subscriber required';
    const now=this.now(),viewerKey=rule.viewerMs?`${effect}:${m.userId}`:m.userId;
    if(now-this.global<6000||now-(this.users.get(viewerKey)??-Infinity)<(rule.viewerMs||20000)||now-(this.special.get(effect)??-Infinity)<(rule.globalMs||0))return 'cooldown';
    this.global=now;this.users.set(viewerKey,now);if(rule.globalMs)this.special.set(effect,now);
    for(const [id,time] of this.users)if(now-time>600000)this.users.delete(id);
    this.emit(event('stream.command.executed',source,{command,user:m.name,messageId:m.id}));
    this.effect(effect,m.name,m.id,source);
    this.replies=this.replies.filter(t=>now-t<30000);
    if(source==='twitch'&&this.replies.length<5){
      this.replies.push(now);
      const reply={hello:`Welcome, ${m.name}! The faculty office has saved you a seat.`,cocoa:`Hot cocoa for ${m.name}. Marshmallow budget: thoroughly exceeded.`,chaos:'The paperwork has staged a harmless rebellion.',hydrate:'HYDRATION CHECK! Cat Girl, drink some water!',mmm:'Verified marshmallow cats, reporting for snack duty.',cat:'A tiny office menace has arrived.',flail:'Faculty celebration protocol: maximum flail.'};
      await this.reply(reply[effect]);
    }
    return 'executed';
  }
  effect(effect,user,messageId,source='twitch'){
    if(!effects.includes(effect))throw Error('Unknown effect');
    this.emit(event('stream.overlay.effect',source,{effect,user,durationMs:5500,messageId}));
  }
}
