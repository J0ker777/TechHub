const ACCESS_API="https://techhub-quiz-api.bolotin-denis.workers.dev",ACCESS_ARTICLE_ORIGIN="https://articles.jokerhub.com.ua",ACCESS_ORIGINS=["https://articles.jokerhub.com.ua","https://techhub-quiz-api.bolotin-denis.workers.dev"];

(()=>{
 const id=new URL(location.href).searchParams.get('article'),embedded=parent!==window,validId=/^\d{3}$/.test(id||'');
 let peer=null,active=null,generation=0,reader=null,profile=null,profileExpiry=null,contentRequested=false;
 const stored=()=>{try{return JSON.parse(localStorage.getItem('techhub-auth-v1')||'null');}catch{return null;}};
 const send=(type,extra={})=>{if(peer&&active)peer.source.postMessage({type,state:active.state,sequence:active.sequence,articleId:id,...extra},peer.origin);};
 const theme=()=>{try{return localStorage.getItem('article-theme')==='light'?'light':'dark';}catch{return document.querySelector('#theme-toggle')?.checked?'light':'dark';}};
 const state=()=>send('jokerhub-site-state',{theme:theme(),user:profile,expiresAt:profileExpiry});
 const login=new URL('quizzes.html',location.href);login.searchParams.set('return','article-access.html?article='+id);
 async function read(message){
  active=message;const run=++generation,auth=stored(),token=auth?.sessionToken;
  if(!token){profile=null;profileExpiry=null;state();if(embedded&&message.action==='state'){try{localStorage.getItem('article-theme');}catch{send('jokerhub-site-first-party');return false;}}send('jokerhub-access-locked');return false;}
  const current=()=>run===generation&&stored()?.sessionToken===token;
  try{
   const headers={Authorization:'Bearer '+token},meResponse=await fetch(ACCESS_API+'/auth/me',{headers,cache:'no-store'});
   if(!current())return false;if(!meResponse.ok){profile=null;profileExpiry=null;state();send('jokerhub-access-locked');return false;}const me=await meResponse.json();
   if(!current())return false;
   profile={displayName:me.user.displayName,avatarUrl:me.user.avatarUrl||null};profileExpiry=me.expiresAt;state();
   if(message.action==='check'||message.action==='state'){send('jokerhub-access-checked',{expiresAt:me.expiresAt});return true;}
   const response=await fetch(ACCESS_API+'/articles/'+id+'/content',{headers,cache:'no-store'});
   if(!current())return false;if(!response.ok){send(response.status===401?'jokerhub-access-locked':'jokerhub-access-error');return false;}
   const data=await response.json();if(!current())return false;
   if(!embedded)document.title=data.article.title+' · JokerHub';
   send('jokerhub-access-content',{article:data.article,expiresAt:me.expiresAt});return true;
  }catch{if(current())send('jokerhub-access-error');return false;}
 }
 if(!validId){document.querySelector('#access-status').textContent='Невідома стаття.';return;}
 {
  window.addEventListener('message',event=>{
   const data=event.data,source=embedded?parent:reader?.contentWindow;
   if(!source||event.source!==source||!ACCESS_ORIGINS.includes(event.origin)||data?.type!=='jokerhub-access-request'||data.articleId!==id||!/^[a-f0-9-]{36}$/.test(data.state||'')||!Number.isSafeInteger(data.sequence)||!['read','check','logout','state','theme'].includes(data.action))return;
   if(data.action==='theme'&&!['light','dark'].includes(data.theme))return;
   peer={source:event.source,origin:event.origin};active=data;
   if(data.action==='read')contentRequested=true;
   if(data.action==='theme'){try{localStorage.setItem('article-theme',data.theme);}catch{}window.dispatchEvent(new CustomEvent('techhub-apply-theme',{detail:{theme:data.theme}}));state();return;}
   if(data.action==='logout'){const token=stored()?.sessionToken;generation++;localStorage.removeItem('techhub-auth-v1');profile=null;profileExpiry=null;state();send('jokerhub-access-locked');if(token)fetch(ACCESS_API+'/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}}).catch(()=>{});return;}
   read(data);
  });
  const changed=()=>{if(active)read({...active,action:contentRequested?'read':'state'});};window.addEventListener('storage',event=>{if(event.key==='techhub-auth-v1'||event.key===null)changed();if(event.key==='article-theme'||event.key===null)state();});window.addEventListener('techhub-auth-changed',changed);window.addEventListener('techhub-theme-changed',state);
 }
 if(!embedded){
  read({state:crypto.randomUUID(),sequence:0,action:'check'}).then(async ok=>{
   if(!ok){try{const response=await fetch(ACCESS_API+'/articles/'+id+'/content',{cache:'no-store'});ok=response.ok;}catch{}}
   if(ok){
    // Keep the session in a top-level first-party page. Mobile browsers may
    // deny the hidden bridge access to the login page's storage.
    reader=document.createElement('iframe');reader.src=ACCESS_ARTICLE_ORIGIN+'/articles/'+id+location.hash;reader.title='Стаття · JokerHub';
    reader.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;background:var(--bg,#0b1118)';
    document.body.style.margin='0';document.body.style.overflow='hidden';document.body.replaceChildren(reader);
   }else{const button=document.querySelector('#access-login');button.href=login.href;button.hidden=false;document.querySelector('#access-status').textContent='Увійдіть, щоб прочитати статтю.';}
  });
 }
})();