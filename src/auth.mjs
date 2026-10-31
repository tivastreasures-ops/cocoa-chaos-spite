import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { root, redirect, scopes } from './config.mjs';
const dir=join(root,'.private');
export class Auth {
  constructor(fetcher=fetch) { this.fetch=fetcher; this.tokens=null; this.account=null; this.refreshing=null; this.credentials=null; }
  async init() {
    await mkdir(dir,{recursive:true,mode:0o700});
    try { this.credentials=JSON.parse(await readFile(join(dir,'credentials.json'),'utf8')); } catch(e) { if(e.code!=='ENOENT') throw Error('Private credential file unreadable'); }
    try { this.tokens=JSON.parse(await readFile(join(dir,'tokens.json'),'utf8')); } catch(e) { if(e.code!=='ENOENT') throw Error('Private token file unreadable'); }
  }
  get clientId() { return process.env.TWITCH_CLIENT_ID || this.credentials?.clientId || ''; }
  get secret() { return process.env.TWITCH_CLIENT_SECRET || this.credentials?.clientSecret || ''; }
  get configured() { return Boolean(this.clientId && this.secret); }
  async save(name,value) { const p=join(dir,name+'.json'); await writeFile(p+'.tmp',JSON.stringify(value),{mode:0o600}); await rename(p+'.tmp',p); }
  async configure(clientId,clientSecret) {
    if(this.tokens) throw Error('Disconnect Twitch before changing credentials');
    if(!/^[a-zA-Z0-9]{10,100}$/.test(clientId)||!/^[a-zA-Z0-9]{10,200}$/.test(clientSecret)) throw Error('Invalid credentials format');
    this.credentials={clientId,clientSecret}; await this.save('credentials',this.credentials);
  }
  async exchange(params) {
    const r=await this.fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:this.clientId,client_secret:this.secret,...params}),signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw Error(`Twitch token exchange failed (${r.status}); reconnect authorization`);
    const t=await r.json();
    if(typeof t.access_token!=='string'||typeof t.refresh_token!=='string') throw Error('Invalid Twitch token response');
    this.tokens=t; await this.save('tokens',t);
  }
  async authorize(code) { await this.exchange({grant_type:'authorization_code',code,redirect_uri:redirect}); await this.validate(); }
  async refresh() {
    if(!this.tokens?.refresh_token) throw Error('Connect Twitch first');
    if(!this.refreshing) this.refreshing=this.exchange({grant_type:'refresh_token',refresh_token:this.tokens.refresh_token}).finally(()=>{this.refreshing=null;});
    return this.refreshing;
  }
  async validate(retry=true) {
    if(!this.tokens) return null;
    const r=await this.fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${this.tokens.access_token}`},signal:AbortSignal.timeout(15000)});
    if(r.status===401&&retry) { await this.refresh(); return this.validate(false); }
    if(!r.ok) throw Error(`Twitch validation failed (${r.status})`);
    const a=await r.json();
    if(a.client_id!==this.clientId||!/^\d+$/.test(a.user_id)||!scopes.every(s=>a.scopes?.includes(s))) throw Error('Wrong account grant or missing chat scopes; reconnect');
    this.account={id:a.user_id,login:a.login}; return this.account;
  }
  async api(path,body,retry=true) {
    if(!this.tokens) throw Error('Connect Twitch first');
    const r=await this.fetch(`https://api.twitch.tv/helix/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${this.tokens.access_token}`,'Client-Id':this.clientId,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    if(r.status===401&&retry) { await this.refresh(); return this.api(path,body,false); }
    if(!r.ok) throw Error(`Twitch API failed (${r.status})`);
    return r.json();
  }
  async reply(message) {
    if(!this.account) throw Error('Connect Twitch first');
    const result=await this.api('chat/messages',{broadcaster_id:this.account.id,sender_id:this.account.id,message,for_source_only:true});
    if(!result.data?.[0]?.is_sent) throw Error('Twitch did not send the reply (possibly held or rate limited)');
    return result.data[0].message_id;
  }
  async disconnect() { this.tokens=null; this.account=null; await rm(join(dir,'tokens.json'),{force:true}); }
}
