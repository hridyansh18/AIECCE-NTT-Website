# Deployment
## Apps Script
See `google-apps-script/README.md`. Set `GOOGLE_SCRIPT_URL` in `js/config.js` before publishing.
## Netlify
Add new site > Deploy manually > drag the unzipped folder in (or connect a Git repo with an empty build command and publish directory `/`).
## GitHub Pages
Upload files at the repo root > Settings > Pages > Deploy from branch `main` / root. Links are relative, so a sub-path works.
