import {randomBytes,createHash,createHmac,timingSafeEqual} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest();
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&timingSafeEqual(digest(a),digest(b));
export class HostedAccess{
  constructor({password,overlayToken,origin,now=Date.now}){this.passwordHash=digest(password);Object.assign(this,{overlayToken,origin,now});this.sessions=new Map();this.windows=new Map();}
  throttle(key,limit=5){
    const now=this.now();let w=this.windows.get(key);if(!w||now-w.start>=60000){w={start:now,count:0};this.windows.set(key,w);}
    if(++w.count>limit)throw Error('Too many attempts; wait one minute');
  }
  login(password){
    this.throttle('login');
    if(typeof password!=='string'||password.length>300||!timingSafeEqual(this.passwordHash,digest(password)))throw Error('Sign-in failed');
    this.prune();if(this.sessions.size>=8)throw Error('Session limit reached; sign out on another device or wait');
    const token=randomBytes(32).toString('hex');this.sessions.set(token,{expires:this.now()+8*3600000});return token;
  }
  prune(){for(const [token,s]of this.sessions)if(s.expires<=this.now())this.sessions.delete(token);}
  valid(token){this.prune();return typeof token==='string'&&this.sessions.has(token);}
  logout(token){this.sessions.delete(token);}
  cookie(name,value,maxAge){return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;}
  overlaySession(token){
    this.throttle('overlay',20);if(!equal(token,this.overlayToken))throw Error('Overlay link invalid');
    const payload=Buffer.from(JSON.stringify({expires:this.now()+24*3600000,nonce:randomBytes(12).toString('hex')})).toString('base64url');
    return payload+'.'+this.sign(payload);
  }
  sign(payload){return createHmac('sha256',this.overlayToken).update(this.origin+'\n'+payload).digest('base64url');}
  overlayValid(value){
    if(typeof value!=='string'||value.length>400)return false;
    const [payload,sig,extra]=value.split('.');if(extra||!payload||!sig||!equal(sig,this.sign(payload)))return false;
    try{const p=JSON.parse(Buffer.from(payload,'base64url'));return Number.isSafeInteger(p.expires)&&p.expires>this.now();}catch{return false;}
  }
  overlayLink(){return this.origin+'/overlay#access='+encodeURIComponent(this.overlayToken);}
}
