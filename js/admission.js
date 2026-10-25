/**
 * Admission enquiry form.
 * - Validates every field in the browser (the server validates again).
 * - Sends the data to the Google Apps Script web app, which emails it
 *   to the institute.
 * - Shows success ONLY when the server replies { success: true }.
 * - Keeps the entered data on any failure so the student can retry.
 */
(() => {
  'use strict';

  const form = document.getElementById('admForm');
  if (!form) return;

  const submitButton = document.getElementById('submitBtn');
  const statusBox = document.getElementById('status');

  const REQUEST_TIMEOUT_MS = 25000;
  const SUPPORT_PHONE = '9644119994';

  const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MOBILE_PATTERN = /^[6-9]\d{9}$/;
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  // Duration that matches each course option (same order as the <select>).
  const DURATION_BY_COURSE_INDEX = ['1 Year', '2 Years', 'Pre-Primary Course'];

  const FIELDS_TO_SEND = [
    'fullName', 'guardianName', 'email', 'mobile', 'dob', 'gender',
    'state', 'city', 'address', 'qualification', 'course', 'duration',
    'language', 'centre', 'centreCode', 'message', 'website',
  ];

  let loadedAt = Date.now();
  let busy = false;

  /* ---------- Validation rules ----------
     Each rule returns true when valid, otherwise an error message. */
  const required = (message) => (value) => Boolean(value) || message;

  const rules = {
    fullName: (v) =>
      NAME_PATTERN.test(v) || 'Enter your full name (letters only, 2-80 characters).',
    guardianName: (v) =>
      NAME_PATTERN.test(v) || "Enter father's or guardian's name (letters only).",
    email: (v) => EMAIL_PATTERN.test(v) || 'Enter a valid email address.',
    mobile: (v) =>
      MOBILE_PATTERN.test(v) || 'Enter a 10-digit Indian mobile number starting with 6-9.',
    dob: (v) => {
      if (!v) return 'Select your date of birth.';
      const age = (Date.now() - new Date(v)) / MS_PER_YEAR;
      return (age >= 14 && age <= 80) || 'Age must be between 14 and 80 years.';
    },
    gender: required('Select gender.'),
    state: required('Select your state.'),
    city: (v) => v.length >= 2 || 'Enter your city.',
    address: (v) => v.length >= 10 || 'Enter your full address (at least 10 characters).',
    qualification: required('Select your qualification.'),
    course: required('Select a course.'),
    duration: required('Select course duration.'),
    language: required('Select a language.'),
  };

  /* ---------- UI helpers ---------- */
  const setFieldError = (name, message) => {
    const field = document.getElementById(name);
    const errorBox = document.getElementById(`e-${name}`);
    if (!field || !errorBox) return;

    errorBox.textContent = message || '';
    field.closest('.f')?.classList.toggle('invalid', Boolean(message));
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) field.setAttribute('aria-describedby', `e-${name}`);
  };

  const validateField = (name) => {
    const value = (form.elements[name].value || '').trim();
    const result = rules[name](value);
    setFieldError(name, result === true ? '' : result);
    return result === true;
  };

  const showStatus = (type, message) => {
    statusBox.className = `status show ${type}`;
    statusBox.textContent = message;
  };

  const setBusy = (isBusy) => {
    busy = isBusy;
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? 'Submitting...' : 'Submit enquiry';
  };

  const isBackendConfigured = () =>
    typeof GOOGLE_SCRIPT_URL !== 'undefined' &&
    GOOGLE_SCRIPT_URL.startsWith('https://script.google.com/');

  const collectData = () => {
    const data = {};
    FIELDS_TO_SEND.forEach((key) => {
      data[key] = (form.elements[key].value || '').trim();
    });
    data.consent = true;
    data.elapsedMs = Date.now() - loadedAt; // used by the server for spam checks
    return data;
  };

  /* ---------- Live validation ---------- */
  Object.keys(rules).forEach((name) => {
    form.elements[name].addEventListener('blur', () => validateField(name));
  });

  // Choosing a course pre-selects the matching duration.
  form.elements.course.addEventListener('change', (event) => {
    const duration = DURATION_BY_COURSE_INDEX[event.target.selectedIndex - 1];
    if (duration) form.elements.duration.value = duration;
  });

  /* ---------- Submit ---------- */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    // 1. Validate every field.
    let firstInvalid = null;
    Object.keys(rules).forEach((name) => {
      if (!validateField(name) && !firstInvalid) firstInvalid = form.elements[name];
    });

    const consent = form.elements.consent;
    const consentError = document.getElementById('e-consent');
    if (consent.checked) {
      consentError.textContent = '';
    } else {
      consentError.textContent = 'You must accept the privacy policy.';
      firstInvalid = firstInvalid || consent;
    }

    if (firstInvalid) {
      showStatus('fail', 'Please fix the highlighted fields.');
      firstInvalid.focus();
      return;
    }

    // 2. Make sure the backend URL has been configured.
    if (!isBackendConfigured()) {
      showStatus(
        'fail',
        `Online submission is not configured yet. Please call ${SUPPORT_PHONE} or use the WhatsApp button.`
      );
      return;
    }

    // 3. Send the enquiry.
    setBusy(true);
    showStatus('loading', 'Sending your enquiry. Please wait.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      /* "text/plain" keeps this a simple CORS request (no preflight), which
         Apps Script web apps support. The reply is read and verified: success
         is shown only when the server returns { success: true }, and the
         script returns that only after MailApp.sendEmail() finished without
         an error. */
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(collectData()),
        signal: controller.signal,
        redirect: 'follow',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();

      if (result && result.success) {
        showStatus(
          'ok',
          `Thank you. The institute has received your enquiry by email. ` +
            `Reference ID: ${result.referenceId}. Please note it down.`
        );
        form.reset(); // only after confirmed success
        Object.keys(rules).forEach((name) => setFieldError(name, ''));
        loadedAt = Date.now();
      } else {
        showStatus(
          'fail',
          (result && result.message) ||
            'Your enquiry could not be sent. Your details are still in the form. Please try again.'
        );
      }
    } catch (error) {
      showStatus(
        'fail',
        'We could not confirm your submission, so it may not have been sent. ' +
          `Your details are still in the form. Please try again or call ${SUPPORT_PHONE}.`
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  });
})();
