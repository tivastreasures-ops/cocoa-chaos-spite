import { randomUUID } from 'node:crypto';
export function clean(value,max=500) { return String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max); }
export function event(type,source,payload) { return {schemaVersion:1,type,timestamp:new Date().toISOString(),source,eventId:randomUUID(),payload}; }
export class Transport {
  constructor(){this.overlays=new Set();}
  add(res){this.overlays.add(res);res.on('close',()=>this.overlays.delete(res));}
  emit(e){for(const res of this.overlays){if(res.writableLength>65536){res.destroy();this.overlays.delete(res);}else res.write(`data: ${JSON.stringify(e)}\n\n`);}}
}
export function parseChat(e,channel) {
  if(!e||e.broadcaster_user_id!==channel||!/^\d+$/.test(e.chatter_user_id)||typeof e.message_id!=='string'||typeof e.message?.text!=='string'||!Array.isArray(e.badges)) return null;
  // Shared-chat messages from another originating channel cannot control this stream.
  if(e.source_broadcaster_user_id&&e.source_broadcaster_user_id!==channel) return null;
  return {id:clean(e.message_id,100),userId:e.chatter_user_id,name:clean(e.chatter_user_name||e.chatter_user_login,50),text:clean(e.message.text),privileged:e.chatter_user_id===channel||e.badges.some(b=>b.set_id==='moderator'),timestamp:Date.now()};
}
