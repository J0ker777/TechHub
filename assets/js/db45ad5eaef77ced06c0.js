
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
function articleMetric(kind,value,label){const item=document.createElement('span');item.className='article-stat';item.title=label;item.innerHTML=articleIcon(kind);const text=document.createElement('span');text.textContent=value;item.append(text);return item;}
function articleShare(host,{title,href}) {
 const button=document.createElement('button'),note=document.createElement('span');
 button.type='button';button.className='article-action';button.innerHTML=articleIcon('share')+'<span>Поділитися</span>';button.setAttribute('aria-label','Поділитися статтею');
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
 const views=articleMetric('views',article.viewCount==null?'—':String(article.viewCount),'Перегляди');
 views.setAttribute('aria-label','Перегляди: '+(article.viewCount??'не завантажено'));
 host.append(level,minutes,views);
 const heart=document.createElement('div');host.append(heart);
 articleHeart(heart,{endpoint,id:article.articleId,initial:article,follow:reading});
 articleShare(host,{title:article.title,href:article.href});
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

function articleHeart(host,{endpoint,id,href='',indicator=false,initial=null,follow=true}){
 const key='techhub-auth-v1',prompt='Увійдіть через Google, щоб оцінити статтю';let busy=false,version=0,liked=false;
 const button=document.createElement('button'),note=document.createElement('span'),login=document.createElement('a');
 button.type='button';button.className='article-heart';button.setAttribute('aria-label',indicator?'Оцінки статті':'Подобається стаття');
 note.setAttribute('role','status');login.href='quizzes.html';login.textContent='Увійти через Google';login.hidden=true;
 host.classList.add('article-reactions');host.append(button,note,login);
 function token(){try{return JSON.parse(localStorage.getItem(key)||'null')?.sessionToken||'';}catch{return '';}}
 function paint(data){liked=!!data?.liked;const count=data?.likeCount??'—';button.setAttribute('aria-label',indicator?'Лайки статті: '+count:liked?'Зняти лайк: '+count:'Подобається стаття: '+count);button.innerHTML=articleIcon('heart');const text=document.createElement('span');text.textContent=String(count);button.append(text);button.title=liked?'Зняти лайк':'Подобається';button.setAttribute('aria-pressed',String(liked));}
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
const ENDPOINT="https://techhub-quiz-api.bolotin-denis.workers.dev",ADMIN=false;

const list=document.querySelector('#radar-list'),status=document.querySelector('#radar-status');
let generation=0;
const settingsPanel=document.querySelector('#radar-settings'),settingsStatus=document.querySelector('#mcp-status'),settingsToggle=document.querySelector('#mcp-toggle');
let mcpEnabled=false,settingsBusy=false;
function hideSettings(){if(settingsPanel)settingsPanel.hidden=true;if(settingsToggle)settingsToggle.disabled=true;}
function showSettings(data){mcpEnabled=data.mcpEnabled;settingsStatus.textContent=mcpEnabled?'MCP увімкнений':'MCP вимкнений';settingsToggle.textContent=mcpEnabled?'Вимкнути MCP':'Увімкнути MCP';settingsToggle.disabled=false;}
async function loadSettings(current){if(!ADMIN||!settingsPanel)return;settingsPanel.hidden=false;settingsToggle.disabled=true;settingsStatus.textContent='Перевіряємо стан…';try{const data=await api('/admin/radar/settings');if(current===generation)showSettings(data);}catch{if(current!==generation)return;settingsStatus.textContent='Не вдалося прочитати налаштування MCP. Оновіть сторінку.';settingsToggle.disabled=true;}}
settingsToggle?.addEventListener('click',async()=>{if(settingsBusy)return;settingsBusy=true;settingsToggle.disabled=true;const current=generation;try{const data=await api('/admin/radar/settings',{method:'PATCH',body:JSON.stringify({mcpEnabled:!mcpEnabled})});if(current===generation)showSettings(data);}catch(error){if(current!==generation)return;settingsStatus.textContent='Не вдалося змінити стан MCP. Оновіть сторінку для перевірки.';settingsToggle.disabled=true;if([401,403].includes(error.status))hideSettings();}finally{settingsBusy=false;}});
const priorities={critical:'🔴 Критично',interesting:'🟡 Цікаво',useful:'🔵 Корисно'};
function auth(){try{return JSON.parse(localStorage.getItem('techhub-auth-v1')||'null');}catch{return null;}}
function message(text,error=false){status.textContent=text;status.dataset.error=String(error);}
async function api(path,options={}){const token=ADMIN?auth()?.sessionToken:null;const response=await fetch(ENDPOINT+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})}});if(!response.ok){const error=Error('request_failed');error.status=response.status;throw error;}return response.json();}
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}}

