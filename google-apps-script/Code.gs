/**
 * AIECCE admission enquiry backend: emails each enquiry to the institution.
 * Google Apps Script web app. No spreadsheet, database or form is used.
 *
 * CONFIGURE: set RECIPIENT_EMAIL below (verify it with the institute), then run
 * authorizeMail() once and deploy as a Web App (see README.md).
 */
var RECIPIENT_EMAIL = 'kumawat_palak@yahoo.com'; // owner's email as provided; verify before deployment
var ORG_NAME = 'SR NTT Institute';
var MIN_FILL_MS = 3000;            // faster than this is treated as a bot
var RATE_LIMIT_PER_10MIN = 3;      // per mobile number
var GLOBAL_LIMIT_PER_HOUR = 30;    // all submissions combined
var COURSES = ['Nursery Teacher Training (NTT) - 1 Year','Advanced Diploma - 2 Years','Pre-Primary Teacher Training'];
var GENDERS = ['Male','Female','Other','Prefer not to say'];
var LANGS = ['Hindi','English','Punjabi','Regional language'];

/** Run once from the editor to grant the Gmail/mail permission. Sends a test email to RECIPIENT_EMAIL. */
function authorizeMail() {
  MailApp.sendEmail(RECIPIENT_EMAIL, ORG_NAME + ' enquiry form: test email', 'Permission granted. Remaining daily mail quota: ' + MailApp.getRemainingDailyQuota());
}

function doGet() { return json_({ success: true, message: 'AIECCE enquiry endpoint is running.' }); }

function doPost(e) {
  var lock = LockService.getScriptLock(), locked = false;
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ success: false, message: 'Empty submission.' });
    if (e.postData.contents.length > 20000) return json_({ success: false, message: 'Submission too large.' });
    var d;
    try { d = JSON.parse(e.postData.contents); } catch (x) { return json_({ success: false, message: 'Invalid request.' }); }

    if (d.website) return json_({ success: false, message: 'Submission rejected.' });            // honeypot
    if (!(Number(d.elapsedMs) >= MIN_FILL_MS)) return json_({ success: false, message: 'Please take a moment to fill the form, then submit again.' });

    var v = validate_(d);
    if (v.errors.length) return json_({ success: false, message: v.errors.join(' ') });
    var c = v.clean;

    lock.waitLock(20000); locked = true;
    var cache = CacheService.getScriptCache();
    var mk = 'rl_' + c.mobile, mn = Number(cache.get(mk) || 0);
    if (mn >= RATE_LIMIT_PER_10MIN) return json_({ success: false, message: 'Too many submissions from this number. Please try again later.' });
    var gk = 'rl_all', gn = Number(cache.get(gk) || 0);
    if (gn >= GLOBAL_LIMIT_PER_HOUR) return json_({ success: false, message: 'The form is busy. Please try again later or call the helpline.' });
    if (MailApp.getRemainingDailyQuota() < 1) return json_({ success: false, message: 'Daily submission limit reached. Please call the helpline.' });

    var tz = Session.getScriptTimeZone(), now = new Date();
    var ref = 'ENQ-' + Utilities.formatDate(now, tz, 'yyyyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
    var stamp = Utilities.formatDate(now, tz, 'dd MMM yyyy, HH:mm:ss') + ' (' + tz + ')';

    MailApp.sendEmail({
      to: RECIPIENT_EMAIL,
      replyTo: c.email,
      name: ORG_NAME + ' Website',
      subject: 'New NTT Admission Enquiry - ' + c.fullName + ' [' + ref + ']',
      body: textBody_(c, ref, stamp),
      htmlBody: htmlBody_(c, ref, stamp)
    });
    // Counters are updated only after the mail call returned without throwing.
    cache.put(mk, String(mn + 1), 600);
    cache.put(gk, String(gn + 1), 3600);
    return json_({ success: true, referenceId: ref, message: 'Enquiry emailed to the institute.' });
  } catch (err) {
    console.error(err); // details stay in Apps Script logs, never sent to the browser
    return json_({ success: false, message: 'We could not send your enquiry. Please try again later or call the helpline.' });
  } finally {
    if (locked) lock.releaseLock();
  }
}

