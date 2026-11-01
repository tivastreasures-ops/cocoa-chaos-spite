import {isAbsolute,join,resolve,relative,sep} from 'node:path';
export function hostingConfig(env,root){
  const hosted=env.CC_HOSTED==='1',previewOnly=env.CC_PREVIEW_ONLY==='1';
  const port=Number(env.PORT||(previewOnly?3001:3000));
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT must be 1024–65535');
  let origin=`http://localhost:${port}`;
  if(hosted){
    let u;try{u=new URL(env.PUBLIC_ORIGIN);}catch{throw Error('Hosted mode requires PUBLIC_ORIGIN');}
    if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.hostname==='localhost'||u.hostname==='127.0.0.1')throw Error('PUBLIC_ORIGIN must be an HTTPS site origin without paths or credentials');
    origin=u.origin;
    if((env.CC_DIRECTOR_PASSWORD||'').length<20||env.CC_DIRECTOR_PASSWORD.length>300||(env.CC_OVERLAY_TOKEN||'').length<32||env.CC_OVERLAY_TOKEN.length>256)throw Error('Hosted mode requires a Director password (20–300 characters) and separate overlay token (32–256 characters)');
    if(env.CC_DIRECTOR_PASSWORD===env.CC_OVERLAY_TOKEN)throw Error('Director and overlay credentials must differ');
    if(!env.CC_DATA_DIR||!isAbsolute(env.CC_DATA_DIR))throw Error('Hosted mode requires an absolute persistent CC_DATA_DIR outside the application');
  }
  const dataDir=resolve(env.CC_DATA_DIR||join(root,'.private'));
  const within=relative(resolve(root),dataDir);
  if(hosted&&(within===''||(!isAbsolute(within)&&within!=='..'&&!within.startsWith('..'+sep))))throw Error('CC_DATA_DIR must be outside the application directory');
  const redirect=env.TWITCH_REDIRECT_URI||origin+'/auth/twitch/callback';
  if(redirect!==origin+'/auth/twitch/callback')throw Error('Twitch redirect must exactly match the configured site origin and callback path');
  return {hosted,previewOnly,port,origin,redirect,dataDir,chatEnabled:!previewOnly&&(!hosted||env.CC_TWITCH_INGEST==='1'),bindHost:hosted?'0.0.0.0':'127.0.0.1',expectedHost:new URL(origin).host};
}
