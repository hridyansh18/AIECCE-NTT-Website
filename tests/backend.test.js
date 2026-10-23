const fs=require('fs'),vm=require('vm');
function run(opts){
 const sent=[],cache={};let uuid=0;
 const ctx={console,JSON,Number,String,Date,isNaN,RegExp,
  ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({s,setMimeType(){return this}})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v}})},
  Session:{getScriptTimeZone:()=>'Asia/Kolkata'},
  Utilities:{formatDate:()=>'23 Oct 2026, 10:00:00',getUuid:()=>'abcdef12-0000-0000-0000-000000000000'},
  MailApp:{getRemainingDailyQuota:()=>opts.quota??100,sendEmail:m=>{if(opts.fail)throw new Error('mail down');sent.push(m)}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../google-apps-script/Code.gs','utf8'),ctx);
 return {ctx,sent,post:o=>JSON.parse(ctx.doPost({postData:{contents:typeof o=='string'?o:JSON.stringify(o)}}).s)};
}
const good={fullName:"Asha Verma",guardianName:"Ramesh Verma",email:"asha@example.com",mobile:"9876543210",dob:"2000-05-01",gender:"Female",state:"Delhi",city:"Delhi",address:"12 Test Street, Pitampura",qualification:"12th / Intermediate (+2)",course:"Nursery Teacher Training (NTT) - 1 Year",duration:"1 Year",language:"Hindi",centre:"",centreCode:"0304",message:"Hi\nthere <b>x</b>",consent:true,website:"",elapsedMs:20000};
let pass=0,fail=0;const t=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n)};
let r=run({});let o=r.post(good);
t('valid -> success + ref',o.success&&/^ENQ-/.test(o.referenceId));
t('one email to configured recipient',r.sent.length==1&&r.sent[0].to=='kumawat_palak@yahoo.com');
t('subject has name',r.sent[0].subject.startsWith('New NTT Admission Enquiry - Asha Verma'));
t('html escapes user input',!r.sent[0].htmlBody.includes('<b>x</b>')&&r.sent[0].htmlBody.includes('&lt;b&gt;'));
t('replyTo applicant',r.sent[0].replyTo=='asha@example.com');
r=run({});t('bad mobile rejected, no mail',!r.post({...good,mobile:'5876543210'}).success&&r.sent.length==0);
r=run({});t('bad email rejected',!r.post({...good,email:'x@y'}).success);
r=run({});t('no consent rejected',!r.post({...good,consent:false}).success);
r=run({});t('invalid course rejected',!r.post({...good,course:'Hack'}).success);
r=run({});t('blank body rejected',!r.post({}).success);
r=run({});t('non-JSON rejected',!r.post('not json').success);
r=run({});t('honeypot rejected',!r.post({...good,website:'spam'}).success&&r.sent.length==0);
r=run({});t('too-fast rejected',!r.post({...good,elapsedMs:500}).success);
r=run({fail:true});o=r.post(good);t('mail failure -> success:false, no internals',!o.success&&!/mail down/.test(JSON.stringify(o)));
r=run({quota:0});t('quota exhausted -> failure',!r.post(good).success);
r=run({});[1,2,3].forEach(()=>r.post(good));t('4th from same mobile rate-limited',!r.post(good).success&&r.sent.length==3);
r=run({fail:true});r.post(good);r.ctx.MailApp.sendEmail=m=>r.sent.push(m);t('failed send does not consume rate limit',r.post(good).success);
r=run({});o=r.post({...good,fullName:"Evil\nBcc: x@y.com"});t('header-injection name rejected',!o.success);
r=run({});o=r.post({...good,centreCode:'abc'});t('bad centre code rejected',!o.success);
r=run({});r.post(good);t('email includes centre code',r.sent[0].htmlBody.includes('0304')&&r.sent[0].body.includes('Study centre code: 0304'));
console.log(pass+' passed, '+fail+' failed');process.exit(fail?1:0);
