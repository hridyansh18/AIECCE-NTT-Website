(function(){
 'use strict';
 var form=document.getElementById('admForm'); if(!form) return;
 var btn=document.getElementById('submitBtn'),status=document.getElementById('status');
 var loadedAt=Date.now(), busy=false;
 var rules={
  fullName:function(v){return /^[A-Za-z][A-Za-z .'-]{1,79}$/.test(v)||'Enter your full name (letters only, 2-80 characters).';},
  guardianName:function(v){return /^[A-Za-z][A-Za-z .'-]{1,79}$/.test(v)||"Enter father's or guardian's name (letters only).";},
  email:function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)||'Enter a valid email address.';},
  mobile:function(v){return /^[6-9]\d{9}$/.test(v)||'Enter a 10-digit Indian mobile number starting with 6-9.';},
  dob:function(v){if(!v)return 'Select your date of birth.';var d=new Date(v),y=(Date.now()-d)/31557600000;return (y>=14&&y<=80)||'Age must be between 14 and 80 years.';},
  gender:req('Select gender.'),state:req('Select your state.'),
  city:function(v){return v.length>=2||'Enter your city.';},
  address:function(v){return v.length>=10||'Enter your full address (at least 10 characters).';},
  qualification:req('Select your qualification.'),course:req('Select a course.'),duration:req('Select course duration.'),language:req('Select a language.')
 };
 function req(m){return function(v){return !!v||m;};}
 function setErr(name,msg){var el=document.getElementById(name),e=document.getElementById('e-'+name);if(!el||!e)return;e.textContent=msg||'';var f=el.closest('.f');f&&f.classList.toggle('invalid',!!msg);el.setAttribute('aria-invalid',msg?'true':'false');if(msg)el.setAttribute('aria-describedby','e-'+name);}
 function check(name){var el=form.elements[name],v=(el.value||'').trim();var r=rules[name](v);setErr(name,r===true?'':r);return r===true;}
 function show(cls,msg){status.className='status show '+cls;status.textContent=msg;}
 Object.keys(rules).forEach(function(n){var el=form.elements[n];el.addEventListener('blur',function(){check(n);});});
 var course=form.elements.course,dur=form.elements.duration;
 course.addEventListener('change',function(){var m={0:'1 Year',1:'2 Years',2:'Pre-Primary Course'};var i=course.selectedIndex-1;if(m[i])dur.value=m[i];});
 form.addEventListener('submit',function(ev){
  ev.preventDefault(); if(busy)return;
  var ok=true,first=null;
  Object.keys(rules).forEach(function(n){if(!check(n)){ok=false;first=first||form.elements[n];}});
  var c=form.elements.consent;if(!c.checked){document.getElementById('e-consent').textContent='You must accept the privacy policy.';ok=false;first=first||c;}else document.getElementById('e-consent').textContent='';
  if(!ok){show('fail','Please fix the highlighted fields.');first&&first.focus();return;}
  if(typeof GOOGLE_SCRIPT_URL==='undefined'||GOOGLE_SCRIPT_URL.indexOf('https://script.google.com/')!==0){
   show('fail','Online submission is not configured yet. Please call 9644119994 or use the WhatsApp button.');return;}
  var data={};['fullName','guardianName','email','mobile','dob','gender','state','city','address','qualification','course','duration','language','centre','centreCode','message','website'].forEach(function(k){data[k]=(form.elements[k].value||'').trim();});
  data.consent=true;data.elapsedMs=Date.now()-loadedAt;
  busy=true;btn.disabled=true;btn.textContent='Submitting...';show('loading','Sending your enquiry. Please wait.');
  var ctl=new AbortController(),t=setTimeout(function(){ctl.abort();},25000);
  /* text/plain keeps this a "simple" CORS request (no preflight), which Apps Script web apps support.
     The response is read and verified; success is shown only when the server returns {success:true}, which the script sends only after MailApp.sendEmail() returned without error. */
  fetch(GOOGLE_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(data),signal:ctl.signal,redirect:'follow'})
  .then(function(r){if(!r.ok)throw new Error('http');return r.json();})
  .then(function(j){
   if(j&&j.success){show('ok','Thank you. The institute has received your enquiry by email. Reference ID: '+j.referenceId+'. Please note it down.');form.reset();Object.keys(rules).forEach(function(n){setErr(n,'');});loadedAt=Date.now();}
   else{show('fail',(j&&j.message)||'Your enquiry could not be sent. Your details are still in the form. Please try again.');}
  })
  .catch(function(){show('fail','We could not confirm your submission, so it may not have been sent. Your details are still in the form. Please try again or call 9644119994.');})
  .then(function(){clearTimeout(t);busy=false;btn.disabled=false;btn.textContent='Submit enquiry';});
 });
})();
