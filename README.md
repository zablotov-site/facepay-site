# facePay

An interactive, browser-only product prototype. No real payments, face recognition, ID verification, card entry, or message delivery. The face match is always simulated. The barcode scanner uses live camera detection only where the browser supports BarcodeDetector (permission-gated, nothing recorded or uploaded) and clearly falls back to a simulated scan everywhere else.

## Run

Serve this directory with any static HTTP server, or open index.html. No build step or dependencies are required.

## Screens

- Home: `#/`
- Demo enrollment: `#/signup`
- Interactive store catalog, barcode scanning and checkout: `#/checkout`
- Local wallet, history, receipt download and reset: `#/account`
- Demo merchant setup: `#/business`
- Sample merchant analytics and CSV catalog import: `#/dashboard`
- Demo privacy information and FAQ: `#/security`

## Demo data

Profiles, receipts, store setup, catalogs and receipt preferences stay in localStorage in the current browser. They are not real accounts and do not sync. Reset them from My account. Use fictional contact details only. The payment card is a fixed fictional test card ending 4242.

The merchant analytics are labeled sample data. Actual demo checkouts appear in the customer account history. Downloaded receipts are plain-text demo records, not tax invoices.

CSV uploads use the columns `item,price` with an optional third `barcode` column (4-14 digits) that powers the checkout scanner, an optional header, quoted item names and prices with up to two decimal places. Scanning a barcode with no matching catalog item leaves the basket unchanged and says so. Limit: 500 rows and 100 KB. A valid upload replaces the current browser's demo catalog. Nothing is uploaded to a backend.

## Deployment

Static assets are deployed to the existing Cloudflare Pages project `facepay`. The full static output includes the page HTML files, styles.css, app.js, icons and metadata assets. Keep credentials outside the source tree. No production payment or biometric system is connected.

## Finishing assets and page metadata

The site has clean page URLs (`/signup`, `/checkout`, `/account`, `/business`, `/dashboard`, `/security`) with per-page HTML metadata for link previews. Legacy `#/...` links still work. Unknown paths return a styled 404. Cloudflare Pages serves the matching HTML files without a build step.

The favicon, Apple touch icon, install icons and square social image use the facePay gradient wordmark/monogram on the dark aurora treatment. `scripts/icons.py` regenerates these with Python and Pillow; `scripts/finish.py` regenerates the page shells. Keep the metadata in app.js aligned with page-meta.json when editing copy.

For QA, install Playwright locally (`npm install --no-save --no-package-lock playwright` and `npx playwright install chromium`), then run `node qa.cjs`. Set QA_URL to test a deployed origin instead of the built-in local server. The test uses fictional details and clears its own local demo data.

Deploy all root HTML, CSS, JS, image, manifest, robots and sitemap files. Do not deploy node_modules, credentials, .git, test scripts or generator scripts.
