
const root=document.documentElement, themeToggle=document.querySelector('#theme-toggle');
try{themeToggle.checked=localStorage.getItem('article-theme')==='light'}catch{}
themeToggle.addEventListener('change',()=>{try{localStorage.setItem('article-theme',themeToggle.checked?'light':'dark')}catch{}});


const ADMIN={endpoint:"https://techhub-quiz-api.bolotin-denis.workers.dev",key:'techhub-auth-v1'},statusBox=document.querySelector('#admin-status'),list=document.querySelector('#admin-list');let auth=null,articles=[],busy=false;
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
function render(){list.replaceChildren();if(!articles.length){const empty=document.createElement('p');empty.className='admin-empty';empty.textContent='Статей не знайдено.';list.append(empty);return;}articles.forEach((article,index)=>{const row=document.createElement('article');row.className='admin-row'+(article.status==='hidden'?' is-hidden':'');const number=document.createElement('span');number.className='admin-number';number.textContent=article.number;const title=document.createElement('div');title.className='admin-title';const strong=document.createElement('strong');strong.textContent=article.title;const link=document.createElement('a');link.href=article.href;link.textContent='Відкрити статтю ↗';link.target='_blank';link.rel='noopener';title.append(strong,link,dateControls(article));const badge=document.createElement('span');badge.className='admin-badge';badge.textContent=article.status==='published'?'Опубліковано':'Приховано';if(article.status==='published'&&article.publishedAt&&new Date(article.publishedAt)>new Date())badge.textContent='\u0417\u0430\u043f\u043b\u0430\u043d\u043e\u0432\u0430\u043d\u043e';const controls=document.createElement('div');controls.className='admin-controls';const up=button('↑',()=>move(index,-1));up.title='Перемістити вище';up.disabled=busy||index===0;const down=button('↓',()=>move(index,1));down.title='Перемістити нижче';down.disabled=busy||index===articles.length-1;const toggle=button(article.status==='published'?'Приховати':'Опублікувати',()=>toggleStatus(article),'admin-toggle');toggle.disabled=busy;controls.append(up,down,toggle);row.append(number,title,badge,controls);list.append(row);});}
async function toggleStatus(article){if(busy)return;busy=true;render();const previous=article.status,next=previous==='published'?'hidden':'published';try{const result=await api('/admin/articles/'+encodeURIComponent(article.articleId),{method:'PATCH',body:JSON.stringify({status:next})});article.status=result.status;article.publishedAt=result.publishedAt;message(article.number+(next==='published'?' опубліковано.':' приховано.'));}catch{article.status=previous;message('Не вдалося змінити статус статті '+article.number+'.',true);}finally{busy=false;render();}}
async function move(index,direction){if(busy)return;const target=index+direction;if(target<0||target>=articles.length)return;busy=true;[articles[index],articles[target]]=[articles[target],articles[index]];render();try{await api('/admin/articles',{method:'PUT',body:JSON.stringify({articleIds:articles.map(article=>article.articleId)})});message('Порядок статей збережено.');}catch{[articles[index],articles[target]]=[articles[target],articles[index]];message('Не вдалося зберегти порядок.',true);}finally{busy=false;render();}}
async function init(){auth=storedAuth();if(!auth?.sessionToken){message('Спочатку увійдіть через Google на сторінці тестів.',true);return;}try{const me=await api('/auth/me');if(me.user.role!=='admin'){message('Ця сторінка доступна лише адміністратору.',true);return;}const result=await api('/admin/articles');articles=result.articles;message('Завантажено статей: '+articles.length+'.');render();}catch(error){message(error.status===403?'Ця сторінка доступна лише адміністратору.':'Не вдалося завантажити керування статтями.',true);}}
init();
