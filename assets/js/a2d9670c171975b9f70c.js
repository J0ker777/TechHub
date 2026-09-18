
const root=document.documentElement, themeToggle=document.querySelector('#theme-toggle');
try{themeToggle.checked=localStorage.getItem('article-theme')==='light'}catch{}
themeToggle.addEventListener('change',()=>{try{localStorage.setItem('article-theme',themeToggle.checked?'light':'dark')}catch{}});
const menu=document.querySelector('.sidebar details'), mobile=matchMedia('(max-width:900px)');
function fitMenu(){menu.open=!mobile.matches}fitMenu();if(mobile.addEventListener)mobile.addEventListener('change',fitMenu);else if(mobile.addListener)mobile.addListener(fitMenu);
const links=[...document.querySelectorAll('.sidebar a')], headings=[...document.querySelectorAll('.article h2')];
let scheduled=false;function updateReading(){scheduled=false;const total=root.scrollHeight-innerHeight;document.querySelector('.reading-progress').style.width=(total>0?Math.min(100,Math.max(0,scrollY/total*100)):100)+'%';let active=null;for(const h of headings){if(h.getBoundingClientRect().top<=160)active=h.id;else break}for(const link of links){const selected=link.hash==='#'+active;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')}}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(updateReading)}}addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);updateReading();
for(const link of links)link.addEventListener('click',()=>{if(mobile.matches)menu.open=false});
const status=document.querySelector('.status');let statusTimer;function announce(text){status.textContent=text;clearTimeout(statusTimer);statusTimer=setTimeout(()=>status.textContent='',2500)}
async function copyText(text){if(navigator.clipboard&&isSecureContext){try{await navigator.clipboard.writeText(text);return}catch{}}const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);field.select();let ok;try{ok=document.execCommand('copy')}finally{field.remove()}if(!ok)throw Error('copy');}
for(const button of document.querySelectorAll('.copy'))button.addEventListener('click',async()=>{try{await copyText(button.closest('.code-block').querySelector('code').textContent);button.textContent='Скопійовано';announce('Код скопійовано');setTimeout(()=>button.textContent='Копіювати',1800)}catch{announce('Виділіть код і скопіюйте його вручну')}});
