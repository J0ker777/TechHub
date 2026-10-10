
const root=document.documentElement, themeToggle=document.querySelector('#theme-toggle');
try{themeToggle.checked=localStorage.getItem('article-theme')==='light'}catch{}
themeToggle.addEventListener('change',()=>{try{localStorage.setItem('article-theme',themeToggle.checked?'light':'dark')}catch{}});

const ARTICLE_LEVELS={easy:'Проста',medium:'Середня',hard:'Складна'};
const ARTICLE_PATHS={
 difficulty:'<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 12 4-4"/><circle cx="12" cy="12" r="1.5"/><path d="M4 12h1m14 0h1M7 6l1 1m4-4v1"/>',
 time:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 views:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 share:'<path d="m14 3 7 7-7 7v-5c-6 0-9 3-11 8 0-8 3-12 11-12Z"/>'
};
function articleIcon(kind){return '<svg class="article-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+ARTICLE_PATHS[kind]+'</svg>';}
function articleCount(value,compact=false){if(value==null)return '—';const count=Number(value);if(compact&&count>=1000)return new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(count);return String(value);}
function articleMetric(kind,value,label){const item=document.createElement('span');item.className='article-stat';item.title=label;item.innerHTML=articleIcon(kind);const text=document.createElement('span');text.textContent=value;item.append(text);return item;}
function articleShare(host,{title,href,compact=false}) {
 const button=document.createElement('button'),note=document.createElement('span');
 button.type='button';button.className='article-action';button.innerHTML=articleIcon('share')+(compact?'':'<span>Поділитися</span>');button.title='Поділитися';button.setAttribute('aria-label','Поділитися статтею');
 note.className='article-feedback';note.setAttribute('role','status');host.append(button,note);
 button.addEventListener('click',async()=>{
  const url=new URL(href||location.href,location.href).href;button.disabled=true;note.textContent='';
  try{
   if(typeof navigator.share==='function'){try{await navigator.share({title,url});return;}catch(error){if(error.name==='AbortError')return;}}
   if(navigator.clipboard&&globalThis.isSecureContext){try{await navigator.clipboard.writeText(url);note.textContent='Посилання скопійовано';return;}catch{}}
   const field=document.createElement('textarea');field.value=url;field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();let copied=false;
   try{copied=document.execCommand('copy');}catch{}finally{field.remove();button.focus();}
   note.textContent=copied?'Посилання скопійовано':'Скопіюйте посилання: '+url;
  }finally{button.disabled=false;}
 });
}
function articleTools(host,{article,endpoint,reading=false}){
 host.classList.add('article-tools');
 const level=articleMetric('difficulty',ARTICLE_LEVELS[article.difficulty]||'Не визначено','Складність статті');
 level.dataset.level=article.difficulty||'';level.hidden=!ARTICLE_LEVELS[article.difficulty];
 const minutes=articleMetric('time',article.readingMinutes?'≈ '+article.readingMinutes+' хв':'—','Приблизний час читання');
 const views=articleMetric('views',articleCount(article.viewCount,!reading),'Перегляди');
 views.setAttribute('aria-label','Перегляди: '+(article.viewCount??'не завантажено'));
 host.append(level,minutes,views);
 const heart=document.createElement('div');host.append(heart);
 articleHeart(heart,{endpoint,id:article.articleId,initial:article,follow:reading,compact:!reading});
 articleShare(host,{title:article.title,href:article.href,compact:!reading});
 function paint(data){
  level.hidden=!ARTICLE_LEVELS[data.difficulty];level.dataset.level=data.difficulty||'';level.lastElementChild.textContent=ARTICLE_LEVELS[data.difficulty]||'Не визначено';
  if(data.readingMinutes)minutes.lastElementChild.textContent='≈ '+data.readingMinutes+' хв';
  data.viewCount=Math.max(Number(views.lastElementChild.textContent)||0,data.viewCount);views.lastElementChild.textContent=String(data.viewCount);views.setAttribute('aria-label','Перегляди: '+data.viewCount);
 }
 if(reading&&endpoint){
  fetch(endpoint+'/articles/'+article.articleId+'/stats').then(r=>{if(!r.ok)throw Error();return r.json();}).then(paint).catch(()=>{views.title='Перегляди тимчасово недоступні';});
  let sent=false;
  async function countView(){
   if(sent||document.visibilityState!=='visible')return;sent=true;
   let visitorId;try{visitorId=localStorage.getItem('techhub-visitor-v1');if(!visitorId){visitorId=crypto.randomUUID();localStorage.setItem('techhub-visitor-v1',visitorId);}}catch{visitorId=crypto.randomUUID();}
   try{const r=await fetch(endpoint+'/articles/'+article.articleId+'/views',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})});if(r.ok)paint(await r.json());}catch{}
   document.removeEventListener('visibilitychange',countView);
  }
  if(document.visibilityState==='visible')countView();else document.addEventListener('visibilitychange',countView);
 }
}

