/**
 * AIECCE / SR NTT admission enquiry backend (Google Apps Script web app).
 *
 * Emails every valid enquiry to the institute with MailApp.sendEmail().
 * No spreadsheet, form or database is used.
 *
 * SETUP
 *   1. Check RECIPIENT_EMAIL below (verify it with the institute).
 *   2. Run authorizeMail() once and allow the permissions.
 *   3. Deploy > New deployment > Web app
 *      (Execute as: Me, Who has access: Anyone).
 *   4. Paste the /exec URL into js/config.js on the website.
 */

/* ---------------- Configuration ---------------- */
var RECIPIENT_EMAIL = 'srntt.treasurefantasy@gmail.com'; // owner's email as provided
var ORG_NAME = 'SR NTT Institute';

var MIN_FILL_MS = 3000;         // faster submissions are treated as bots
var RATE_LIMIT_PER_10MIN = 3;   // per mobile number
var GLOBAL_LIMIT_PER_HOUR = 30; // all submissions combined

var COURSES = [
  'Nursery Teacher Training (NTT) - 1 Year',
  'Advanced Diploma - 2 Years',
  'Pre-Primary Teacher Training'
];
var GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
var LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Regional language'];

// Fields shown in the email: [label, key].
var CALLBACK_FIELDS = [
  ['Name', 'fullName'],
  ['Mobile number', 'mobile'],
  ['Message', 'message']
];

var EMAIL_FIELDS = [
  ['Full name', 'fullName'],
  ["Father's/Guardian's name", 'guardianName'],
  ['Email', 'email'],
  ['Mobile number', 'mobile'],
  ['Date of birth', 'dob'],
  ['Gender', 'gender'],
  ['State', 'state'],
  ['City', 'city'],
  ['Full address', 'address'],
  ['Highest qualification', 'qualification'],
  ['Selected course', 'course'],
  ['Course duration', 'duration'],
  ['Preferred language', 'language'],
  ['Preferred study centre', 'centre'],
  ['Study centre code', 'centreCode'],
  ['Message', 'message']
];

/* ---------------- Entry points ---------------- */

/** Run once from the editor to grant the mail permission. Sends a test email. */
function authorizeMail() {
  MailApp.sendEmail(
    RECIPIENT_EMAIL,
    ORG_NAME + ' enquiry form: test email',
    'Permission granted. Remaining daily mail quota: ' + MailApp.getRemainingDailyQuota()
  );
}

/** Health check: open the /exec URL in a browser. */
function doGet() {
  return jsonResponse_({ success: true, message: 'Enquiry endpoint is running.' });
}

/** Receives the enquiry, validates it and emails it to the institute. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, message: 'Empty submission.' });
    }
    if (e.postData.contents.length > 20000) {
      return jsonResponse_({ success: false, message: 'Submission too large.' });
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse_({ success: false, message: 'Invalid request.' });
    }

    // Spam checks: honeypot field and minimum fill time.
    if (data.website) {
      return jsonResponse_({ success: false, message: 'Submission rejected.' });
    }
    if (!(Number(data.elapsedMs) >= MIN_FILL_MS)) {
      return jsonResponse_({
        success: false,
        message: 'Please take a moment to fill the form, then submit again.'
      });
    }

    // "callback" requests are short; everything else is a full admission enquiry.
    var isCallback = data.type === 'callback';
    var validation = isCallback ? validateCallback_(data) : validate_(data);
    if (validation.errors.length) {
      return jsonResponse_({ success: false, message: validation.errors.join(' ') });
    }
    var clean = validation.clean;

    lock.waitLock(20000);
    hasLock = true;

    // Rate limiting (per mobile number and overall).
    var cache = CacheService.getScriptCache();
    var mobileKey = 'rl_' + clean.mobile;
    var mobileCount = Number(cache.get(mobileKey) || 0);
    var globalCount = Number(cache.get('rl_all') || 0);

    if (mobileCount >= RATE_LIMIT_PER_10MIN) {
      return jsonResponse_({
        success: false,
        message: 'Too many submissions from this number. Please try again later.'
      });
    }
    if (globalCount >= GLOBAL_LIMIT_PER_HOUR) {
      return jsonResponse_({
        success: false,
        message: 'The form is busy. Please try again later or call the helpline.'
      });
    }
    if (MailApp.getRemainingDailyQuota() < 1) {
      return jsonResponse_({
        success: false,
        message: 'Daily submission limit reached. Please call the helpline.'
      });
    }

    // Reference ID and timestamp.
    var timeZone = Session.getScriptTimeZone();
    var now = new Date();
    var reference =
      (isCallback ? 'CBK-' : 'ENQ-') +
      Utilities.formatDate(now, timeZone, 'yyyyMMdd') +
      '-' +
      Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
    var stamp = Utilities.formatDate(now, timeZone, 'dd MMM yyyy, HH:mm:ss') + ' (' + timeZone + ')';

    var fields = isCallback ? CALLBACK_FIELDS : EMAIL_FIELDS;
    var title = isCallback ? 'Call-back request' : 'New NTT admission enquiry';

    MailApp.sendEmail({
      to: RECIPIENT_EMAIL,
      replyTo: clean.email || RECIPIENT_EMAIL,
      name: ORG_NAME + ' Website',
      subject: (isCallback ? 'Call-back request - ' : 'New NTT Admission Enquiry - ') +
        clean.fullName + ' [' + reference + ']',
      body: buildTextBody_(clean, reference, stamp, fields, title),
      htmlBody: buildHtmlBody_(clean, reference, stamp, fields, title)
    });

    // Counters change only after the mail call returned without throwing.
    cache.put(mobileKey, String(mobileCount + 1), 600);
    cache.put('rl_all', String(globalCount + 1), 3600);

    return jsonResponse_({
      success: true,
      referenceId: reference,
      message: 'Enquiry emailed to the institute.'
    });
  } catch (error) {
    // Details stay in the Apps Script logs and are never sent to the browser.
    console.error(error);
    return jsonResponse_({
      success: false,
      message: 'We could not send your enquiry. Please try again later or call the helpline.'
    });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

/* ---------------- Email bodies ---------------- */

