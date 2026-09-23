
const root=document.documentElement, themeToggle=document.querySelector('#theme-toggle');
try{themeToggle.checked=localStorage.getItem('article-theme')==='light'}catch{}
themeToggle.addEventListener('change',()=>{try{localStorage.setItem('article-theme',themeToggle.checked?'light':'dark')}catch{}});
function articleHeart(host,{endpoint,id,href='',indicator=false,initial=null}){
 const key='techhub-auth-v1',prompt='Увійдіть через Google, щоб оцінити статтю';let busy=false,version=0;
 const button=document.createElement('button'),note=document.createElement('span'),login=document.createElement('a');
 button.type='button';button.className='article-heart';button.setAttribute('aria-label',indicator?'Оцінки статті':'Подобається стаття');
 note.setAttribute('role','status');login.href='quizzes.html';login.textContent='Увійти через Google';login.hidden=true;
 host.classList.add('article-reactions');host.append(button,note,login);
 function token(){try{return JSON.parse(localStorage.getItem(key)||'null')?.sessionToken||'';}catch{return '';}}
 function paint(data){button.textContent=(data?.liked?'♥':'♡')+' '+(data?.likeCount??'—');button.setAttribute('aria-pressed',String(!!data?.liked));}
 function askLogin(){note.textContent=prompt;login.hidden=false;}
 async function refresh(){const current=++version,session=token();try{const response=await fetch(endpoint+'/articles/'+id+'/likes',{headers:session?{Authorization:'Bearer '+session}:{}});if(!response.ok)throw Error();const data=await response.json();if(current===version)paint(data);}catch{if(current===version)note.textContent='Не вдалося завантажити оцінки.';}}
 paint(initial);
 button.addEventListener('click',async()=>{
  if(busy)return;const session=token();if(!session){askLogin();return;}
  busy=true;button.disabled=true;note.textContent='';login.hidden=true;++version;
  try{
   const me=await fetch(endpoint+'/auth/me',{headers:{Authorization:'Bearer '+session}});
   if(me.status===401){askLogin();return;}if(!me.ok)throw Error();
   if(indicator){location.href=href;return;}
   const response=await fetch(endpoint+'/articles/'+id+'/likes',{method:'POST',headers:{Authorization:'Bearer '+session}});
   if(response.status===401){askLogin();return;}if(!response.ok)throw Error();paint(await response.json());
  }catch{note.textContent='Не вдалося зберегти оцінку. Спробуйте ще раз.';}finally{busy=false;button.disabled=false;}
 });
 if(!indicator){refresh();window.addEventListener('focus',refresh);window.addEventListener('techhub-auth-changed',refresh);}
}
for(const host of document.querySelectorAll('[data-article-reaction]'))if(host.dataset.reactionApi)articleHeart(host,{endpoint:host.dataset.reactionApi,id:host.dataset.articleReaction});


const AUTH={endpoint:"https://techhub-quiz-api.bolotin-denis.workers.dev",clientId:"948988221025-4616heh630r63p56v4t86j87vslp5p36.apps.googleusercontent.com",key:'techhub-auth-v1'};
const gate=document.querySelector('#auth-gate'),content=document.querySelector('#quiz-content'),googleBox=document.querySelector('#google-auth'),nameForm=document.querySelector('#rating-name-form'),nameInput=document.querySelector('#rating-name'),errorBox=document.querySelector('#auth-error'),authTitle=document.querySelector('#auth-title');let auth=null;
function authSave(){localStorage.setItem(AUTH.key,JSON.stringify(auth));window.dispatchEvent(new CustomEvent('techhub-auth-changed',{detail:auth}));}
function authError(text){errorBox.textContent=text;}
function showName(){googleBox.hidden=true;nameForm.hidden=false;authTitle.textContent='Оберіть ім’я для рейтингу';nameInput.value=auth.leaderboardName||auth.user.displayName||'';nameInput.focus();}
function unlock(){gate.hidden=true;content.classList.remove('auth-locked');content.removeAttribute('aria-hidden');}
async function googleCredential(value){authError('Перевіряємо обліковий запис…');try{const response=await fetch(AUTH.endpoint+'/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:value.credential})});if(!response.ok)throw Error();const previous=auth?.leaderboardName;auth=await response.json();if(previous)auth.leaderboardName=previous;authSave();authError('');showName();}catch{authError('Не вдалося увійти через Google. Спробуйте ще раз.');}}
function loadGoogle(){return new Promise((resolve,reject)=>{if(globalThis.google?.accounts?.id){resolve();return;}const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});}
async function showGoogle(){googleBox.hidden=false;nameForm.hidden=true;authTitle.textContent='Увійдіть через Google';try{await loadGoogle();google.accounts.id.initialize({client_id:AUTH.clientId,callback:googleCredential,use_fedcm_for_button:false});const host=document.querySelector('#google-button'),width=Math.min(400,Math.max(240,Math.floor(host.getBoundingClientRect().width||400)));google.accounts.id.renderButton(host,{type:'standard',theme:'outline_dark',size:'large',text:'signin_with',shape:'pill',width,logo_alignment:'left',locale:'uk'});}catch{authError('Не вдалося завантажити Google Sign-In. Перевірте підключення.');}}
async function authInit(){try{const raw=localStorage.getItem(AUTH.key);if(raw)auth=JSON.parse(raw);}catch{}if(!auth?.sessionToken){showGoogle();return;}try{const response=await fetch(AUTH.endpoint+'/auth/me',{headers:{Authorization:'Bearer '+auth.sessionToken}});if(!response.ok)throw Error();const current=await response.json();auth={...auth,expiresAt:current.expiresAt,user:current.user};authSave();if(auth.leaderboardName)unlock();else showName();}catch{auth=null;localStorage.removeItem(AUTH.key);showGoogle();}}
nameForm.addEventListener('submit',event=>{event.preventDefault();const value=nameInput.value.replace(/\s+/g,' ').trim();if(!value){nameInput.reportValidity();return;}auth.leaderboardName=value.slice(0,50);authSave();unlock();});authInit();
