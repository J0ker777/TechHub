const ACCESS_API="https://techhub-quiz-api.bolotin-denis.workers.dev",ACCESS_ARTICLE_ORIGIN="https://articles.jokerhub.com.ua",ACCESS_ORIGINS=["https://articles.jokerhub.com.ua","https://techhub-quiz-api.bolotin-denis.workers.dev"];

(()=>{
 const id=new URL(location.href).searchParams.get('article'),embedded=parent!==window,validId=/^\d{3}$/.test(id||'');
 let peer=null,active=null,generation=0;
 const stored=()=>{try{return JSON.parse(localStorage.getItem('techhub-auth-v1')||'null');}catch{return null;}};
 const send=(type,extra={})=>{if(peer&&active)peer.source.postMessage({type,state:active.state,sequence:active.sequence,articleId:id,...extra},peer.origin);};
 const login=new URL('quizzes.html',location.href);login.searchParams.set('return','article-access.html?article='+id);
 async function read(message){
  active=message;const run=++generation,auth=stored(),token=auth?.sessionToken;
  if(!token){send('jokerhub-access-locked');return false;}
  const current=()=>run===generation&&stored()?.sessionToken===token;
  try{
   const headers={Authorization:'Bearer '+token},meResponse=await fetch(ACCESS_API+'/auth/me',{headers,cache:'no-store'});
   if(!current())return false;if(!meResponse.ok){send('jokerhub-access-locked');return false;}const me=await meResponse.json();
   if(!current())return false;
   if(message.action==='check'){send('jokerhub-access-checked',{expiresAt:me.expiresAt});return true;}
   const response=await fetch(ACCESS_API+'/articles/'+id+'/content',{headers,cache:'no-store'});
   if(!current())return false;if(!response.ok){send(response.status===401?'jokerhub-access-locked':'jokerhub-access-error');return false;}
   const data=await response.json();if(!current())return false;
   send('jokerhub-access-content',{article:data.article,user:{displayName:me.user.displayName},expiresAt:me.expiresAt});return true;
  }catch{if(current())send('jokerhub-access-error');return false;}
 }
 if(!validId){document.querySelector('#access-status').textContent='Невідома стаття.';return;}
 if(embedded){
  window.addEventListener('message',event=>{
   const data=event.data;if(event.source!==parent||!ACCESS_ORIGINS.includes(event.origin)||data?.type!=='jokerhub-access-request'||data.articleId!==id||!/^[a-f0-9-]{36}$/.test(data.state||'')||!Number.isSafeInteger(data.sequence)||!['read','check','logout'].includes(data.action))return;
   peer={source:event.source,origin:event.origin};active=data;
   if(data.action==='logout'){const token=stored()?.sessionToken;generation++;localStorage.removeItem('techhub-auth-v1');send('jokerhub-access-locked');if(token)fetch(ACCESS_API+'/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}}).catch(()=>{});return;}
   read(data);
  });
  const changed=()=>{if(active)read({...active,action:'read'});};window.addEventListener('storage',event=>{if(event.key==='techhub-auth-v1'||event.key===null)changed();});window.addEventListener('techhub-auth-changed',changed);
 }else{
  read({state:crypto.randomUUID(),sequence:0,action:'check'}).then(ok=>{if(ok)location.replace(ACCESS_ARTICLE_ORIGIN+'/articles/'+id);else{const button=document.querySelector('#access-login');button.href=login.href;button.hidden=false;document.querySelector('#access-status').textContent='Увійдіть, щоб прочитати статтю.';}});
 }
})();