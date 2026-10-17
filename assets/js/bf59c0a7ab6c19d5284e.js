const ARTICLE_SITE_URL="https://jokerhub.com.ua/";

function articleLikeOnSite(id){
 const site=new URL(ARTICLE_SITE_URL),state=crypto.randomUUID(),url=new URL('article-like.html',site);
 url.searchParams.set('article',id);url.searchParams.set('state',state);
 return new Promise((resolve,reject)=>{
  let popup,timer,closed;
  const stop=()=>{clearTimeout(timer);clearInterval(closed);window.removeEventListener('message',receive);};
  const receive=event=>{
   if(event.origin!==site.origin||event.source!==popup||event.data?.state!==state||event.data?.articleId!==id)return;
   if(event.data.type==='jokerhub-like-ready'){popup.postMessage({type:'jokerhub-like-start',state,articleId:id},site.origin);return;}
   if(event.data.type==='jokerhub-like-result'&&typeof event.data.liked==='boolean'&&Number.isSafeInteger(event.data.likeCount)&&event.data.likeCount>=0){stop();resolve({liked:event.data.liked,likeCount:event.data.likeCount});}
   if(event.data.type==='jokerhub-like-error'){stop();reject(Error('like_failed'));}
  };
  window.addEventListener('message',receive);
  popup=window.open(url.href,'_blank','popup,width=520,height=650');
  if(!popup){stop();reject(Error('popup_blocked'));return;}
  timer=setTimeout(()=>{stop();reject(Error('like_timeout'));},300000);
  closed=setInterval(()=>{if(popup.closed){stop();reject(Error('like_closed'));}},500);
 });
}


const root=document.documentElement, themeToggle=document.querySelector('#theme-toggle');
try{themeToggle.checked=localStorage.getItem('article-theme')==='light'}catch{}
function applySiteTheme(theme){if(theme==='light'||theme==='dark')themeToggle.checked=theme==='light';}
themeToggle.addEventListener('change',()=>{const theme=themeToggle.checked?'light':'dark';try{localStorage.setItem('article-theme',theme)}catch{}window.dispatchEvent(new CustomEvent('techhub-theme-changed',{detail:{theme}}));});
window.addEventListener('techhub-apply-theme',event=>{applySiteTheme(event.detail?.theme);try{localStorage.setItem('article-theme',event.detail.theme)}catch{}});
window.addEventListener('storage',event=>{if(event.key==='article-theme'||event.key===null){try{applySiteTheme(localStorage.getItem('article-theme')||'dark')}catch{}}});

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
   if(sent||document.visibilityState!=='visible'||document.querySelector?.('#member-gate'))return;sent=true;
   let visitorId;try{visitorId=localStorage.getItem('techhub-visitor-v1');if(!visitorId){visitorId=crypto.randomUUID();localStorage.setItem('techhub-visitor-v1',visitorId);}}catch{visitorId=crypto.randomUUID();}
   try{const r=await fetch(endpoint+'/articles/'+article.articleId+'/views',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})});if(r.ok)paint(await r.json());}catch{}
   document.removeEventListener('visibilitychange',countView);
  }
  if(document.visibilityState==='visible')countView();else document.addEventListener('visibilitychange',countView);
  window.addEventListener('techhub-member-content-loaded',countView,{once:true});
 }
}

