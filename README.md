# facePay

An interactive, browser-only product prototype. No real payments, camera capture, face recognition, ID verification, card entry, or message delivery.

## Run

Serve this directory with any static HTTP server, or open index.html. No build step or dependencies are required.

## Screens

- Home: `#/`
- Demo enrollment: `#/signup`
- Interactive store catalog and checkout: `#/checkout`
- Local wallet, history, receipt download and reset: `#/account`
- Demo merchant setup: `#/business`
- Sample merchant analytics and CSV catalog import: `#/dashboard`
- Demo privacy information and FAQ: `#/security`

## Demo data

Profiles, receipts, store setup, catalogs and receipt preferences stay in localStorage in the current browser. They are not real accounts and do not sync. Reset them from My account. Use fictional contact details only. The payment card is a fixed fictional test card ending 4242.

The merchant analytics are labeled sample data. Actual demo checkouts appear in the customer account history. Downloaded receipts are plain-text demo records, not tax invoices.

CSV uploads use two columns, `item,price`, with an optional header, quoted item names and prices with up to two decimal places. Limit: 500 rows and 100 KB. A valid upload replaces the current browser's demo catalog. Nothing is uploaded to a backend.

## Deployment

Static assets are deployed to the existing Cloudflare Pages project `facepay`. Only index.html, styles.css and app.js are required. Keep credentials outside the source tree. No production payment or biometric system is connected.
