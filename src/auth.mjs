import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { root, redirect, scopes } from './config.mjs';
const dir=join(root,'.private');
export class TwitchAuthError extends Error {
  constructor(message,kind='temporary'){super(message);this.kind=kind;}
}
export class Auth {
  constructor(fetcher=fetch,{directory=dir}={}) { this.dir=directory; this.fetch=fetcher; this.tokens=null; this.account=null; this.refreshing=null; this.credentials=null;this.generation=0;this.writes=Promise.resolve(); }
  invalidate(){this.generation++;this.account=null;this.grantedScopes=[];this.refreshing=null;}
  current(generation){if(generation!==this.generation)throw new TwitchAuthError('Authorization operation superseded','cancelled');}
  async init() {
    await mkdir(this.dir,{recursive:true,mode:0o700});
    try { this.credentials=JSON.parse(await readFile(join(this.dir,'credentials.json'),'utf8')); } catch(e) { if(e.code!=='ENOENT') throw Error('Private credential file unreadable'); }
    try { this.tokens=JSON.parse(await readFile(join(this.dir,'tokens.json'),'utf8')); } catch(e) { if(e.code!=='ENOENT') throw Error('Private token file unreadable'); }
  }
  get clientId() { return process.env.TWITCH_CLIENT_ID || this.credentials?.clientId || ''; }
  get secret() { return process.env.TWITCH_CLIENT_SECRET || this.credentials?.clientSecret || ''; }
  get configured() { return Boolean(this.clientId && this.secret); }
  save(name,value) { const p=join(this.dir,name+'.json');const job=this.writes.catch(()=>{}).then(async()=>{await writeFile(p+'.tmp',JSON.stringify(value),{mode:0o600});await rename(p+'.tmp',p);});this.writes=job;return job; }
  async configure(clientId,clientSecret) {
    if(this.tokens) throw Error('Disconnect Twitch before changing credentials');
    if(!/^[a-zA-Z0-9]{10,100}$/.test(clientId)||!/^[a-zA-Z0-9]{10,200}$/.test(clientSecret)) throw Error('Invalid credentials format');
    this.credentials={clientId,clientSecret}; await this.save('credentials',this.credentials);
  }
  async exchange(params) {
    const generation=this.generation;
    const r=await this.fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:this.clientId,client_secret:this.secret,...params}),signal:AbortSignal.timeout(15000)});
    if(!r.ok){
      const details=await r.json().catch(()=>({}));
      const invalid=params.grant_type==='refresh_token'&&(r.status===401||(r.status===400&&/^invalid refresh token$/i.test(details.message||'')));
      throw new TwitchAuthError(`Twitch token exchange failed (${r.status})`,invalid?'authorization':'temporary');
    }
    const t=await r.json();
    if(typeof t.access_token!=='string'||typeof t.refresh_token!=='string') throw Error('Invalid Twitch token response');
    this.current(generation);this.tokens=t; await this.save('tokens',t);this.current(generation);
  }
  async authorize(code) { await this.exchange({grant_type:'authorization_code',code,redirect_uri:redirect}); await this.validate(); }
  async refresh() {
    if(!this.tokens?.refresh_token) throw new TwitchAuthError('Connect Twitch first','authorization');
    if(!this.refreshing){const generation=this.generation;this.refreshing=this.exchange({grant_type:'refresh_token',refresh_token:this.tokens.refresh_token}).finally(()=>{if(generation===this.generation)this.refreshing=null;});}
    return this.refreshing;
  }
  async validate(retry=true) {
    if(!this.tokens) return null;
    const generation=this.generation;
    const r=await this.fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${this.tokens.access_token}`},signal:AbortSignal.timeout(15000)});
    this.current(generation);
    if(r.status===401&&retry) { await this.refresh();this.current(generation);return this.validate(false); }
    if(!r.ok) throw new TwitchAuthError(`Twitch validation failed (${r.status})`,r.status===401?'authorization':'temporary');
    const a=await r.json();
    this.current(generation);
    if(a.client_id!==this.clientId||!/^\d+$/.test(a.user_id)||!scopes.every(s=>a.scopes?.includes(s))) throw new TwitchAuthError('Wrong account grant or missing chat scopes; reconnect','authorization');
    this.account={id:a.user_id,login:a.login};this.grantedScopes=a.scopes;return this.account;
  }
  async api(path,body,retry=true) {
    if(!this.tokens) throw Error('Connect Twitch first');
    const generation=this.generation;
    const r=await this.fetch(`https://api.twitch.tv/helix/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${this.tokens.access_token}`,'Client-Id':this.clientId,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    this.current(generation);
    if(r.status===401&&retry) { await this.refresh();this.current(generation);return this.api(path,body,false); }
    if(!r.ok) throw Error(`Twitch API failed (${r.status})`);
    return r.json();
  }
  async reply(message) {
    if(!this.account) throw Error('Connect Twitch first');
    // Twitch rejects for_source_only with User Access Tokens. Suppress replies
    // during Shared Chat instead of risking delivery into other channels.
    const shared=await this.api(`shared_chat/session?broadcaster_id=${this.account.id}`);
    if(!Array.isArray(shared.data)||shared.data.length)throw Error('Chat reply suppressed: Shared Chat is active or could not be verified');
    const result=await this.api('chat/messages',{broadcaster_id:this.account.id,sender_id:this.account.id,message});
    if(!result.data?.[0]?.is_sent) throw Error('Twitch did not send the reply (possibly held or rate limited)');
    return result.data[0].message_id;
  }
  async disconnect() { this.invalidate();this.tokens=null;const job=this.writes.catch(()=>{}).then(()=>rm(join(this.dir,'tokens.json'),{force:true}));this.writes=job;await job; }
}