let eventById=new Map(),eventsReady=false,eventsFailed=false,dialog=null,dialogContent=null,returnFocus=null;
function eventUrl(id){const url=new URL(window.location.href);url.searchParams.set('event',id);return url;}
function closeEvent(){const url=new URL(window.location.href);if(url.searchParams.has('event')){url.searchParams.delete('event');window.history.pushState(window.history.state,'',url.href);}syncEvent();}
function ensureDialog(){
 if(dialog)return;
 dialog=element('dialog',undefined,'radar-dialog');dialog.setAttribute('aria-labelledby','radar-dialog-title');
 const inner=element('div',undefined,'radar-dialog-inner'),toolbar=element('div',undefined,'radar-dialog-toolbar'),close=element('button','Закрити','page-button');close.type='button';close.addEventListener('click',closeEvent);toolbar.append(close);
 dialogContent=element('div');inner.append(toolbar,dialogContent);dialog.append(inner);document.body.append(dialog);
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeEvent();});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeEvent();});
}
async function copyLink(url){
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);return;}}catch{}
 const input=element('textarea');input.value=url;input.setAttribute('aria-label','Посилання на подію');input.style.position='fixed';input.style.opacity='0';dialog.append(input);
 const focused=document.activeElement;
 try{input.focus();input.select();if(!document.execCommand('copy'))throw Error('copy_failed');}finally{input.remove();focused?.focus();}
}
function shareAction(event,host){
 const actions=element('div',undefined,'radar-actions'),button=element('button','Поділитися','quiz-link'),note=element('p',undefined,'radar-status radar-dialog-note');button.type='button';note.setAttribute('role','status');actions.append(button);host.append(actions,note);
 button.addEventListener('click',async()=>{
  if(button.disabled)return;button.disabled=true;note.textContent='';note.dataset.error='false';
  const url=eventUrl(event.id).href;
  try{
   if(typeof navigator.share==='function'){
    try{await navigator.share({title:event.title,url});return;}catch(error){if(error.name==='AbortError')return;}
   }
   await copyLink(url);note.textContent='Посилання скопійовано';
  }catch{note.textContent='Не вдалося скопіювати посилання. Скопіюйте його з адресного рядка.';note.dataset.error='true';}finally{button.disabled=false;}
 });
}
function syncEvent(){
 if(ADMIN)return;
 const url=new URL(window.location.href);
 if(!url.searchParams.has('event')){if(dialog?.open){dialog.close();returnFocus?.focus();returnFocus=null;}return;}
 ensureDialog();dialogContent.replaceChildren();
 const id=url.searchParams.get('event'),event=eventsReady?eventById.get(id):null;
 if(event){const detail=card(event,true);detail.querySelector('h2').id='radar-dialog-title';dialogContent.append(detail);shareAction(event,dialogContent);}
 else{const heading=element('h2','Подія IT Radar');heading.id='radar-dialog-title';const note=element('p',eventsFailed?'Не вдалося завантажити подію. Спробуйте оновити сторінку.':eventsReady?'Ця подія не знайдена або більше недоступна.':'Завантажуємо подію…','radar-status');note.setAttribute('role','status');dialogContent.append(heading,note);}
 if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}
}
function openEvent(event){const url=eventUrl(event.id);if(url.href!==window.location.href)window.history.pushState(window.history.state,'',url.href);syncEvent();}
if(!ADMIN)window.addEventListener('popstate',syncEvent);