function articleHeart(host,{endpoint,id,href='',indicator=false,initial=null,follow=true,compact=false}){
 const key='techhub-auth-v1',prompt='Увійдіть через Google, щоб оцінити статтю';let busy=false,version=0,liked=false;
 const button=document.createElement('button'),note=document.createElement('span'),login=document.createElement('a');
 button.type='button';button.className='article-heart';button.setAttribute('aria-label',indicator?'Оцінки статті':'Подобається стаття');
 note.setAttribute('role','status');login.href='quizzes.html';login.textContent='Увійти через Google';login.hidden=true;
 host.classList.add('article-reactions');host.append(button,note,login);
 function token(){try{return JSON.parse(localStorage.getItem(key)||'null')?.sessionToken||'';}catch{return '';}}
 function paint(data){liked=!!data?.liked;const count=data?.likeCount??'—';button.setAttribute('aria-label',indicator?'Лайки статті: '+count:liked?'Зняти лайк: '+count:'Подобається стаття: '+count);button.innerHTML=articleIcon('heart');const text=document.createElement('span');text.textContent=articleCount(count,compact);button.append(text);button.title=liked?'Зняти лайк':'Подобається';button.setAttribute('aria-pressed',String(liked));}
 function askLogin(){note.textContent=prompt;login.hidden=false;}
 async function refresh(){const current=++version,session=token();try{const response=await fetch(endpoint+'/articles/'+id+'/likes',{headers:session?{Authorization:'Bearer '+session}:{}});if(!response.ok)throw Error();const data=await response.json();if(current===version)paint(data);}catch{if(current===version)note.textContent='Не вдалося завантажити оцінки.';}}
 paint(initial);if(!endpoint){button.disabled=true;button.title='Лайки доступні на сайті TechHub';}
 button.addEventListener('click',async()=>{
  if(busy)return;const session=token();if(!session){askLogin();return;}
  busy=true;button.disabled=true;note.textContent='';login.hidden=true;++version;
  try{
   const me=await fetch(endpoint+'/auth/me',{headers:{Authorization:'Bearer '+session}});
   if(me.status===401){askLogin();return;}if(!me.ok)throw Error();
   if(indicator){location.href=href;return;}
   const response=await fetch(endpoint+'/articles/'+id+'/likes',{method:liked?'DELETE':'POST',headers:{Authorization:'Bearer '+session}});
   if(response.status===401){askLogin();return;}if(!response.ok)throw Error();paint(await response.json());
  }catch{note.textContent='Не вдалося зберегти оцінку. Спробуйте ще раз.';}finally{busy=false;button.disabled=false;}
 });
 if(!indicator&&endpoint){if(initial?.likeCount==null)refresh();if(follow){window.addEventListener('focus',refresh);window.addEventListener('techhub-auth-changed',refresh);}}
}
for(const host of document.querySelectorAll('[data-article-tools]')){
 const article={articleId:host.dataset.articleTools,title:document.querySelector('h1')?.textContent||document.title,href:document.querySelector('link[rel="canonical"]')?.href||location.href,difficulty:host.dataset.difficulty,readingMinutes:Number(host.dataset.readingMinutes)||null,viewCount:null};
 articleTools(host,{article,endpoint:host.dataset.reactionApi,reading:true});
 const end=document.querySelector('[data-article-share-end]');if(end){end.classList.add('article-tools','article-tools-end');articleShare(end,{title:article.title,href:article.href});}
}
for(const host of document.querySelectorAll('[data-article-reaction]'))if(host.dataset.reactionApi)articleHeart(host,{endpoint:host.dataset.reactionApi,id:host.dataset.articleReaction});


