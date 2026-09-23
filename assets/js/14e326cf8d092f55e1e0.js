
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
  document.addEventListener('DOMContentLoaded', () => {
    restoreScroll();
  });
})();
