
const root=document.documentElement, themeToggle=document.querySelector('#theme-toggle');
try{themeToggle.checked=localStorage.getItem('article-theme')==='light'}catch{}
themeToggle.addEventListener('change',()=>{try{localStorage.setItem('article-theme',themeToggle.checked?'light':'dark')}catch{}});

const search=document.querySelector('#search'),cards=[...document.querySelectorAll('.card')];
search.addEventListener('input',()=>{const query=search.value.trim().toLocaleLowerCase('uk');let count=0;for(const card of cards){card.hidden=!card.dataset.search.toLocaleLowerCase('uk').includes(query);if(!card.hidden)count++;}document.querySelector('#count').textContent=count;document.querySelector('.empty').hidden=count>0;});