(()=>{
 const API="https://techhub-quiz-api.bolotin-denis.workers.dev",KEY='techhub-auth-v1',el=id=>document.getElementById(id),panel=el('users-panel'),list=el('users-list'),dialog=el('users-confirm');
 let auth=null,authorized=false,busy=false,generation=0,page=1,total=0,pageSize=50,currentUserId=null,pending=null,query='',role='all';
 const errors={authentication_required:'Увійдіть через Google.',invalid_session:'Сесія завершилася. Увійдіть знову.',admin_required:'Ця сторінка доступна лише адміністратору.',self_role_change_forbidden:'Власну роль змінити не можна.',last_admin_required:'Потрібно залишити хоча б одного адміністратора.',role_conflict:'Роль уже змінив інший адміністратор. Оновіть список.',user_not_found:'Користувача вже немає у списку.',invalid_user_filter:'Перевірте пошук і вибрану роль.'};
 function message(text,error=false){el('users-status').textContent=text;el('users-status').dataset.error=String(error);}
 function lock(){for(const control of panel.querySelectorAll('button,input,select'))control.disabled=busy||!authorized;for(const button of list.querySelectorAll('[data-self]'))button.disabled=true;el('users-prev').disabled=busy||page<=1;el('users-next').disabled=busy||page*pageSize>=total;el('users-save').disabled=busy;el('users-cancel').disabled=busy;}
 async function api(path,options={}){const response=await fetch(API+path,{...options,headers:{Authorization:'Bearer '+auth.sessionToken,...(options.body?{'Content-Type':'application/json'}:{})}});const body=await response.json();if(!response.ok){const error=new Error(errors[body.error]||'Не вдалося виконати дію. Спробуйте ще раз.');error.status=response.status;throw error;}return body;}
 function reset(){generation++;authorized=false;busy=false;auth=null;currentUserId=null;pending=null;panel.hidden=true;list.replaceChildren();el('users-count').textContent='';el('users-login').hidden=true;if(dialog.open)dialog.close();}
 function fail(error){if(error.status===401||error.status===403){reset();el('users-login').hidden=error.status!==401;}message(error.message,true);}
 function date(value){if(!value)return 'Ще не входив';const parsed=new Date(value.includes('T')?value:value.replace(' ','T')+'Z');return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('uk-UA',{dateStyle:'medium',timeStyle:'short'});}
 function render(users){list.replaceChildren();for(const user of users){const row=document.createElement('article');row.className='users-row';const info=document.createElement('div');info.className='users-info';const name=document.createElement('h2');name.textContent=user.displayName+(user.userId===currentUserId?' · Ви':'');const email=document.createElement('p');email.className='users-email';email.textContent=user.email;const meta=document.createElement('p');meta.className='users-meta';const badge=document.createElement('span');badge.className='users-role';badge.textContent=user.role==='admin'?'Адміністратор':'Користувач';const login=document.createElement('span');login.textContent='Останній вхід: '+date(user.lastLoginAt);meta.append(badge,login);info.append(name,email,meta);const actions=document.createElement('div');actions.className='users-actions';const button=document.createElement('button');button.type='button';button.className='admin-button'+(user.role==='admin'?' users-remove':'');button.textContent=user.role==='admin'?'Зняти права адміністратора':'Призначити адміністратором';if(user.userId===currentUserId){button.dataset.self='true';button.title='Власну роль змінити не можна';}button.addEventListener('click',()=>confirmRole(user));actions.append(button);row.append(info,actions);list.append(row);}if(!users.length){const empty=document.createElement('p');empty.className='users-hint';empty.textContent='Користувачів за цим запитом не знайдено.';list.append(empty);}el('users-count').textContent='Знайдено користувачів: '+total+'.';el('users-page').textContent='Сторінка '+page+' із '+Math.max(1,Math.ceil(total/pageSize));el('users-pages').hidden=total<=pageSize;lock();}
 async function fetchUsers(){if(!authorized||busy)return false;const current=++generation;busy=true;list.replaceChildren();message('Завантажуємо користувачів…');lock();try{const params=new URLSearchParams({q:query,role,page:String(page)});const data=await api('/admin/users?'+params);if(current!==generation)return false;total=data.total;pageSize=data.pageSize;currentUserId=data.currentUserId;if(page>1&&!data.users.length){page=Math.max(1,Math.ceil(total/pageSize));busy=false;return fetchUsers();}render(data.users);message('Оберіть користувача, щоб змінити його роль.');return true;}catch(error){if(current===generation)fail(error);return false;}finally{if(current===generation){busy=false;lock();}}}
 function confirmRole(user){if(busy||!authorized||user.userId===currentUserId)return;pending=user;const promote=user.role!=='admin';el('users-confirm-title').textContent=promote?'Призначити адміністратора?':'Зняти права адміністратора?';el('users-confirm-name').textContent=user.displayName;el('users-confirm-email').textContent=user.email;el('users-confirm-description').textContent=promote?'Користувач отримає доступ до керування статтями, квізами, подіями та користувачами.':'Користувач збереже свій профіль і результати, але втратить доступ до адмінки.';dialog.showModal();el('users-cancel').focus();}
 async function save(){if(!pending||busy||!authorized)return;const user=pending,current=generation;busy=true;lock();message('Зберігаємо роль…');try{await api('/admin/users/'+encodeURIComponent(user.userId)+'/role',{method:'PATCH',body:JSON.stringify({role:user.role==='admin'?'user':'admin',expectedRole:user.role})});if(current!==generation)return;pending=null;dialog.close();busy=false;const refreshed=await fetchUsers();if(authorized)message(refreshed?'Роль користувача збережено.':'Роль збережено, але список не завантажився. Натисніть «Оновити».',!refreshed);}catch(error){if(current===generation){pending=null;dialog.close();fail(error);}}finally{if(current===generation){busy=false;lock();}}}
 async function init(){reset();const current=generation;message('Перевіряємо доступ…');try{auth=JSON.parse(localStorage.getItem(KEY)||'null');if(!auth?.sessionToken){el('users-login').hidden=false;message('Увійдіть через Google, щоб відкрити керування користувачами.');return;}const me=await api('/auth/me');if(current!==generation)return;if(me.user?.role!=='admin'){fail({status:403,message:errors.admin_required});return;}authorized=true;panel.hidden=false;page=1;query=el('users-search').value.trim();role=el('users-role').value;await fetchUsers();}catch(error){if(current===generation)fail(error);}}
 el('users-filter').addEventListener('submit',event=>{event.preventDefault();query=el('users-search').value.trim();role=el('users-role').value;page=1;fetchUsers();});el('users-role').addEventListener('change',()=>{query=el('users-search').value.trim();role=el('users-role').value;page=1;fetchUsers();});el('users-reload').addEventListener('click',()=>fetchUsers());el('users-prev').addEventListener('click',()=>{if(page>1&&!busy){page--;fetchUsers();}});el('users-next').addEventListener('click',()=>{if(page*pageSize<total&&!busy){page++;fetchUsers();}});el('users-save').addEventListener('click',save);el('users-cancel').addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>{pending=null;});
 window.addEventListener('techhub-auth-changed',init);window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null)init();});document.querySelector('[data-auth-logout]')?.addEventListener('click',()=>{reset();message('Ви вийшли з профілю.');el('users-login').hidden=false;},{capture:true});init();
})();