function articleHeart(host,{endpoint,id,href='',indicator=false,initial=null,follow=true,compact=false}){
 const key='techhub-auth-v1',prompt='Увійдіть через Google, щоб оцінити статтю';let busy=false,version=0,liked=false;
 const button=document.createElement('button'),note=document.createElement('span'),login=document.createElement('a');
 button.type='button';button.className='article-heart';button.setAttribute('aria-label',indicator?'Оцінки статті':'Подобається стаття');
 note.setAttribute('role','status');login.href="https://jokerhub.com.ua/quizzes.html";login.textContent='Увійти через Google';login.hidden=true;
 host.classList.add('article-reactions');host.append(button,note,login);
 function token(){try{return JSON.parse(localStorage.getItem(key)||'null')?.sessionToken||'';}catch{return '';}}
 function paint(data){liked=!!data?.liked;const count=data?.likeCount??'—';button.setAttribute('aria-label',indicator?'Лайки статті: '+count:liked?'Зняти лайк: '+count:'Подобається стаття: '+count);button.innerHTML=articleIcon('heart');const text=document.createElement('span');text.textContent=articleCount(count,compact);button.append(text);button.title=liked?'Зняти лайк':'Подобається';button.setAttribute('aria-pressed',String(liked));}
 function askLogin(){note.textContent=prompt;login.hidden=false;}
 async function refresh(){const current=++version,session=token();try{const response=await fetch(endpoint+'/articles/'+id+'/likes',{headers:session?{Authorization:'Bearer '+session}:{}});if(!response.ok)throw Error();const data=await response.json();if(current===version)paint(data);}catch{if(current===version)note.textContent='Не вдалося завантажити оцінки.';}}
 paint(initial);if(!endpoint){button.disabled=true;button.title='Лайки доступні на сайті TechHub';}
 button.addEventListener('click',async()=>{
  if(busy)return;if(location.origin!==new URL(ARTICLE_SITE_URL).origin){busy=true;button.disabled=true;note.textContent='';try{paint(await articleLikeOnSite(id));}catch{note.textContent='Не вдалося зберегти оцінку. Спробуйте ще раз.';}finally{busy=false;button.disabled=false;}return;}const session=token();if(!session){askLogin();return;}
  busy=true;button.disabled=true;note.textContent='';login.hidden=true;++version;
  try{
   const me=await fetch(endpoint+'/auth/me',{headers:{Authorization:'Bearer '+session}});
   if(me.status===401){askLogin();return;}if(!me.ok)throw Error();
   if(indicator){location.href=href;return;}
   const response=await fetch(endpoint+'/articles/'+id+'/likes',{method:liked?'DELETE':'POST',headers:{Authorization:'Bearer '+session}});
   if(response.status===401){askLogin();return;}if(!response.ok)throw Error();paint(await response.json());
  }catch{note.textContent='Не вдалося зберегти оцінку. Спробуйте ще раз.';}finally{busy=false;button.disabled=false;}
 });
 if(!indicator&&endpoint){if(initial?.likeCount==null)refresh();if(follow&&location.origin===new URL(ARTICLE_SITE_URL).origin){window.addEventListener('focus',refresh);window.addEventListener('techhub-auth-changed',refresh);}}
}
for(const host of document.querySelectorAll('[data-article-tools]')){
 const article={articleId:host.dataset.articleTools,title:document.querySelector('h1')?.textContent||document.title,href:document.querySelector('link[rel="canonical"]')?.href||location.href,difficulty:host.dataset.difficulty,readingMinutes:Number(host.dataset.readingMinutes)||null,viewCount:null};
 articleTools(host,{article,endpoint:host.dataset.reactionApi,reading:true});
 const end=document.querySelector('[data-article-share-end]');if(end){end.classList.add('article-tools','article-tools-end');articleShare(end,{title:article.title,href:article.href});}
}
for(const host of document.querySelectorAll('[data-article-reaction]'))if(host.dataset.reactionApi)articleHeart(host,{endpoint:host.dataset.reactionApi,id:host.dataset.articleReaction});
const menu=document.querySelector('.sidebar details'), mobile=matchMedia('(max-width:900px)');
function fitMenu(){menu.open=!mobile.matches}fitMenu();if(mobile.addEventListener)mobile.addEventListener('change',fitMenu);else if(mobile.addListener)mobile.addListener(fitMenu);
let links=[...document.querySelectorAll('.sidebar a')], headings=[...document.querySelectorAll('.article h2')];
let scheduled=false;function updateReading(){scheduled=false;const total=root.scrollHeight-innerHeight;document.querySelector('.reading-progress').style.width=(total>0?Math.min(100,Math.max(0,scrollY/total*100)):100)+'%';let active=null;for(const h of headings){if(h.getBoundingClientRect().top<=160)active=h.id;else break}for(const link of links){const selected=link.hash==='#'+active;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')}}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(updateReading)}}addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);updateReading();
for(const link of links)link.addEventListener('click',()=>{if(mobile.matches)menu.open=false});
window.addEventListener('techhub-member-content-loaded',()=>{links=[...document.querySelectorAll('.sidebar a')];headings=[...document.querySelectorAll('.article h2')];for(const link of links)link.addEventListener('click',()=>{if(mobile.matches)menu.open=false});schedule();});
const status=document.querySelector('.status');let statusTimer;function announce(text){status.textContent=text;clearTimeout(statusTimer);statusTimer=setTimeout(()=>status.textContent='',2500)}
async function copyText(text){if(navigator.clipboard&&isSecureContext){try{await navigator.clipboard.writeText(text);return}catch{}}const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();let ok;try{ok=document.execCommand('copy')}finally{field.remove()}if(!ok)throw Error('copy');}
function bindArticleCopy(){for(const button of document.querySelectorAll('.copy')){if(button.dataset.copyBound)continue;button.dataset.copyBound='true';button.addEventListener('click',async()=>{try{await copyText(button.closest('.code-block').querySelector('code').textContent);button.textContent='Скопійовано';announce('Код скопійовано');setTimeout(()=>button.textContent='Копіювати',1800)}catch{announce('Виділіть код і скопіюйте його вручну')}});}}
bindArticleCopy();window.addEventListener('techhub-member-content-loaded',bindArticleCopy);
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
  document.addEventListener('DOMContentLoaded', () => {
    if(!location.hash)restoreScroll();
  });
})();

