# SR NTT Teacher Training Institute website

A static website built with HTML5, CSS3 and vanilla JavaScript (ES6). There is no framework or build step.
Admission enquiries are emailed to the institute by a Google Apps Script web app. No Google Sheets, Google Forms or database is used.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```text
.
├── index.html, about.html, courses.html, admission.html,
│   fees.html, study-materials.html, contact.html, faq.html,
│   privacy-policy.html
├── css/
│   ├── style.css        base styles, layout and components
│   ├── form.css         admission form styles
│   └── responsive.css   all media queries (mobile, tablet, desktop)
├── js/
│   ├── config.js        Web App URL (the only setting to edit)
│   ├── main.js          mobile menu and scroll-reveal
│   ├── admission.js     form validation and submission
│   └── contact.js       "quick message" opens WhatsApp
├── assets/              images, logo, book photos
├── google-apps-script/  Code.gs (email backend) and its README
├── docs/                DEPLOYMENT.md, TEST-CHECKLIST.md
└── tests/               backend.test.js
```

## Setup

1. Follow `google-apps-script/README.md`: check the recipient email, authorise mail, deploy as a Web App.
2. Paste the Web App URL into `js/config.js` (`GOOGLE_SCRIPT_URL`).
3. Publish the site (see `docs/DEPLOYMENT.md`).
4. Send a real test enquiry and confirm the email arrives (also check spam).

**Status:** until the URL is set in `js/config.js`, the form shows "not configured" and sends nothing.

## How the form works

- The browser validates every field, then sends the data to the Apps Script URL.
- The server validates again, applies spam checks and rate limits, then emails the institute.
- The site shows success only when the server replies `{ "success": true }`. On any error the entered data is kept so the student can retry.
- `Code.gs` also accepts a short `type: "callback"` request (name and mobile only). The current pages do not use it.

## Content

All institute details (name, address, phones, email, centre code 0304, fees) were supplied by the owner. Photos in `assets/images/` were cropped from the AIECCE prospectus; replace them with your own photos when available.

## Tests

```bash
node tests/backend.test.js
```

Runs the `Code.gs` logic against mocked Google services (validation, escaping, rate limits, mail failure). It does not send real email.
