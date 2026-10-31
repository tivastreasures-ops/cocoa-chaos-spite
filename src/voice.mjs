// Server-side contract for the future Sebastian adapter. No ElevenLabs agent is created or changed.
export function createVoiceBridge({assistant}) {
  let last=0;
  return async function invoke(name,args){
    if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Invalid tool arguments');
    if(name==='get_chat_summary')return assistant.summary();
    if(Date.now()-last<6000)throw Error('Voice tool cooldown');last=Date.now();
    if(name==='trigger_overlay_effect'){
      if(!['hello','cocoa','chaos'].includes(args.effect))throw Error('Unknown effect');
      // An authenticated suggestion still needs a Director click; voice cannot self-approve.
      return {approvalRequired:true,request:{kind:'effect',effect:args.effect}};
    }
    if(name==='send_chat_reply'){
      if(typeof args.message!=='string'||!args.message.trim()||args.message.length>450)throw Error('Invalid reply');
      return {approvalRequired:true,request:{kind:'reply',message:args.message}};
    }
    throw Error('Unknown tool');
  };
}
