(()=>{

const root=document.documentElement, themeToggle=document.querySelector('#theme-toggle');
try{themeToggle.checked=localStorage.getItem('article-theme')==='light'}catch{}
themeToggle.addEventListener('change',()=>{try{localStorage.setItem('article-theme',themeToggle.checked?'light':'dark')}catch{}});


const CONFIG={"apiUrl":"https://techhub-quiz-api.bolotin-denis.workers.dev","siteUrl":"https://j0ker777.github.io/TechHub/","assetBaseUrl":"./"},state=document.querySelector('#article-state'),shell=document.querySelector('.article-page-shell'),message=document.querySelector('#article-message'),retry=document.querySelector('#article-retry'),main=document.querySelector('#article-main');
retry.addEventListener('click',()=>location.reload());
const id=new URL(location.href).searchParams.get('id');
function articlePublicUrl(articleHref,pageHref){
 if(typeof articleHref!=='string'||!/^\d{3}-[a-z0-9-]+\.html$/.test(articleHref))throw Error('Invalid public article path');
 const current=new URL(pageHref),target=new URL(articleHref,current);
 target.search=current.search;target.searchParams.delete('id');target.hash=current.hash;
 return target.href;
}
if(!id||!/^\d{3}$/.test(id)){message.textContent='Не вказано коректний номер статті.';state.setAttribute('aria-busy','false');return;}
function fail(status){main.hidden=true;shell.hidden=false;state.hidden=false;state.setAttribute('aria-busy','false');message.textContent=status===404?'Статтю не знайдено або її ще не опубліковано.':'Не вдалося завантажити статтю. Спробуйте ще раз.';retry.hidden=status===404;document.querySelector('#article-state-title').textContent='Стаття недоступна';}
function siteLink(value,base=CONFIG.siteUrl){const url=new URL(value,new URL(base,location.href));if(!['http:','https:'].includes(url.protocol))throw Error('Invalid resource URL');return url.href;}
function metadata(selector,value){const item=document.querySelector(selector);if(item)item.setAttribute('content',value);}
async function load(){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);let response,data;
 try{response=await fetch(CONFIG.apiUrl+'/articles/'+id+'/content',{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});if(!response.ok){fail(response.status);return;}data=await response.json();}
 catch{fail(503);return;}finally{clearTimeout(timeout);}
 try{
  const article=data?.article;
  if(!article||article.articleId!==id||typeof article.title!=='string'||!article.title.trim()||typeof article.contentHtml!=='string'||!article.contentHtml.trim()||typeof article.contentCss!=='string'||!Array.isArray(article.toc)||article.toc.some(item=>!item||typeof item.id!=='string'||!item.id||typeof item.title!=='string'))throw Error('Invalid article');
  const href=siteLink(article.href),image=siteLink(article.imageUrl,CONFIG.assetBaseUrl),title=document.querySelector('#article-title');
  document.title=article.title+' · IT / Практика';document.querySelector('link[rel="canonical"]').href=href;
  metadata('meta[name="description"]',article.description||article.title);metadata('meta[property="og:title"]',article.title);metadata('meta[property="og:description"]',article.description||article.title);metadata('meta[property="og:url"]',href);metadata('meta[property="og:image"]',image);
  const colon=article.title.indexOf(':');
  if(colon>0&&colon<=30){const topic=document.createElement('span'),rest=document.createElement('span');topic.className='headline-topic';topic.textContent=article.title.slice(0,colon+1);rest.className='headline-text';rest.textContent=article.title.slice(colon+1).trim();title.replaceChildren(topic,document.createTextNode(' '),rest);}else title.textContent=article.title;
  document.querySelector('#article-number').textContent=id;document.querySelector('#article-issue').textContent='ВИПУСК / '+id;document.querySelector('#article-number-meta').textContent='№ '+id;document.querySelector('#article-footer-number').textContent='IT / ПРАКТИКА · '+id;
  document.querySelector('#article-topic').textContent=['002','007','017','019','020'].includes(id)?'Безпека / API':['005','010','015'].includes(id)?'AI / Корпоративні системи':['011','012'].includes(id)?'Команда / Професійний розвиток':'Архітектура / IT-практика';
  const cover=document.querySelector('#article-cover');cover.alt='Обкладинка: '+article.title;cover.src=image;
  const tools=document.querySelector('#article-tools');tools.dataset.articleTools=id;tools.dataset.reactionApi=CONFIG.apiUrl;tools.dataset.difficulty=article.difficulty||'';tools.dataset.readingMinutes=String(article.readingMinutes||'');
  document.querySelector('#article-test-link').href=siteLink('article-test.html?article='+id);document.querySelector('#article-home-link').href=CONFIG.siteUrl;
  const nav=document.querySelector('#article-navigation');
  for(const item of article.toc){const link=document.createElement('a');link.href='#'+encodeURIComponent(item.id);link.textContent=item.title;nav.append(link);}
  const content=document.querySelector('#article-content');content.setAttribute('aria-label',article.title);content.innerHTML=article.contentHtml;
  const diagramStyle=document.createElement('style');diagramStyle.id='article-content-styles';diagramStyle.textContent=article.contentCss;document.head.append(diagramStyle);
  state.hidden=true;shell.hidden=true;main.hidden=false;
  history.replaceState(history.state,'',articlePublicUrl(article.href,location.href));
  initializeReading();
  if(location.hash){let anchor;try{anchor=decodeURIComponent(location.hash.slice(1));}catch{}if(anchor)requestAnimationFrame(()=>document.getElementById(anchor)?.scrollIntoView({behavior:'instant'}));}
  window.dispatchEvent(new CustomEvent('techhub-article-loaded',{detail:{articleId:id}}));
 }catch{fail(503);}
}
function initializeReading(){
 const root=document.documentElement;
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
const menu=document.querySelector('.sidebar details'), mobile=matchMedia('(max-width:900px)');
function fitMenu(){menu.open=!mobile.matches}fitMenu();if(mobile.addEventListener)mobile.addEventListener('change',fitMenu);else if(mobile.addListener)mobile.addListener(fitMenu);
const links=[...document.querySelectorAll('.sidebar a')], headings=[...document.querySelectorAll('.article h2')];
let scheduled=false;function updateReading(){scheduled=false;const total=root.scrollHeight-innerHeight;document.querySelector('.reading-progress').style.width=(total>0?Math.min(100,Math.max(0,scrollY/total*100)):100)+'%';let active=null;for(const h of headings){if(h.getBoundingClientRect().top<=160)active=h.id;else break}for(const link of links){const selected=link.hash==='#'+active;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')}}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(updateReading)}}addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);updateReading();
for(const link of links)link.addEventListener('click',()=>{if(mobile.matches)menu.open=false});
const status=document.querySelector('.status');let statusTimer;function announce(text){status.textContent=text;clearTimeout(statusTimer);statusTimer=setTimeout(()=>status.textContent='',2500)}
async function copyText(text){if(navigator.clipboard&&isSecureContext){try{await navigator.clipboard.writeText(text);return}catch{}}const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();let ok;try{ok=document.execCommand('copy')}finally{field.remove()}if(!ok)throw Error('copy');}
for(const button of document.querySelectorAll('.copy'))button.addEventListener('click',async()=>{try{await copyText(button.closest('.code-block').querySelector('code').textContent);button.textContent='Скопійовано';announce('Код скопійовано');setTimeout(()=>button.textContent='Копіювати',1800)}catch{announce('Виділіть код і скопіюйте його вручну')}});
(() => {
  const STORAGE_PREFIX = 'techhub-scroll-position:';
  const key = STORAGE_PREFIX + location.pathname + (location.search || '');

  function saveScroll() {
    try {
      localStorage.setItem(key, String(window.scrollY));
    } catch (error) {
      // ignore quota errors
    }
  }

  function restoreScroll() {
    try {
      const saved = Number(localStorage.getItem(key) || 0);
      if (!saved || saved < 20) return;

      requestAnimationFrame(() => {
        window.scrollTo({ top: saved, behavior: 'auto' });
      });
    } catch (error) {
      // ignore
    }
  }

  window.addEventListener('beforeunload', saveScroll);
  window.addEventListener('pagehide', saveScroll);
  if(!location.hash){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restoreScroll,{once:true});else restoreScroll();}
})();

}
load();
})();