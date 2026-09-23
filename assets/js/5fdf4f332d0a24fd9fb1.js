
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

const CATALOG={endpoint:"https://techhub-quiz-api.bolotin-denis.workers.dev",key:'techhub-auth-v1'},search=document.querySelector('#search'),grid=document.querySelector('#article-grid'),pagination=document.querySelector('#pagination'),empty=document.querySelector('.empty'),errorBox=document.querySelector('#catalog-error'),adminLink=document.querySelector('#admin-link'),pageSize=9;let currentPage=Math.max(1,Number.parseInt(new URL(location.href).searchParams.get('page')||'1',10)||1),articles=[];
function savedAuth(){try{return JSON.parse(localStorage.getItem(CATALOG.key)||'null');}catch{return null;}}
function createCard(article){const card=document.createElement('div'),articleLink=document.createElement('a');articleLink.className='card-link';card.className='card'+(article.status==='hidden'?' is-hidden':'');articleLink.href=article.href;card.dataset.search=[article.number,article.title,article.description,article.href].join(' ');const image=document.createElement('img');image.src=article.imageUrl;image.alt='Обкладинка статті '+article.number;image.loading='lazy';image.width=1600;image.height=900;const copy=document.createElement('div');copy.className='card-copy';const meta=document.createElement('span');meta.className='card-meta';meta.textContent='СТАТТЯ / '+article.number;const title=document.createElement('h3');title.textContent=article.title;copy.append(meta,title);if(article.status==='hidden'){const badge=document.createElement('span');badge.className='card-status';badge.textContent='ПРИХОВАНО';copy.append(badge);}const more=document.createElement('span');more.className='card-more';more.textContent='Читати статтю ↗';copy.append(more);articleLink.append(image,copy);const heart=document.createElement('div');articleHeart(heart,{endpoint:CATALOG.endpoint,id:article.articleId,href:article.href,indicator:true,initial:article});card.append(articleLink,heart);return card;}
function renderCatalog({updateUrl=true}={}){const query=search.value.trim().toLocaleLowerCase('uk'),matches=articles.filter(article=>[article.number,article.title,article.description,article.href].join(' ').toLocaleLowerCase('uk').includes(query)),pages=Math.max(1,Math.ceil(matches.length/pageSize));currentPage=Math.min(currentPage,pages);grid.replaceChildren(...matches.slice((currentPage-1)*pageSize,currentPage*pageSize).map(createCard));document.querySelector('#count').textContent=matches.length;document.querySelector('#material-count').textContent=articles.length+' матеріалів';empty.hidden=matches.length>0;pagination.replaceChildren();pagination.hidden=pages<=1;if(pages>1){const add=(label,page,disabled=false,current=false)=>{const button=document.createElement('button');button.className='page-button';button.type='button';button.textContent=label;button.disabled=disabled;if(current)button.setAttribute('aria-current','page');button.addEventListener('click',()=>{currentPage=page;renderCatalog();document.querySelector('#catalog-title').scrollIntoView({behavior:'smooth',block:'start'});});pagination.append(button);};add('←',currentPage-1,currentPage===1);for(let page=1;page<=pages;page++)add(String(page),page,false,page===currentPage);add('→',currentPage+1,currentPage===pages);}if(updateUrl){const url=new URL(location.href);if(currentPage>1)url.searchParams.set('page',String(currentPage));else url.searchParams.delete('page');history.replaceState(null,'',url);}}
async function request(path,token){const response=await fetch(CATALOG.endpoint+path,{headers:token?{Authorization:'Bearer '+token}:{}});if(!response.ok)throw Error(String(response.status));return response.json();}
async function loadCatalog(){try{const auth=savedAuth(),token=auth?.sessionToken;let admin=false;if(token){try{const me=await request('/auth/me',token);admin=me.user.role==='admin';}catch{admin=false;}}const result=await request(admin?'/admin/articles':'/articles',token||null);articles=result.articles||[];adminLink.hidden=!admin;errorBox.hidden=true;renderCatalog({updateUrl:false});}catch{articles=[];grid.replaceChildren();pagination.hidden=true;empty.hidden=true;document.querySelector('#count').textContent='0';document.querySelector('#material-count').textContent='0 матеріалів';errorBox.hidden=false;}}
search.addEventListener('input',()=>{currentPage=1;renderCatalog();});window.addEventListener('popstate',()=>{currentPage=Math.max(1,Number.parseInt(new URL(location.href).searchParams.get('page')||'1',10)||1);renderCatalog({updateUrl:false});});loadCatalog();
