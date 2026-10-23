# Google Apps Script email backend

`Code.gs` receives the form, validates it again on the server, and emails the enquiry to the institute with `MailApp.sendEmail()`. Nothing is stored in a sheet or database.

## Setup (done by the institution, signed in to the Google account that should send the emails)
1. Go to script.google.com > **New project**. Name it "AIECCE Enquiry Mailer".
2. Replace the default code with `Code.gs`.
3. At the top, check `RECIPIENT_EMAIL` (currently `kumawat_palak@yahoo.com`, as provided by the owner). **Verify it with the institute and change it if needed.**
4. Select `authorizeMail` in the function dropdown > **Run**. Review and allow the permissions (send email as you; Google may show "unverified app" because it is your own script: Advanced > Go to project). A test email is sent to the recipient.
5. **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and copy the URL ending in `/exec`.
6. Paste it into `js/config.js` as `GOOGLE_SCRIPT_URL`, then publish the website.
7. Submit a real test enquiry on `admission.html`. The site shows success only when the script reports the email was sent. Check the inbox **and the spam folder** (see below).
8. After any change to `Code.gs`: **Deploy > Manage deployments > Edit > New version**. The old URL keeps running the old code otherwise.

## How success is verified
The browser sends `fetch()` with `Content-Type: text/plain`, which avoids a CORS preflight. Apps Script web apps answer such requests with CORS headers, so the site can read the JSON reply. The script returns `success: true` only after `MailApp.sendEmail()` returns without throwing. The site then shows the reference ID and resets the form. On any network error, timeout, non-JSON reply or `success:false`, the site shows an error and keeps the entered data.

## Limitations
- **Delivery is not guaranteed.** `sendEmail()` returning means Google accepted the message. It does not prove the Yahoo inbox accepted it. Yahoo may filter mail sent from `script.google.com` to spam, so ask staff to check spam and mark it "not spam". Emails come from the Google account that deployed the script, with the applicant's address as Reply-To.
- **Unreadable reply:** if a browser extension, firewall or privacy setting blocks reading the response, the email may have been sent while the site says it could not confirm. The student may then resubmit and staff may get a duplicate. This is deliberate: the site never claims success without confirmation.
- **Quotas:** Google limits emails per day (commonly about 100 recipients/day for free Gmail accounts and higher for Workspace; check current Google limits). The script also refuses when `MailApp.getRemainingDailyQuota()` is 0.
- **Public endpoint:** anyone can call the URL. Protections: server-side validation, field allow-lists, honeypot, minimum fill time, 3 submissions per mobile per 10 minutes, 30 per hour overall, header-injection/HTML escaping. These do not stop a determined attacker and there is no CAPTCHA. For stronger protection add reCAPTCHA verification with `UrlFetchApp`.
- **"Anyone" access** may be disabled by a Google Workspace admin or account policy. If it is unavailable, use a personal Google account or ask the admin to allow it.
- Applicant details pass through Google and Yahoo mail systems. The privacy policy says so; have it reviewed.
