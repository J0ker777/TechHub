(()=>{
const id=document.body.dataset.articleRedirect,target=new URL('article.html',location.href);
const query=new URLSearchParams(location.search);query.set('id',id);target.search=query.toString();target.hash=location.hash;
document.querySelector('[data-article-target]').href=target.href;location.replace(target.href);
})();