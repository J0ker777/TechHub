const LIKE_API="https://techhub-quiz-api.bolotin-denis.workers.dev",ARTICLE_ORIGINS=["https://articles.jokerhub.com.ua","https://techhub-quiz-api.bolotin-denis.workers.dev"];

(()=>{
 const params=new URL(location.href).searchParams,id=params.get('article'),state=params.get('state'),status=document.querySelector('#article-like-status'),login=document.querySelector('#article-like-login');
 let running=false,articleOrigin=null;
 const send=data=>{for(const origin of articleOrigin?[articleOrigin]:ARTICLE_ORIGINS)window.opener?.postMessage({...data,state,articleId:id},origin);};
 if(!/^\d{3}$/.test(id||'')||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(state||'')||!window.opener){status.textContent='Відкрийте цю дію кнопкою лайка у статті.';return;}
 window.addEventListener('message',async event=>{
  if(running||!ARTICLE_ORIGINS.includes(event.origin)||event.source!==window.opener||event.data?.type!=='jokerhub-like-start'||event.data.state!==state||event.data.articleId!==id)return;
  articleOrigin=event.origin;running=true;status.textContent='Перевіряємо вхід…';
  try{
   const cached=sessionStorage.getItem('jokerhub-like:'+state);
   if(cached){send({type:'jokerhub-like-result',...JSON.parse(cached)});window.close();return;}
   let auth;try{auth=JSON.parse(localStorage.getItem('techhub-auth-v1')||'null');}catch{}
   async function api(path,method='GET'){
    const response=await fetch(LIKE_API+path,{method,headers:auth?.sessionToken?{Authorization:'Bearer '+auth.sessionToken}:{}});
    if(response.status===401){const error=Error('login');error.login=true;throw error;}
    if(!response.ok)throw Error('request');return response.json();
   }
   if(!auth?.sessionToken){const error=Error('login');error.login=true;throw error;}
   await api('/auth/me');
   const previous=await api('/articles/'+id+'/likes'),result=await api('/articles/'+id+'/likes',previous.liked?'DELETE':'POST');
   const value={liked:result.liked,likeCount:result.likeCount};sessionStorage.setItem('jokerhub-like:'+state,JSON.stringify(value));
   send({type:'jokerhub-like-result',...value});status.textContent='Оцінку збережено.';window.close();
  }catch(error){
   if(error.login){
    login.href='quizzes.html?return='+encodeURIComponent('article-like.html?article='+id+'&state='+state);login.hidden=false;status.textContent='Увійдіть через Google, щоб оцінити статтю.';
   }else{status.textContent='Не вдалося зберегти оцінку. Закрийте вікно й спробуйте ще раз.';send({type:'jokerhub-like-error'});}
  }
 });
 send({type:'jokerhub-like-ready'});
})();