function card(event,detail=false){
 const article=element('article',undefined,'radar-event'+(ADMIN&&!event.isActive?' radar-inactive':''));
 const meta=element('div',undefined,'radar-meta');meta.append(element('span',priorities[event.priority]||event.priority));
 const date=element('time',new Date(event.createdAt).toLocaleString('uk-UA'));date.dateTime=event.createdAt;meta.append(date);
 if(ADMIN)meta.append(element('span',event.isActive?'Активна':'На модерації'));
 const heading=element('h2',event.title);
 if(!ADMIN&&!detail){
  const open=element('button',event.title,'radar-title-button');open.type='button';open.setAttribute('aria-haspopup','dialog');heading.textContent='';heading.append(open);article.className+=' radar-open';
  article.addEventListener('click',e=>{if(e.target.closest('a'))return;openEvent(event);});
 }
 article.append(meta,heading,element('p',event.summary,'radar-summary'));
 const source=element('p');const url=safeUrl(event.sourceUrl);
 if(url){const link=element('a',event.source||'Джерело ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';source.append(link);}else source.textContent=event.source||'Джерело не вказано';article.append(source);
 if(ADMIN){
  const actions=element('div',undefined,'radar-actions'),toggle=element('button',event.isActive?'Деактивувати':'Активувати','quiz-link'),edit=element('button','Редагувати','page-button'),remove=element('button','Видалити','page-button radar-delete');toggle.type=edit.type=remove.type='button';actions.append(toggle,edit,remove);article.append(actions);
  let busy=false;
  function setBusy(value){busy=value;toggle.disabled=edit.disabled=remove.disabled=value;}
  async function save(body){if(busy)return;setBusy(true);try{await api('/admin/radar/events/'+encodeURIComponent(event.id),{method:'PATCH',body:JSON.stringify(body)});await load();}catch{message('Не вдалося зберегти подію. Оновіть список і спробуйте ще раз.',true);}finally{setBusy(false);}}
  remove.addEventListener('click',async()=>{
   if(busy||!window.confirm('Видалити подію «'+event.title+'» назавжди? Відновити її буде неможливо.'))return;
   setBusy(true);try{await api('/admin/radar/events/'+encodeURIComponent(event.id),{method:'DELETE'});await load();}catch{message('Не вдалося видалити подію. Оновіть список і спробуйте ще раз.',true);}finally{setBusy(false);}
  });
  toggle.addEventListener('click',()=>save({isActive:!event.isActive}));
  edit.addEventListener('click',()=>{
   if(busy||article.querySelector('form'))return;
   const form=element('form',undefined,'radar-form'),inputs={};
   for(const [key,label,max] of [['title','Заголовок',200],['summary','Опис',5000],['source','Джерело',200],['sourceUrl','URL джерела',2048],['priority','Пріоритет',0]]){
    const field=element('label',label),input=element(key==='summary'?'textarea':key==='priority'?'select':'input');input.name=key;
    if(key==='priority')for(const priority of Object.keys(priorities)){const option=element('option',priorities[priority]);option.value=priority;input.append(option);}
    else{input.maxLength=max;input.required=['title','summary'].includes(key);if(key==='sourceUrl')input.type='url';}
    input.value=event[key]||'';field.append(input);form.append(field);inputs[key]=input;
   }
   const buttons=element('div',undefined,'radar-actions'),submit=element('button','Зберегти','quiz-link'),cancel=element('button','Скасувати','page-button');submit.type='submit';cancel.type='button';buttons.append(submit,cancel);form.append(buttons);article.append(form);inputs.title.focus();
   cancel.addEventListener('click',()=>form.remove());
   form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=cancel.disabled=true;await save(Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value])));submit.disabled=cancel.disabled=false;});
  });
 }
 return article;
}
async function load(){const current=++generation;eventsReady=false;eventsFailed=false;eventById.clear();syncEvent();list.replaceChildren();hideSettings();message(ADMIN?'Перевіряємо доступ…':'Завантажуємо події…');try{
 if(ADMIN){if(!auth()?.sessionToken){message('Увійдіть через Google на сторінці тестів.',true);return;}const me=await api('/auth/me');if(current!==generation)return;if(me.user.role!=='admin'){message('Ця сторінка доступна лише адміністратору.',true);return;}}
 if(ADMIN)loadSettings(current);
 const data=await api(ADMIN?'/admin/radar/events':'/api/radar/events');if(current!==generation)return;
 const events=data.events||[];eventById=new Map(events.map(event=>[event.id,event]));eventsReady=true;list.replaceChildren(...events.map(event=>card(event)));message(events.length?'Подій: '+events.length+'.':'Подій поки немає.');syncEvent();
 }catch(error){if(current!==generation)return;eventsFailed=true;syncEvent();message(ADMIN&&[401,403].includes(error.status)?'Потрібна чинна сесія адміністратора.':'Не вдалося завантажити події. Спробуйте оновити сторінку.',true);}}
window.addEventListener('techhub-auth-changed',load);window.addEventListener('storage',event=>{if(event.key==='techhub-auth-v1'||event.key===null)load();});
document.querySelector('[data-auth-logout]')?.addEventListener('click',()=>{generation++;hideSettings();list.replaceChildren();message('Вихід із профілю.');},{capture:true});
load();
})();