function buildTextBody_(clean, reference, stamp, fields, title) {
  var text =
    title + '\n' +
    'Reference ID: ' + reference + '\n' +
    'Submitted: ' + stamp + '\n\n';

  fields.forEach(function (field) {
    text += field[0] + ': ' + (clean[field[1]] || '-') + '\n';
  });

  return text + 'Privacy consent: Yes\n\nReply to this email to contact the applicant.';
}

function buildHtmlBody_(clean, reference, stamp, fields, title) {
  var cellLabel = 'padding:8px 12px;border-bottom:1px solid #dfe5f3;background:#F5F7FC;width:38%';
  var cellValue = 'padding:8px 12px;border-bottom:1px solid #dfe5f3';

  var rows = fields.map(function (field) {
    var value = escapeHtml_(clean[field[1]]) || '-';
    return (
      '<tr><td style="' + cellLabel + '"><b>' + escapeHtml_(field[0]) + '</b></td>' +
      '<td style="' + cellValue + '">' + value.replace(/\n/g, '<br>') + '</td></tr>'
    );
  }).join('');

  return (
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;border:1px solid #dfe5f3">' +
    '<div style="background:#142B63;color:#fff;padding:16px 20px">' +
    '<h2 style="margin:0;font-size:18px">' + escapeHtml_(title) + '</h2></div>' +
    '<div style="padding:14px 20px;background:#FFD32A;color:#142B63">' +
    '<b>Reference ID:</b> ' + escapeHtml_(reference) + '<br>' +
    '<b>Submitted:</b> ' + escapeHtml_(stamp) + '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px">' + rows +
    '<tr><td style="padding:8px 12px;background:#F5F7FC"><b>Privacy consent</b></td>' +
    '<td style="padding:8px 12px">Yes</td></tr></table>' +
    '<p style="padding:0 20px;font-size:12px;color:#555">' +
    'Reply to this email to contact the applicant. ' +
    'Details were entered by the applicant and are unverified.</p></div>'
  );
}

/* ---------------- Validation ---------------- */

/** Cleans a value: removes control characters, collapses spaces, limits length. */
function cleanValue_(value, maxLength, keepNewlines) {
  var text = String(value === null || value === undefined ? '' : value);

  if (keepNewlines) {
    text = text.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').replace(/[ \t]+/g, ' ');
  } else {
    text = text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  }
  return text.trim().slice(0, maxLength);
}

function validate_(data) {
  var errors = [];
  var c = {
    fullName: cleanValue_(data.fullName, 80),
    guardianName: cleanValue_(data.guardianName, 80),
    email: cleanValue_(data.email, 100),
    mobile: cleanValue_(data.mobile, 10),
    dob: cleanValue_(data.dob, 10),
    gender: cleanValue_(data.gender, 20),
    state: cleanValue_(data.state, 60),
    city: cleanValue_(data.city, 60),
    address: cleanValue_(data.address, 300),
    qualification: cleanValue_(data.qualification, 60),
    course: cleanValue_(data.course, 80),
    duration: cleanValue_(data.duration, 60),
    language: cleanValue_(data.language, 30),
    centre: cleanValue_(data.centre, 100),
    centreCode: cleanValue_(data.centreCode, 10),
    message: cleanValue_(data.message, 500, true)
  };

  var namePattern = /^[A-Za-z][A-Za-z .'-]{1,79}$/;

  if (!namePattern.test(c.fullName)) errors.push('Enter a valid full name.');
  if (!namePattern.test(c.guardianName)) errors.push("Enter a valid father's/guardian's name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) errors.push('Enter a valid email.');
  if (!/^[6-9]\d{9}$/.test(c.mobile)) errors.push('Enter a valid 10-digit Indian mobile number.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.dob) || isNaN(new Date(c.dob).getTime())) {
    errors.push('Enter a valid date of birth.');
  }
  if (GENDERS.indexOf(c.gender) < 0) errors.push('Select a valid gender.');
  if (!c.state) errors.push('Select a state.');
  if (c.city.length < 2) errors.push('Enter a city.');
  if (c.address.length < 10) errors.push('Enter a full address.');
  if (!c.qualification) errors.push('Select a qualification.');
  if (COURSES.indexOf(c.course) < 0) errors.push('Select a valid course.');
  if (!c.duration) errors.push('Select a course duration.');
  if (LANGUAGES.indexOf(c.language) < 0) errors.push('Select a valid language.');
  if (!/^[0-9]{3,6}$/.test(c.centreCode)) errors.push('Invalid study centre code.');
  if (data.consent !== true) errors.push('Privacy consent is required.');

  return { errors: errors, clean: c };
}

/** Short "call me back" request: name, mobile number and an optional message. */
function validateCallback_(data) {
  var errors = [];
  var c = {
    fullName: cleanValue_(data.fullName, 80),
    mobile: cleanValue_(data.mobile, 10).replace(/\D/g, ''),
    message: cleanValue_(data.message, 500, true),
    email: ''
  };

  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(c.fullName)) errors.push('Enter a valid name.');
  if (!/^[6-9]\d{9}$/.test(c.mobile)) errors.push('Enter a valid 10-digit Indian mobile number.');
  if (data.consent !== true) errors.push('Consent is required.');

  return { errors: errors, clean: c };
}

/* ---------------- Helpers ---------------- */

function escapeHtml_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
