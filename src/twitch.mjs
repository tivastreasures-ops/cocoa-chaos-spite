import {parseChat,parseSubscription} from './events.mjs';
export class Twitch {
  constructor(auth,onChat,diagnostic,Socket=WebSocket,onSubscription=()=>{}){this.auth=auth;this.onChat=onChat;this.onSubscription=onSubscription;this.diagnostic=diagnostic;this.Socket=Socket;this.status='offline';this.subscriptionStatus='additional authorization required';this.seen=new Map();this.sockets=new Set();this.active=null;this.stopped=true;this.attempt=0;this.generation=0;}
  start(){this.stop();this.stopped=false;this.connect();}
  stop(){this.stopped=true;this.generation++;clearTimeout(this.retry);this.retry=null;for(const s of this.sockets){clearTimeout(s.watchdog);s.close();}this.sockets.clear();this.active=null;this.status='offline';}
  async subscribeCalculator(sessionId){
    if(!this.auth.grantedScopes?.includes('channel:read:subscriptions')){this.subscriptionStatus='additional authorization required';return;}
    this.subscriptionStatus='connecting';
    try{await this.auth.api('eventsub/subscriptions',{type:'channel.subscribe',version:'1',condition:{broadcaster_user_id:this.auth.account.id},transport:{method:'websocket',session_id:sessionId}});this.subscriptionStatus='subscribed';this.diagnostic('New subscription calculator listener active');}
    catch{this.subscriptionStatus='unavailable; chat unaffected';this.diagnostic('Subscription listener unavailable; check authorization or channel eligibility');}
  }
  reconnect(){if(!this.auth.account)throw Error('Authorize Twitch first');this.start();}
  schedule(){if(this.stopped||this.retry)return;this.status='reconnecting';this.retry=setTimeout(()=>{this.retry=null;this.connect();},Math.min(30000,1000*2**Math.min(this.attempt++,5))+Math.random()*500);}
  connect(url='wss://eventsub.wss.twitch.tv/ws',migration=false){
    if(this.stopped)return;
    const generation=this.generation;
    const s=new this.Socket(url);this.sockets.add(s);let welcomed=false;
    if(!migration)this.status='connecting';
    const arm=(ms)=>{clearTimeout(s.watchdog);s.watchdog=setTimeout(()=>s.close(),ms);};arm(15000);
    s.addEventListener('message',async raw=>{
      if(generation!==this.generation||this.stopped)return;
      try {
        if(typeof raw.data!=='string'||raw.data.length>100000)throw Error('Invalid EventSub frame');
        const data=JSON.parse(raw.data),type=data.metadata?.message_type,p=data.payload;
        if(!type||!p)throw Error('Invalid EventSub envelope');
        arm(s.keepalive||15000);
        if(type==='session_welcome'){
          if(welcomed||typeof p.session?.id!=='string')throw Error('Invalid welcome');welcomed=true;
          s.keepalive=((p.session.keepalive_timeout_seconds||10)+2)*1000;arm(s.keepalive);
          if(!migration){const id=this.auth.account?.id;if(!id)throw Error('Authorization lost');await this.auth.api('eventsub/subscriptions',{type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:id,user_id:id},transport:{method:'websocket',session_id:p.session.id}});}
          if(generation!==this.generation||this.stopped){s.close();return;}
          const previous=this.active;this.active=s;this.status='subscribed';this.attempt=0;
          if(previous&&previous!==s)previous.close();
          this.diagnostic(migration?'EventSub session migrated':'EventSub chat subscription active');
          if(!migration)await this.subscribeCalculator(p.session.id);
        }else if(type==='session_reconnect'){
          const u=new URL(p.session?.reconnect_url);
          if(u.protocol!=='wss:'||u.hostname!=='eventsub.wss.twitch.tv'||u.port||u.username||u.password)throw Error('Rejected reconnect URL');
          if(this.sockets.size<2)this.connect(u.href,true);
        }else if(type==='notification'){
          const kind=p.subscription?.type;if(!['channel.chat.message','channel.subscribe'].includes(kind)||p.subscription?.version!=='1')return;
          if(kind==='channel.subscribe'&&this.subscriptionStatus!=='subscribed')return;
          const m=kind==='channel.chat.message'?parseChat(p.event,this.auth.account?.id):parseSubscription(p.event,this.auth.account?.id,data.metadata.message_id);if(!m)return;
          const timestamp=Date.parse(data.metadata.message_timestamp);
          if(!Number.isFinite(timestamp)||Math.abs(Date.now()-timestamp)>600000)return;
          const now=Date.now();for(const [id,t] of this.seen)if(now-t>600000)this.seen.delete(id);
          const key=kind+':'+m.id;if(this.seen.has(key))return;this.seen.set(key,now);if(this.seen.size>10000)this.seen.delete(this.seen.keys().next().value);
          if(kind==='channel.chat.message')await this.onChat(m);else await this.onSubscription(m);
        }else if(type==='revocation'){
          if(p.subscription?.type==='channel.subscribe'){this.subscriptionStatus='authorization required';this.diagnostic('Subscription listener revoked; chat remains connected');}
          else{this.stop();this.status='authorization required';this.diagnostic('Twitch revoked the subscription; authorize again');}
        }
      }catch{this.diagnostic('EventSub processing failed; check authorization and reconnect');if(!welcomed||typeSafe(raw.data)==='session_welcome')s.close();}
    });
    s.addEventListener('error',()=>{this.diagnostic('EventSub socket error');s.close();});
    s.addEventListener('close',()=>{clearTimeout(s.watchdog);this.sockets.delete(s);if(generation!==this.generation)return;if(this.active===s)this.active=null;if(!this.stopped&&(!this.active||migration&&!welcomed))this.schedule();});
  }
}
function typeSafe(raw){try{return JSON.parse(raw).metadata?.message_type;}catch{return '';}}
