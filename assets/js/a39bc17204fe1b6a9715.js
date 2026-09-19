(()=>{
const API="https://techhub-quiz-api.bolotin-denis.workers.dev",KEY='techhub-auth-v1',box=document.querySelector('[data-auth-profile]');if(!box)return;
const avatar=box.querySelector('[data-auth-avatar]'),fallback=box.querySelector('[data-auth-fallback]'),name=box.querySelector('[data-auth-name]'),logout=box.querySelector('[data-auth-logout]');let current=null;
function initials(value){return String(value||'?').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toLocaleUpperCase('uk')||'?'}
function showAvatar(value){fallback.textContent=initials(name.textContent);fallback.hidden=false;avatar.hidden=true;avatar.removeAttribute('src');if(!value)return;avatar.onload=()=>{avatar.hidden=false;fallback.hidden=true};avatar.onerror=()=>{avatar.hidden=true;fallback.hidden=false};avatar.src=value;}
function show(value){current=value;if(!value?.sessionToken){box.hidden=true;return;}name.textContent=value.leaderboardName||value.user?.displayName||'Користувач';showAvatar(value.user?.avatarUrl);box.hidden=false;}
async function validate(){let saved;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}if(!saved?.sessionToken){show(null);return;}try{const response=await fetch(API+'/auth/me',{headers:{Authorization:'Bearer '+saved.sessionToken}});if(!response.ok)throw Error();const data=await response.json();saved={...saved,expiresAt:data.expiresAt,user:data.user};localStorage.setItem(KEY,JSON.stringify(saved));show(saved);}catch{localStorage.removeItem(KEY);show(null);}}
window.addEventListener('techhub-auth-changed',event=>show(event.detail));
logout.addEventListener('click',async()=>{if(current?.sessionToken)try{await fetch(API+'/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+current.sessionToken}})}catch{}localStorage.removeItem(KEY);show(null);if(/(?:^|\/)(?:quizzes|quiz-[^/]+|leaderboard)\.html$/.test(location.pathname))location.href='quizzes.html';});
validate();
})();