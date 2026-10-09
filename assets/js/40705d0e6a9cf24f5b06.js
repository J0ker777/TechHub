
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

const isScheduledArticle=article=>article&&article.status==='published'&&Boolean(article.publishedAt)&&new Date(article.publishedAt)>new Date();
const CATALOG={endpoint:"https://techhub-quiz-api.bolotin-denis.workers.dev",key:'techhub-auth-v1'};
const search=document.querySelector('#search'),grid=document.querySelector('#article-grid'),pagination=document.querySelector('#pagination'),empty=document.querySelector('.empty'),errorBox=document.querySelector('#catalog-error'),adminLink=document.querySelector('#admin-link'),pageSize=9;let currentPage=Math.max(1,Number.parseInt(new URL(location.href).searchParams.get('page')||'1',10)||1),articles=[];
function savedAuth(){try{return JSON.parse(localStorage.getItem(CATALOG.key)||'null');}catch{return null;}}
function createCard(article){const card=document.createElement('div'),articleLink=document.createElement('a');articleLink.className='card-link';const scheduled=isScheduledArticle(article);card.className='card'+((article.status==='hidden'||scheduled)?' is-hidden':'');articleLink.href=article.href;card.dataset.search=[article.number,article.title,article.description,article.href].join(' ');const image=document.createElement('img');image.src=article.imageUrl;image.alt='Обкладинка статті '+article.number;image.loading='lazy';image.width=1600;image.height=900;const copy=document.createElement('div');copy.className='card-copy';const meta=document.createElement('span');meta.className='card-meta';meta.textContent='СТАТТЯ / '+article.number;const title=document.createElement('h3');title.textContent=article.title;copy.append(meta,title);if(article.status==='hidden'||scheduled){const badge=document.createElement('span');badge.className='card-status';badge.textContent=article.status==='hidden'?'ПРИХОВАНО':'ЗАПЛАНОВАНО';copy.append(badge);}const actions=document.createElement('div');actions.className='card-actions';const more=document.createElement('a');more.href=article.href;more.className='card-more';more.textContent='Читати статтю ↗';articleLink.append(image,copy);const tools=document.createElement('div');articleTools(tools,{article,endpoint:CATALOG.endpoint});actions.append(more);card.append(articleLink,tools,actions);return card;}
function materialCount(count){const n=Math.max(0,Math.trunc(Number(count)||0)),last=n%10,lastTwo=n%100;return n+' '+(last===1&&lastTwo!==11?'матеріал':last>=2&&last<=4&&(lastTwo<12||lastTwo>14)?'матеріали':'матеріалів');}
function renderCatalog({updateUrl=true}={}){if(!search||!grid||!pagination||!empty||!errorBox||!document.querySelector('#count')||!document.querySelector('#material-count'))return;const query=search.value.trim().toLocaleLowerCase('uk'),matches=articles.filter(article=>[article.number,article.title,article.description,article.href].join(' ').toLocaleLowerCase('uk').includes(query)),pages=Math.max(1,Math.ceil(matches.length/pageSize));currentPage=Math.min(currentPage,pages);grid.replaceChildren(...matches.slice((currentPage-1)*pageSize,currentPage*pageSize).map(createCard));document.querySelector('#count').textContent=matches.length;document.querySelector('#material-count').textContent=materialCount(articles.length);empty.hidden=matches.length>0;pagination.replaceChildren();pagination.hidden=pages<=1;if(pages>1){const add=(label,page,disabled=false,current=false)=>{const button=document.createElement('button');button.className='page-button';button.type='button';button.textContent=label;button.disabled=disabled;if(current)button.setAttribute('aria-current','page');button.addEventListener('click',()=>{currentPage=page;renderCatalog();document.querySelector('#catalog-title').scrollIntoView({behavior:'smooth',block:'start'});});pagination.append(button);};add('←',currentPage-1,currentPage===1);for(let page=1;page<=pages;page++)add(String(page),page,false,page===currentPage);add('→',currentPage+1,currentPage===pages);}if(updateUrl){const url=new URL(location.href);if(currentPage>1)url.searchParams.set('page',String(currentPage));else url.searchParams.delete('page');history.replaceState(null,'',url);}}
async function request(path,token){const response=await fetch(CATALOG.endpoint+path,{headers:token?{Authorization:'Bearer '+token}:{}});if(!response.ok)throw Error(String(response.status));return response.json();}
async function loadCatalog(){if(!search||!grid||!pagination||!empty||!errorBox||!document.querySelector('#count')||!document.querySelector('#material-count'))return;try{const auth=savedAuth(),token=auth?.sessionToken;let admin=false;if(token){try{const me=await request('/auth/me',token);admin=me.user.role==='admin';}catch{admin=false;}}const slug=new URL(location.href).searchParams.get('group');if(location.pathname.endsWith('/topics.html')&&!slug)throw Error('missing_group');const result=await request(location.pathname.endsWith('/topics.html')?'/article-groups/'+encodeURIComponent(slug)+'/articles':'/articles',token||null);articles=(result.articles||[]).filter(article=>article.status!=='hidden'&&!isScheduledArticle(article));if(result.group){document.querySelector('#page-title').textContent=result.group.title;document.querySelector('#page-description').textContent=result.group.description;document.title=result.group.title+' · TechHub';}adminLink.hidden=!admin;errorBox.hidden=true;renderCatalog({updateUrl:false});}catch{articles=[];grid.replaceChildren();pagination.hidden=true;empty.hidden=true;document.querySelector('#count').textContent='0';document.querySelector('#material-count').textContent='0 матеріалів';errorBox.hidden=false;}}
function initCatalog(){if(!search||!grid||!pagination||!empty||!errorBox)return;search.addEventListener('input',()=>{currentPage=1;renderCatalog();});window.addEventListener('popstate',()=>{currentPage=Math.max(1,Number.parseInt(new URL(location.href).searchParams.get('page')||'1',10)||1);renderCatalog({updateUrl:false});});loadCatalog();}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initCatalog,{once:true});}else{initCatalog();}