var FIELDS_ = [['Full name','fullName'],["Father's/Guardian's name",'guardianName'],['Email','email'],['Mobile number','mobile'],['Date of birth','dob'],['Gender','gender'],['State','state'],['City','city'],['Full address','address'],['Highest qualification','qualification'],['Selected course','course'],['Course duration','duration'],['Preferred language','language'],['Preferred study centre','centre'],['Study centre code','centreCode'],['Message','message']];

function textBody_(c, ref, stamp) {
  var t = 'New NTT admission enquiry\nReference ID: ' + ref + '\nSubmitted: ' + stamp + '\n\n';
  FIELDS_.forEach(function (f) { t += f[0] + ': ' + (c[f[1]] || '-') + '\n'; });
  return t + 'Privacy consent: Yes\n\nReply to this email to contact the applicant.';
}

function htmlBody_(c, ref, stamp) {
  var rows = FIELDS_.map(function (f) {
    return '<tr><td style="padding:8px 12px;border-bottom:1px solid #dfe5f3;background:#F5F7FC;width:38%"><b>' + esc_(f[0]) + '</b></td><td style="padding:8px 12px;border-bottom:1px solid #dfe5f3">' + (esc_(c[f[1]]) || '-').replace(/\n/g, '<br>') + '</td></tr>';
  }).join('');
  return '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;border:1px solid #dfe5f3">' +
    '<div style="background:#142B63;color:#fff;padding:16px 20px"><h2 style="margin:0;font-size:18px">New NTT Admission Enquiry</h2></div>' +
    '<div style="padding:14px 20px;background:#FFD32A;color:#142B63"><b>Reference ID:</b> ' + esc_(ref) + '<br><b>Submitted:</b> ' + esc_(stamp) + '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px">' + rows + '<tr><td style="padding:8px 12px;background:#F5F7FC"><b>Privacy consent</b></td><td style="padding:8px 12px">Yes</td></tr></table>' +
    '<p style="padding:0 20px;font-size:12px;color:#555">Reply to this email to contact the applicant. Details were entered by the applicant and are unverified.</p></div>';
}

function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function validate_(d) {
  var errors = [], c = {};
  function s(k, max, keepNl) {
    var v = String(d[k] == null ? '' : d[k]);
    v = keepNl ? v.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').replace(/[ \t]+/g, ' ') : v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
    return v.trim().slice(0, max);
  }
  c.fullName = s('fullName', 80); c.guardianName = s('guardianName', 80);
  c.email = s('email', 100); c.mobile = s('mobile', 10); c.dob = s('dob', 10);
  c.gender = s('gender', 20); c.state = s('state', 60); c.city = s('city', 60);
  c.address = s('address', 300); c.qualification = s('qualification', 60);
  c.course = s('course', 80); c.duration = s('duration', 60); c.language = s('language', 30);
  c.centre = s('centre', 100); c.centreCode = s('centreCode', 10); c.message = s('message', 500, true);
  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(c.fullName)) errors.push('Enter a valid full name.');
  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(c.guardianName)) errors.push("Enter a valid father's/guardian's name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) errors.push('Enter a valid email.');
  if (!/^[6-9]\d{9}$/.test(c.mobile)) errors.push('Enter a valid 10-digit Indian mobile number.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.dob) || isNaN(new Date(c.dob).getTime())) errors.push('Enter a valid date of birth.');
  if (GENDERS.indexOf(c.gender) < 0) errors.push('Select a valid gender.');
  if (!c.state) errors.push('Select a state.');
  if (c.city.length < 2) errors.push('Enter a city.');
  if (c.address.length < 10) errors.push('Enter a full address.');
  if (!c.qualification) errors.push('Select a qualification.');
  if (COURSES.indexOf(c.course) < 0) errors.push('Select a valid course.');
  if (!c.duration) errors.push('Select a course duration.');
  if (LANGS.indexOf(c.language) < 0) errors.push('Select a valid language.');
  if (!/^[0-9]{3,6}$/.test(c.centreCode)) errors.push('Invalid study centre code.');
  if (d.consent !== true) errors.push('Privacy consent is required.');
  return { errors: errors, clean: c };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
