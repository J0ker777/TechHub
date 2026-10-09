
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


const ADMIN={endpoint:"https://techhub-quiz-api.bolotin-denis.workers.dev",key:'techhub-auth-v1'},statusBox=document.querySelector('#admin-status'),list=document.querySelector('#admin-list');let auth=null,articles=[],busy=false;
function isScheduledArticle(article){return article&&article.status==='published'&&Boolean(article.publishedAt)&&new Date(article.publishedAt)>new Date();}
function message(text,error=false){statusBox.textContent=text;statusBox.classList.toggle('error',error);}
function storedAuth(){try{return JSON.parse(localStorage.getItem(ADMIN.key)||'null');}catch{return null;}}
async function api(path,options={}){const response=await fetch(ADMIN.endpoint+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),Authorization:'Bearer '+auth.sessionToken,...options.headers}});let body={};try{body=await response.json();}catch{}if(!response.ok){const error=new Error(body.error||'request_failed');error.status=response.status;throw error;}return body;}
function button(label,action,className=''){const element=document.createElement('button');element.type='button';element.className='admin-button '+className;element.textContent=label;element.addEventListener('click',action);return element;}
function localDate(value){if(!value)return '';const date=new Date(value),pad=n=>String(n).padStart(2,'0');return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+'T'+pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds());}
function dateControls(article){
 const box=document.createElement('div');box.className='admin-schedule';
 const label=document.createElement('label'),input=document.createElement('input');
 input.type='datetime-local';input.step='1';input.id='publish-at-'+article.articleId;input.value=localDate(article.publishedAt);input.disabled=busy;
 label.htmlFor=input.id;label.textContent='Публікувати з (ваш місцевий час)';
 const save=button('Зберегти дату',()=>saveDate(article,input)),clear=button('Без дати',()=>saveDate(article,null));save.disabled=clear.disabled=busy;
 box.append(label,input,save,clear);return box;
}
async function saveDate(article,input){
 if(busy)return;
 if(input&&!input.checkValidity()){input.reportValidity();return;}
 const date=input?.value?new Date(input.value):null;
 if(date&&!Number.isFinite(date.getTime())){message('Некоректна дата публікації.',true);return;}
 const publishedAt=date?date.toISOString():null;busy=true;render();
 try{const result=await api('/admin/articles/'+encodeURIComponent(article.articleId),{method:'PATCH',body:JSON.stringify({publishedAt})});article.publishedAt=result.publishedAt;article.status=result.status;message('Дату збережено. Приховану статтю потрібно також опублікувати.');}
 catch{message('Не вдалося зберегти дату публікації.',true);}finally{busy=false;render();}
}
function difficultyControls(article){
 const box=document.createElement('label'),select=document.createElement('select');box.textContent='Складність ';select.disabled=busy;
 if(!article.difficulty){const option=document.createElement('option');option.value='';option.textContent='Не визначено';select.append(option);}
 for(const [value,label] of Object.entries({easy:'Проста',medium:'Середня',hard:'Складна'})){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}select.value=article.difficulty||'';
 select.addEventListener('change',async()=>{if(busy||!select.value)return;const value=select.value;busy=true;render();try{const result=await api('/admin/articles/'+encodeURIComponent(article.articleId),{method:'PATCH',body:JSON.stringify({difficulty:value})});article.difficulty=result.difficulty;message('Складність статті '+article.number+' збережено.');}catch{message('Не вдалося зберегти складність.',true);}finally{busy=false;render();}});
 box.append(select);return box;
}
function render(){list.replaceChildren();if(!articles.length){const empty=document.createElement('p');empty.className='admin-empty';empty.textContent='Статей не знайдено.';list.append(empty);return;}articles.forEach((article,index)=>{const row=document.createElement('article');const scheduled=isScheduledArticle(article);row.className='admin-row'+((article.status==='hidden'||scheduled)?' is-hidden':'');const number=document.createElement('span');number.className='admin-number';number.textContent=article.number;const title=document.createElement('div');title.className='admin-title';const strong=document.createElement('strong');strong.textContent=article.title;const link=document.createElement('a');link.href=article.href;link.textContent='Відкрити статтю ↗';link.target='_blank';link.rel='noopener';title.append(strong,link,dateControls(article),difficultyControls(article));const badge=document.createElement('span');badge.className='admin-badge';badge.textContent=article.status==='published'?'Опубліковано':'Приховано';if(scheduled)badge.textContent='Заплановано';const controls=document.createElement('div');controls.className='admin-controls';const up=button('↑',()=>move(index,-1));up.title='Перемістити вище';up.disabled=busy||index===0;const down=button('↓',()=>move(index,1));down.title='Перемістити нижче';down.disabled=busy||index===articles.length-1;const toggle=button(article.status==='published'?'Приховати':'Опублікувати',()=>toggleStatus(article),'admin-toggle');toggle.disabled=busy;controls.append(up,down,toggle);row.append(number,title,badge,controls);list.append(row);});}
async function toggleStatus(article){if(busy)return;busy=true;render();const previous=article.status,next=previous==='published'?'hidden':'published';try{const result=await api('/admin/articles/'+encodeURIComponent(article.articleId),{method:'PATCH',body:JSON.stringify({status:next})});article.status=result.status;article.publishedAt=result.publishedAt;message(article.number+(next==='published'?' опубліковано.':' приховано.'));}catch{article.status=previous;message('Не вдалося змінити статус статті '+article.number+'.',true);}finally{busy=false;render();}}
async function move(index,direction){if(busy)return;const target=index+direction;if(target<0||target>=articles.length)return;busy=true;[articles[index],articles[target]]=[articles[target],articles[index]];render();try{await api('/admin/articles',{method:'PUT',body:JSON.stringify({articleIds:articles.map(article=>article.articleId)})});message('Порядок статей збережено.');}catch{[articles[index],articles[target]]=[articles[target],articles[index]];message('Не вдалося зберегти порядок.',true);}finally{busy=false;render();}}
async function init(){auth=storedAuth();if(!auth?.sessionToken){message('Спочатку увійдіть через Google на сторінці тестів.',true);return;}try{const me=await api('/auth/me');if(me.user.role!=='admin'){message('Ця сторінка доступна лише адміністратору.',true);return;}const result=await api('/admin/articles');articles=result.articles;message('Завантажено статей: '+articles.length+'.');render();}catch(error){message(error.status===403?'Ця сторінка доступна лише адміністратору.':'Не вдалося завантажити керування статтями.',true);}}
init();
