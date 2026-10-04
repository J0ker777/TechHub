
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

const isScheduledArticle=article=>article&&article.status==='published'&&Boolean(article.publishedAt)&&new Date(article.publishedAt)>new Date();
const CATALOG={endpoint:"https://techhub-quiz-api.bolotin-denis.workers.dev",key:'techhub-auth-v1'};
function savedAuth(){try{return JSON.parse(localStorage.getItem(CATALOG.key)||'null');}catch{return null;}}
function createCard(article){const card=document.createElement('div'),articleLink=document.createElement('a');articleLink.className='card-link';const scheduled=isScheduledArticle(article);card.className='card'+((article.status==='hidden'||scheduled)?' is-hidden':'');articleLink.href=article.href;card.dataset.search=[article.number,article.title,article.description,article.href].join(' ');const image=document.createElement('img');image.src=article.imageUrl;image.alt='Обкладинка статті '+article.number;image.loading='lazy';image.width=1600;image.height=900;const copy=document.createElement('div');copy.className='card-copy';const meta=document.createElement('span');meta.className='card-meta';meta.textContent='СТАТТЯ / '+article.number;const title=document.createElement('h3');title.textContent=article.title;copy.append(meta,title);if(article.status==='hidden'||scheduled){const badge=document.createElement('span');badge.className='card-status';badge.textContent=article.status==='hidden'?'ПРИХОВАНО':'ЗАПЛАНОВАНО';copy.append(badge);}const actions=document.createElement('div');actions.className='card-actions';const more=document.createElement('a');more.href=article.href;more.className='card-more';more.textContent='Читати статтю ↗';articleLink.append(image,copy);const heart=document.createElement('div');articleHeart(heart,{endpoint:CATALOG.endpoint,id:article.articleId,href:article.href,indicator:true,initial:article});actions.append(more,heart);card.append(articleLink,actions);return card;}
function materialCount(count){const n=Math.max(0,Math.trunc(Number(count)||0)),last=n%10,lastTwo=n%100;return n+' '+(last===1&&lastTwo!==11?'матеріал':last>=2&&last<=4&&(lastTwo<12||lastTwo>14)?'матеріали':'матеріалів');}
async function request(path,token){const response=await fetch(CATALOG.endpoint+path,{headers:token?{Authorization:'Bearer '+token}:{}});if(!response.ok)throw Error(String(response.status));return response.json();}

const SAFE_COVER=/^assets\/groups\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp)$/;

const rail=document.querySelector('#article-rail'),previous=document.querySelector('#rail-prev'),next=document.querySelector('#rail-next');
function updateRail(){previous.disabled=rail.scrollLeft<=1;next.disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-1;}
function shiftRail(direction){rail.scrollBy({left:direction*rail.clientWidth,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function groupCard(group){const link=document.createElement('a');link.className='group-card';link.href='topics.html?group='+encodeURIComponent(group.slug);
 const cover=document.createElement('div');cover.className='group-cover group-placeholder';cover.textContent='IT /';
 if(SAFE_COVER.test(group.coverImageUrl||'')){const image=document.createElement('img');image.className='group-cover';image.src=group.coverImageUrl;image.alt='Обкладинка напрямку «'+group.title+'»';image.loading='lazy';image.width=1600;image.height=900;image.addEventListener('error',()=>{image.replaceWith(cover);},{once:true});link.append(image);}else link.append(cover);
 const copy=document.createElement('div');copy.className='group-copy';const count=document.createElement('span');count.className='card-meta';count.textContent=materialCount(group.articleCount);const title=document.createElement('h3');title.textContent=group.title;const description=document.createElement('p');description.textContent=group.description;const more=document.createElement('span');more.className='card-more';more.textContent='Дослідити напрямок ↗';copy.append(count,title,description,more);link.append(copy);return link;}
async function loadHomeArticles(){try{const result=await request('/articles',savedAuth()?.sessionToken);const visible=(result.articles||[]).filter(article=>article.status!=='hidden'&&!isScheduledArticle(article));rail.replaceChildren(...visible.map(createCard));document.querySelector('#material-count').textContent=materialCount(visible.length);document.querySelector('#articles-empty').hidden=visible.length>0;updateRail();}catch{document.querySelector('#catalog-error').hidden=false;document.querySelector('#material-count').textContent='Каталог недоступний';}}
async function loadHomeGroups(){try{const result=await request('/article-groups');const groups=result.groups||[];document.querySelector('#group-grid').replaceChildren(...groups.map(groupCard));document.querySelector('#groups-empty').hidden=groups.length>0;}catch{document.querySelector('#groups-error').hidden=false;}finally{document.querySelector('#groups-loading').hidden=true;}}
function initHome(){previous.addEventListener('click',()=>shiftRail(-1));next.addEventListener('click',()=>shiftRail(1));rail.addEventListener('scroll',updateRail,{passive:true});rail.addEventListener('keydown',event=>{if(event.target!==rail)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();shiftRail(event.key==='ArrowRight'?1:-1);}});window.addEventListener('resize',updateRail);if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateRail).observe(rail);loadHomeArticles();loadHomeGroups();const token=savedAuth()?.sessionToken;if(token)request('/auth/me',token).then(me=>{document.querySelector('#admin-link').hidden=me.user.role!=='admin';}).catch(()=>{});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initHome,{once:true});else initHome();
