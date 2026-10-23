(function(){
 var b=document.querySelector('.burger'),n=document.getElementById('nav');
 if(b&&n){b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Close menu':'Open menu');});
  n.addEventListener('click',function(e){if(e.target.tagName==='A'){n.classList.remove('open');b.setAttribute('aria-expanded','false');}});}
 var els=document.querySelectorAll('.card,.gal img,.fact,.steps2 li,.photo');
 if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.1});
  els.forEach(function(el){el.classList.add('reveal');io.observe(el);});}
})();
