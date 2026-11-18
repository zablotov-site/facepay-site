# facePay

An interactive browser-only prototype with real on-device face enrollment and matching. Payments, cashier approval, card entry and message delivery remain simulated. Face matching is demo-grade, not bank-level security: it has no liveness detection, can be fooled by photos, and must never authorize a real charge. Barcode scanning is unchanged: live BarcodeDetector where supported, clearly labeled simulation elsewhere.

## Run

Serve this directory with any static HTTP server, over HTTPS (or localhost) for camera access. No build step is required; browser libraries and models are vendored. Opening an HTML file directly is not a supported camera flow.

## Screens

- Home: `#/`
- Demo enrollment: `#/signup`
- Interactive store catalog, barcode scanning and checkout: `#/checkout`
- Local wallet, history, receipt download and reset: `#/account`
- Demo merchant setup: `#/business`
- Sample merchant analytics and CSV catalog import: `#/dashboard`
- Demo privacy information and FAQ: `#/security`

## Demo data

Profiles (including face descriptors after real enrollment), receipts, store setup, catalogs and receipt preferences stay in localStorage in the current browser. They are not real accounts and do not sync. Reset them from My account. Use fictional contact details only. The payment card is a fixed fictional test card ending 4242.

The merchant analytics are labeled sample data. Actual demo checkouts appear in the customer account history. Downloaded receipts are plain-text demo records, not tax invoices.

CSV uploads use the columns `item,price` with an optional third `barcode` column (4-14 digits) that powers the checkout scanner, an optional header, quoted item names and prices with up to two decimal places. Scanning a barcode with no matching catalog item leaves the basket unchanged and says so. Limit: 500 rows and 100 KB. A valid upload replaces the current browser's demo catalog. Nothing is uploaded to a backend.

## Deployment

Static assets are deployed to the existing Cloudflare Pages project `facepay`. The full static output includes the page HTML files, styles.css, app.js, face.js, vendor/, models/, icons and metadata assets. Keep credentials outside the source tree. No production payment or biometric system is connected.

## Finishing assets and page metadata

The site has clean page URLs (`/signup`, `/checkout`, `/account`, `/business`, `/dashboard`, `/security`) with per-page HTML metadata for link previews. Legacy `#/...` links still work. Unknown paths return a styled 404. Cloudflare Pages serves the matching HTML files without a build step.

The favicon, Apple touch icon, install icons and square social image use the facePay gradient wordmark/monogram on the dark aurora treatment. `scripts/icons.py` regenerates these with Python and Pillow; `scripts/finish.py` regenerates the page shells. Keep the metadata in app.js aligned with page-meta.json when editing copy.

For QA, install Playwright locally (`npm install --no-save --no-package-lock playwright` and `npx playwright install chromium`), then run `node qa.cjs`. Set QA_URL to test a deployed origin instead of the built-in local server. The test uses fictional details and clears its own local demo data.

Deploy all root HTML, CSS, JS, image, manifest, robots and sitemap files. Do not deploy node_modules, credentials, .git, test scripts or generator scripts.


## Local face matching

`face.js` loads the pinned face-api.js 0.22.2 library, tiny face detector, 68-point landmark model and recognition model from this origin only. Upstream: https://github.com/justadudewhohacks/face-api.js/tree/0.22.2 . Library license is in vendor/face-api.LICENSE. Model files are copied unchanged from that release's weights directory.

Enrollment is permission-gated and captures three descriptors of one face, with a live mirrored preview and detection indicator. Raw images/video are not saved. A completed profile stores model version and three 128-number descriptors in localStorage. Checkout takes three new captures; at least two must have mean Euclidean distance below 0.50 to the three enrollment descriptors. No enrollment means no real match path. Simulation is always separate and labeled. Model failure, missing/denied camera, no/multiple faces and mismatches offer a safe retry or simulated demo.

Camera tracks stop after capture, cancellation, navigation, pagehide or backgrounding. Video uses autoplay, muted, playsinline and explicit play() for iOS Safari. A physical iOS camera was not available in automated QA, so hardware behavior still needs a real-device check. Face models run in-browser, including on iOS Safari where supported by face-api.js. Storage is local and unencrypted, not a biometric vault. Data does not sync across devices, browsers or private windows. Reset demo data in My account deletes the profile and all descriptors.

## Face QA

`node qa-face.cjs` checks denied/missing camera, explicit demo fallback, capture/match/mismatch UI, no/multiple faces, track cleanup, and actual neural-network distances. `node qa-camera.cjs` runs the complete video-to-descriptor enrollment, matching and rejection pipeline with the real vendored models and test photos painted into a canvas camera stream. Test photos are never deployed or committed. Fetch these public test fixtures into /tmp/face-test-fixtures first:

```sh
mkdir -p /tmp/face-test-fixtures
for name in obama obama2 biden; do
  curl -fLsS https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/$name.jpg -o /tmp/face-test-fixtures/$name.jpg
done
node qa.cjs
node qa-face.cjs
node qa-camera.cjs
```

The photo-driven test explicitly demonstrates that this is not anti-spoofing or liveness verification. Deterministic UI tests install their doubles only in the test browser; no mocked success path or test fixtures ship to the site. Set QA_URL for the live no-camera and UI suite (fixture-based model tests run locally).

## Tzedakah mode (`/tzedakah`)

Collector flow for a tablet, in `tzedakah.js`. The collector opens the camera, the donor's face is matched 1:N against every enrolled donor with the same face-api.js pipeline (mean descriptor distance below 0.50, at least 2 of 3 captures). A new face can be saved on the spot (name, phone, email) or continue as guest. Then the donor just says an amount (Web Speech API; English or Hebrew recognition, digits, money words, English/Yiddish/Hebrew number words, "chai"); no confirmation word is needed. The parsed amount prepares the charge and a large green button confirms. While the voice step runs, a clip of up to about 9 seconds is recorded with MediaRecorder. On confirm the charge to the fictional test card is simulated, a receipt (USD) is added to My account, and the clip is saved to IndexedDB (`facepay-tzedakah`) with the donor record in localStorage (`facepay-donors`: name, phone, email, masked test card, donations). Where the camera, MediaRecorder or SpeechRecognition is missing, the flow falls back to a simulated donor and simulated transcript, like the barcode scanner. If speech is unclear, manual amount buttons appear as an edge fallback only. SpeechRecognition support: Chrome and Edge (desktop and Android), Safari 14.1+; Firefox has none. Chrome sends audio to Google's speech service. `qa-tzedakah.cjs` runs the flow with fixture faces and stubbed speech. Only the fictional card ending 4242 is stored, never a real card number.
