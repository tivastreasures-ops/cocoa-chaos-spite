document.getElementById('director-login').onsubmit=async e=>{
  e.preventDefault();const field=document.getElementById('director-password'),message=document.getElementById('login-message');
  try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:field.value})});field.value='';if(!r.ok)throw Error('Sign-in failed or attempts limited. Wait a minute before retrying.');location.assign('/');}
  catch(error){field.value='';message.textContent=error.message;}
};
