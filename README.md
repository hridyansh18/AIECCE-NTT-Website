# AIECCE NTT Website

Static site in HTML5, CSS3 and vanilla JavaScript. Admission enquiries are emailed to the institute by a Google Apps Script web app. No Google Sheets, Google Forms or database is used.

## Run locally
Open `index.html`, or `python3 -m http.server 8000`.

## Structure
`*.html` pages, `css/`, `js/` (main, admission, config), `assets/`, `google-apps-script/` (Code.gs, README), `docs/DEPLOYMENT.md`, `docs/TEST-CHECKLIST.md`, `tests/backend.test.js`.

## Setup steps
1. Follow `google-apps-script/README.md` (set recipient, authorise mail, deploy as Web App).
2. Paste the Web App URL into `js/config.js` (`GOOGLE_SCRIPT_URL`).
3. Publish the site (`docs/DEPLOYMENT.md`).
4. Send a real test enquiry and confirm the email arrives (check spam).

**Status: not live.** Until the URL is set, the form shows "not configured" and sends nothing. The recipient `kumawat_palak@yahoo.com` is the owner email provided and must be verified.

## Content
All institute details (name, address, phones, email, centre code 0304, fees) were supplied by the owner and are shown as final. Photos in `assets/images/` (teacher, children, books) were cropped from the AIECCE prospectus you supplied. Replace them with your own institute photos when available.

## Tests
`node tests/backend.test.js` runs the Code.gs logic against mocked Google services (validation, escaping, rate limits, mail failure). It does not send real email.