const MEMBER_SITE="https://jokerhub.com.ua/";

(()=>{
 const main=document.querySelector('#article-main');if(!main)return;const restricted=main.dataset.membersOnly==='true',initialAction=restricted?'read':'state';
 const id=main.dataset.articleId,site=new URL(MEMBER_SITE),frame=document.createElement('iframe'),state=crypto.randomUUID(),embedded=parent!==window;
 const bridge=new URL('article-access.html',site);bridge.searchParams.set('article',id);frame.src=bridge.href;frame.hidden=true;frame.title='Перевірка входу';
 const login=new URL('quizzes.html',site);login.searchParams.set('return','article-access.html?article='+id);
 const body=document.querySelector('#article-content'),nav=document.querySelector('#article-navigation'),styles=document.querySelector('#article-content-styles');
 let sequence=0,expiry,timer;
 function lock(message='Увійдіть через Google, щоб прочитати статтю.'){
  clearTimeout(expiry);window.dispatchEvent(new CustomEvent('techhub-profile-changed',{detail:{user:null}}));if(!restricted)return;main.dataset.memberState='locked';body.replaceChildren();nav.replaceChildren();if(styles)styles.textContent='';
  const box=document.createElement('section');box.className='member-gate';box.id='member-gate';
  const icon=document.createElement('span');icon.className='member-lock';icon.textContent='🔒';icon.setAttribute('aria-hidden','true');
  const heading=document.createElement('h2');heading.textContent='Стаття для зареєстрованих користувачів';
  const status=document.createElement('p');status.id='member-status';status.textContent=message;
  const link=document.createElement('a');link.className='quiz-link';link.href=login.href;link.textContent='Увійти через Google';box.append(icon,heading,status,link);body.append(box);
  const profile=document.querySelector('[data-auth-profile]');if(profile)profile.hidden=true;
 }
 function expires(value){clearTimeout(expiry);const remaining=Date.parse(value)-Date.now();if(!Number.isFinite(remaining)||remaining<=0){lock();return;}expiry=setTimeout(()=>lock(),Math.min(remaining,2147483647));}
 function ask(action=initialAction){
  if(action==='read'||action==='logout')lock(action==='read'?'Перевіряємо вхід…':undefined);
  sequence++;(embedded?parent:frame.contentWindow)?.postMessage({type:'jokerhub-access-request',articleId:id,state,sequence,action},site.origin);
  clearTimeout(timer);timer=setTimeout(()=>{if(main.dataset.memberState==='locked')lock('Не вдалося перевірити вхід. Увійдіть або оновіть сторінку.');},12000);
 }
 window.addEventListener('message',event=>{
  const data=event.data;if(event.origin!==site.origin||event.source!==(embedded?parent:frame.contentWindow)||data?.state!==state||data.sequence!==sequence||data.articleId!==id)return;
  if(data.type==='jokerhub-site-first-party'&&!embedded){location.replace(bridge.href+location.hash);return;}
  if(data.type==='jokerhub-site-state'){
   if(!['light','dark'].includes(data.theme))return;
   window.dispatchEvent(new CustomEvent('techhub-apply-theme',{detail:{theme:data.theme}}));
   let user=null;if(data.user&&typeof data.user.displayName==='string'&&Date.parse(data.expiresAt)>Date.now()){let avatarUrl=null;try{const url=new URL(data.user.avatarUrl);if(['https:','http:'].includes(url.protocol))avatarUrl=url.href;}catch{}user={displayName:data.user.displayName,avatarUrl};}
   window.dispatchEvent(new CustomEvent('techhub-profile-changed',{detail:{user}}));if(user)expires(data.expiresAt);return;
  }
  clearTimeout(timer);
  if(data.type==='jokerhub-access-locked'){lock();return;}
  if(data.type==='jokerhub-access-error'){lock('Стаття тимчасово недоступна. Спробуйте ще раз.');return;}
  if(data.type==='jokerhub-access-checked'){expires(data.expiresAt);return;}
  if(data.type!=='jokerhub-access-content'||data.article?.articleId!==id||typeof data.article.contentHtml!=='string'||typeof data.article.contentCss!=='string'||!Array.isArray(data.article.toc))return;
  body.innerHTML=data.article.contentHtml;if(styles)styles.textContent=data.article.contentCss;nav.replaceChildren();
  for(const item of data.article.toc){const link=document.createElement('a');link.href='#'+encodeURIComponent(item.id);link.textContent=item.title;nav.append(link);}
  main.dataset.memberState='open';expires(data.expiresAt);
  if(location.hash){try{document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();}catch{}}
  window.dispatchEvent(new CustomEvent('techhub-member-content-loaded',{detail:{articleId:id}}));
 });
 if(restricted)lock('Перевіряємо вхід…');
 if(embedded){ask();}else{frame.addEventListener('load',()=>ask());document.body.append(frame);}
 if(embedded)document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(link&&!link.getAttribute('href').startsWith('#')&&!link.target)link.target='_top';},{capture:true});
 window.addEventListener('techhub-theme-changed',event=>{if(!['light','dark'].includes(event.detail?.theme))return;(embedded?parent:frame.contentWindow)?.postMessage({type:'jokerhub-access-request',articleId:id,state,sequence,action:'theme',theme:event.detail.theme},site.origin);});
 const resume=()=>ask(!restricted?'state':main.dataset.memberState==='open'?'check':'read');
 window.addEventListener('focus',resume);window.addEventListener('pageshow',event=>{if(event.persisted)resume();});window.addEventListener('pagehide',()=>lock());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resume();});
 document.querySelector('[data-auth-logout]')?.addEventListener('click',()=>ask('logout'),{capture:true});
 setInterval(()=>{if(document.visibilityState==='visible'&&(!restricted||main.dataset.memberState==='open'))ask('check');},30000);
})();
window.dispatchEvent(new CustomEvent('techhub-article-loaded',{detail:{articleId:document.querySelector('#article-main').dataset.articleId}}));