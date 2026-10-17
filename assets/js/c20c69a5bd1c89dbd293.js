
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

const isScheduledArticle=article=>article&&article.status==='published'&&Boolean(article.publishedAt)&&new Date(article.publishedAt)>new Date();
const CATALOG={endpoint:"https://techhub-quiz-api.bolotin-denis.workers.dev",key:'techhub-auth-v1'};
function savedAuth(){try{return JSON.parse(localStorage.getItem(CATALOG.key)||'null');}catch{return null;}}
function createCard(article){const locked=article.locked===true;const card=document.createElement('div'),articleLink=document.createElement('a');articleLink.className='card-link';const scheduled=isScheduledArticle(article);card.className='card'+((article.status==='hidden'||scheduled)?' is-hidden':'');articleLink.href='article-access.html?article='+article.articleId;card.dataset.search=[article.number,article.title,article.description,article.href].join(' ');const image=document.createElement('img');image.src=article.imageUrl;image.alt='Обкладинка статті '+article.number;image.loading='lazy';image.width=1600;image.height=900;const copy=document.createElement('div');copy.className='card-copy';const meta=document.createElement('span');meta.className='card-meta';meta.textContent='СТАТТЯ / '+article.number;const title=document.createElement('h3');title.textContent=article.title;copy.append(meta,title);if(article.status==='hidden'||scheduled){const badge=document.createElement('span');badge.className='card-status';badge.textContent=article.status==='hidden'?'ПРИХОВАНО':'ЗАПЛАНОВАНО';copy.append(badge);}articleLink.append(image,copy);if(locked){card.classList.add('is-locked');const login=new URL('quizzes.html',location.href);login.searchParams.set('return','article-access.html?article='+article.articleId);articleLink.href=login.href;articleLink.setAttribute('aria-label',article.title+' — увійдіть, щоб читати');const overlay=document.createElement('div');overlay.className='member-card-overlay';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/></svg><span>Увійдіть, щоб читати</span>';articleLink.append(overlay);}const tools=document.createElement('div');articleTools(tools,{article,endpoint:CATALOG.endpoint});card.append(articleLink,tools);return card;}
function materialCount(count){const n=Math.max(0,Math.trunc(Number(count)||0)),last=n%10,lastTwo=n%100;return n+' '+(last===1&&lastTwo!==11?'матеріал':last>=2&&last<=4&&(lastTwo<12||lastTwo>14)?'матеріали':'матеріалів');}
async function request(path,token){const response=await fetch(CATALOG.endpoint+path,{headers:token?{Authorization:'Bearer '+token}:{}});if(!response.ok)throw Error(String(response.status));return response.json();}

const SAFE_COVER=/^assets\/groups\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp)$/;

function initHomeVideo(){
 const intro=document.querySelector('.hub-intro');if(!intro)return;
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const layer=document.createElement('div');layer.className='home-video-layer';layer.setAttribute('aria-hidden','true');
 const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';video.setAttribute('muted','');video.setAttribute('playsinline','');video.disablePictureInPicture=true;video.tabIndex=-1;layer.append(video);intro.prepend(layer);
 const button=document.createElement('button');button.type='button';button.className='home-video-toggle';button.textContent='Відтворити фон';button.setAttribute('aria-label','Відтворити фонове відео');intro.append(button);
 let wanted=false,manual=false,inView=intro.getBoundingClientRect().bottom>0&&intro.getBoundingClientRect().top<window.innerHeight,loadingTimer,stallTimer;
 function clearTimers(){clearTimeout(loadingTimer);clearTimeout(stallTimer);}
 function showPlaying(playing){layer.classList.toggle('is-playing',playing);button.textContent=playing?'Зупинити фон':'Відтворити фон';button.setAttribute('aria-label',playing?'Зупинити фонове відео':'Відтворити фонове відео');}
 function pause(){clearTimers();video.pause();showPlaying(false);}
 function stop(){wanted=false;pause();video.removeAttribute('src');video.load();}
 function fastConnection(){return !!connection&&!connection.saveData&&connection.effectiveType==='4g'&&(!Number.isFinite(connection.downlink)||connection.downlink>=2.5)&&(!Number.isFinite(connection.rtt)||connection.rtt<=300);}
 function play(){
  if(!wanted||!inView||document.hidden)return;
  if(!video.hasAttribute('src')){video.src='assets/videos/joker-lab-background-v1.mp4';video.load();}
  clearTimers();loadingTimer=setTimeout(stop,6000);
  const promise=video.play();if(promise)promise.catch(()=>{if(wanted&&inView&&!document.hidden)stop();});
 }
 video.addEventListener('playing',()=>{clearTimers();if(wanted&&inView&&!document.hidden)showPlaying(true);else pause();});
 video.addEventListener('error',stop);
 video.addEventListener('waiting',()=>{if(wanted){clearTimeout(stallTimer);stallTimer=setTimeout(stop,3000);}});
 button.addEventListener('click',()=>{manual=true;if(wanted){stop();}else{wanted=true;play();}});
 function auto(){if(manual)return;wanted=!motion.matches&&fastConnection();if(wanted)play();else stop();}
 connection?.addEventListener?.('change',()=>{manual=false;auto();});motion.addEventListener('change',()=>{manual=false;auto();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else play();});
 if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)play();else pause();}).observe(intro);
 window.addEventListener('pagehide',pause);window.addEventListener('pageshow',()=>play());auto();
}
const rail=document.querySelector('#article-rail'),previous=document.querySelector('#rail-prev'),next=document.querySelector('#rail-next');
function updateRail(){previous.disabled=rail.scrollLeft<=1;next.disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-1;}
function shiftRail(direction){rail.scrollBy({left:direction*rail.clientWidth,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function groupCard(group){const link=document.createElement('a');link.className='group-card';link.href='topics.html?group='+encodeURIComponent(group.slug);
 const cover=document.createElement('div');cover.className='group-cover group-placeholder';cover.textContent='IT /';
 if(SAFE_COVER.test(group.coverImageUrl||'')){const image=document.createElement('img');image.className='group-cover';image.src=group.coverImageUrl;image.alt='Обкладинка напрямку «'+group.title+'»';image.loading='lazy';image.width=1600;image.height=900;image.addEventListener('error',()=>{image.replaceWith(cover);},{once:true});link.append(image);}else link.append(cover);
 const copy=document.createElement('div');copy.className='group-copy';const title=document.createElement('h3');title.textContent=group.title;title.title=group.title;const count=document.createElement('span');count.className='group-count';const total=Number(group.articleCount)||0,last=total%10,hundred=total%100;count.textContent=total+' '+(hundred>=11&&hundred<=14?'статей':last===1?'стаття':last>=2&&last<=4?'статті':'статей');copy.append(title,count);link.append(copy);return link;}
let homeArticlesRequest=0;
async function loadHomeArticles(publicOnly=false){const generation=++homeArticlesRequest;rail.replaceChildren();updateRail();document.querySelector('#admin-link').hidden=true;document.querySelector('#catalog-error').hidden=true;document.querySelector('#articles-empty').hidden=true;document.querySelector('#material-count').textContent='Завантажуємо статті…';try{const token=publicOnly?null:savedAuth()?.sessionToken;let admin=false;if(token){try{const me=await request('/auth/me',token);admin=me.user.role==='admin';}catch{}}if(generation!==homeArticlesRequest)return;let result;if(admin){try{result=await request('/admin/articles',token);}catch{admin=false;}}if(!result)result=await request('/articles',token);if(generation!==homeArticlesRequest)return;const visible=(result.articles||[]).filter(article=>admin||(article.status!=='hidden'&&!isScheduledArticle(article)));rail.replaceChildren(...visible.map(createCard));document.querySelector('#admin-link').hidden=!admin;document.querySelector('#material-count').textContent=materialCount(visible.length);document.querySelector('#articles-empty').hidden=visible.length>0;updateRail();}catch{if(generation!==homeArticlesRequest)return;document.querySelector('#catalog-error').hidden=false;document.querySelector('#material-count').textContent='Каталог недоступний';}}
async function loadHomeGroups(){try{const result=await request('/article-groups');const groups=result.groups||[];document.querySelector('#group-grid').replaceChildren(...groups.map(groupCard));document.querySelector('#groups-empty').hidden=groups.length>0;}catch{document.querySelector('#groups-error').hidden=false;}finally{document.querySelector('#groups-loading').hidden=true;}}
function initHome(){initHomeVideo();previous.addEventListener('click',()=>shiftRail(-1));next.addEventListener('click',()=>shiftRail(1));rail.addEventListener('scroll',updateRail,{passive:true});rail.addEventListener('keydown',event=>{if(event.target!==rail)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();shiftRail(event.key==='ArrowRight'?1:-1);}});window.addEventListener('resize',updateRail);if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateRail).observe(rail);window.addEventListener('techhub-auth-changed',()=>loadHomeArticles());window.addEventListener('storage',event=>{if(event.key==='techhub-auth-v1'||event.key===null)loadHomeArticles();});document.querySelector('[data-auth-logout]')?.addEventListener('click',()=>loadHomeArticles(true),{capture:true});loadHomeArticles();loadHomeGroups();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initHome,{once:true});else initHome();
