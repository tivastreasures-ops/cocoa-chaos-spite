// Only Twitch's validated channel.subscribe handler calls this in production.
export class SubscriptionEffects {
  constructor(commands,now=Date.now){this.commands=commands;this.now=now;this.seen=new Map();}
  handle(subscription){
    const now=this.now();for(const [id,time] of this.seen)if(now-time>600000)this.seen.delete(id);
    if(this.seen.has(subscription.id))return false;
    this.seen.set(subscription.id,now);if(this.seen.size>1000)this.seen.delete(this.seen.keys().next().value);
    this.commands.effect('calculator',subscription.name,subscription.id,'twitch');return true;
  }
}
