
const root=document.documentElement, themeToggle=document.querySelector('#theme-toggle');
try{themeToggle.checked=localStorage.getItem('article-theme')==='light'}catch{}
themeToggle.addEventListener('change',()=>{try{localStorage.setItem('article-theme',themeToggle.checked?'light':'dark')}catch{}});
function articleHeart(host,{endpoint,id,href='',indicator=false,initial=null}){
 const key='techhub-auth-v1',prompt='Увійдіть через Google, щоб оцінити статтю';let busy=false,version=0,liked=false;
 const button=document.createElement('button'),note=document.createElement('span'),login=document.createElement('a');
 button.type='button';button.className='article-heart';button.setAttribute('aria-label',indicator?'Оцінки статті':'Подобається стаття');
 note.setAttribute('role','status');login.href='quizzes.html';login.textContent='Увійти через Google';login.hidden=true;
 host.classList.add('article-reactions');host.append(button,note,login);
 function token(){try{return JSON.parse(localStorage.getItem(key)||'null')?.sessionToken||'';}catch{return '';}}
 function paint(data){liked=!!data?.liked;button.setAttribute('aria-label',indicator?'?????? ??????':liked?'????? ????':'??????????? ??????');button.textContent=(data?.liked?'♥':'♡')+' '+(data?.likeCount??'—');button.setAttribute('aria-pressed',String(!!data?.liked));}
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
   const response=await fetch(endpoint+'/articles/'+id+'/likes',{method:liked?'DELETE':'POST',headers:{Authorization:'Bearer '+session}});
   if(response.status===401){askLogin();return;}if(!response.ok)throw Error();paint(await response.json());
  }catch{note.textContent='Не вдалося зберегти оцінку. Спробуйте ще раз.';}finally{busy=false;button.disabled=false;}
 });
 if(!indicator){refresh();window.addEventListener('focus',refresh);window.addEventListener('techhub-auth-changed',refresh);}
}
for(const host of document.querySelectorAll('[data-article-reaction]'))if(host.dataset.reactionApi)articleHeart(host,{endpoint:host.dataset.reactionApi,id:host.dataset.articleReaction});

(()=>{
const ENDPOINT="https://techhub-quiz-api.bolotin-denis.workers.dev",ADMIN=true;

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
function card(event){
 const article=element('article',undefined,'radar-event'+(ADMIN&&!event.isActive?' radar-inactive':''));
 const meta=element('div',undefined,'radar-meta');meta.append(element('span',priorities[event.priority]||event.priority));
 const date=element('time',new Date(event.createdAt).toLocaleString('uk-UA'));date.dateTime=event.createdAt;meta.append(date);
 if(ADMIN)meta.append(element('span',event.isActive?'Активна':'На модерації'));
 article.append(meta,element('h2',event.title),element('p',event.summary,'radar-summary'));
 const source=element('p');const url=safeUrl(event.sourceUrl);
 if(url){const link=element('a',event.source||'Джерело ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';source.append(link);}else source.textContent=event.source||'Джерело не вказано';article.append(source);
 if(ADMIN){
  const actions=element('div',undefined,'radar-actions'),toggle=element('button',event.isActive?'Деактивувати':'Активувати','quiz-link'),edit=element('button','Редагувати','page-button');toggle.type=edit.type='button';actions.append(toggle,edit);article.append(actions);
  async function save(body){toggle.disabled=edit.disabled=true;try{await api('/admin/radar/events/'+encodeURIComponent(event.id),{method:'PATCH',body:JSON.stringify(body)});await load();}catch{message('Не вдалося зберегти подію. Оновіть список і спробуйте ще раз.',true);}finally{toggle.disabled=edit.disabled=false;}}
  toggle.addEventListener('click',()=>save({isActive:!event.isActive}));
  edit.addEventListener('click',()=>{
   if(article.querySelector('form'))return;
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
async function load(){const current=++generation;list.replaceChildren();hideSettings();message(ADMIN?'Перевіряємо доступ…':'Завантажуємо події…');try{
 if(ADMIN){if(!auth()?.sessionToken){message('Увійдіть через Google на сторінці тестів.',true);return;}const me=await api('/auth/me');if(current!==generation)return;if(me.user.role!=='admin'){message('Ця сторінка доступна лише адміністратору.',true);return;}}
 if(ADMIN)loadSettings(current);
 const data=await api(ADMIN?'/admin/radar/events':'/api/radar/events');if(current!==generation)return;
 list.replaceChildren(...(data.events||[]).map(card));message(data.events?.length?'Подій: '+data.events.length+'.':'Подій поки немає.');
 }catch(error){if(current!==generation)return;message(ADMIN&&[401,403].includes(error.status)?'Потрібна чинна сесія адміністратора.':'Не вдалося завантажити події. Спробуйте оновити сторінку.',true);}}
window.addEventListener('techhub-auth-changed',load);window.addEventListener('storage',event=>{if(event.key==='techhub-auth-v1'||event.key===null)load();});
document.querySelector('[data-auth-logout]')?.addEventListener('click',()=>{generation++;hideSettings();list.replaceChildren();message('Вихід із профілю.');},{capture:true});
load();
})();