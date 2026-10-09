const QUIZ_STATS_API="https://techhub-quiz-api.bolotin-denis.workers.dev";

function quizMetrics(host,quiz,{reading=false}={}){
 const icons={completed:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',views:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',share:'<path d="m14 3 7 7-7 7v-5c-6 0-9 3-11 8 0-8 3-12 11-12Z"/>'};
 const svg=kind=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[kind]+'</svg>';
 const row=document.createElement('div');row.className='quiz-metrics';host.append(row);
 const values={};for(const [kind,label,value] of [['completed','Завершені проходження',quiz.completedCount],['views','Перегляди',quiz.viewCount]]){
  const metric=document.createElement('span'),text=document.createElement('span');metric.className='quiz-metric';metric.title=label;metric.innerHTML=svg(kind);metric.append(text);row.append(metric);values[kind]={metric,text,label};
 }
 const share=document.createElement('button'),note=document.createElement('span');share.type='button';share.className='quiz-share';share.innerHTML=svg('share');share.title='Поділитися';share.setAttribute('aria-label','Поділитися тестом');note.className='quiz-metrics-note';note.setAttribute('role','status');row.append(share,note);
 let lastViews=null;
 function paint(data){if(data.viewCount!=null){lastViews=Math.max(lastViews||0,data.viewCount);data={...data,viewCount:lastViews};}for(const [kind,key] of [['completed','completedCount'],['views','viewCount']]){const value=data[key],item=values[kind];item.text.textContent=value==null?'—':new Intl.NumberFormat('uk',{notation:'compact',maximumFractionDigits:1}).format(value);item.metric.setAttribute('aria-label',item.label+': '+(value??'тимчасово недоступно'));}}paint(quiz);
 const url=new URL('quiz.html?quiz='+encodeURIComponent(quiz.quiz_id),new URL('.',location.href)).href;
 share.addEventListener('click',async()=>{if(share.disabled)return;share.disabled=true;note.textContent='';try{
  if(typeof navigator.share==='function'){try{await navigator.share({title:quiz.title,url});return;}catch(error){if(error.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(url);note.textContent='Посилання скопійовано';}catch{note.textContent='Скопіюйте посилання: '+url;}
 }finally{share.disabled=false;}});
 if(reading){
  fetch(QUIZ_STATS_API+'/quizzes/'+encodeURIComponent(quiz.quiz_id)+'/stats').then(r=>{if(!r.ok)throw Error();return r.json();}).then(paint).catch(()=>{});
  let sent=false;async function count(){if(sent||document.visibilityState!=='visible')return;sent=true;document.removeEventListener('visibilitychange',count);
   try{let visitorId;try{visitorId=localStorage.getItem('techhub-visitor-v1');if(!visitorId){visitorId=crypto.randomUUID();localStorage.setItem('techhub-visitor-v1',visitorId);}}catch{visitorId=crypto.randomUUID();}
    const r=await fetch(QUIZ_STATS_API+'/quizzes/'+encodeURIComponent(quiz.quiz_id)+'/views',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})});if(r.ok)paint(await r.json());
   }catch{}
  }if(document.visibilityState==='visible')count();else document.addEventListener('visibilitychange',count);
 }
}
quizMetrics(document.querySelector("#quiz-page-metrics"),{quiz_id:"016-020",title:document.title},{reading:true});