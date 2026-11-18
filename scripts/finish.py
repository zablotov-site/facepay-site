from pathlib import Path
import re, json, html
root=Path(__file__).resolve().parent.parent
pages={
'home':('Pay with your face | facePay Demo','Explore facePay, an interactive checkout concept. Try on-device face matching, scan demo items and confirm a fictional payment. No real charges.'),
'signup':('Join the demo | facePay','Try facePay enrollment with fictional details, optional local face enrollment and a test card. Face descriptors stay on your device. No real cards are collected.'),
'checkout':('Self-checkout demo | facePay','Try the facePay self-checkout: browse the demo catalog, scan barcodes, review your basket and confirm a simulated payment. No real charges.'),
'account':('Your demo account | facePay','View your browser-only facePay demo profile, fictional wallet and itemized receipts. Manage receipt previews or clear your local demo data.'),
'business':('For stores | facePay Demo','Explore facePay for stores. Set up a fictional merchant, preview checkout and try a browser-only product catalog. This is not a live payment service.'),
'dashboard':('Store dashboard | facePay Demo','Preview the facePay store dashboard with clearly labeled sample analytics and a CSV catalog import for your local checkout demo.'),
'security':('Trust & FAQ | facePay','Learn what the facePay prototype does, what stays in your browser and what a production payment service would need. Real local face matching, demo-grade. No real payments.'),
'tzedakah':('Tzedakah mode | facePay Demo','Collector mode for charity collection: match the donor\'s face, hear the amount, confirm with one green button. Simulated charge, browser-only.'),
'settings':('Admin settings | facePay','facePay admin settings: amounts, donors and receipts. Login required.'),
'notfound':('Page not found | facePay','This page is not in the facePay demo. Return home or try the self-checkout concept. No real payments are processed.')}
base='https://facepay.pages.dev'
shell=(root/'index.html').read_text()
shell=re.sub(r'<head>.*?</head>','<head>\n{{HEAD}}\n</head>',shell,flags=re.S)
shell=re.sub(r'href="#/([^\"]*)"',lambda m:'href="/'+m[1]+'"',shell)
shell=shell.replace('<main id="app" tabindex="-1"></main>','<main id="app" tabindex="-1"><noscript><div class="glass panel"><h1>facePay Demo</h1><p>This interactive prototype needs JavaScript. No real payments are processed.</p></div></noscript></main>')
shell=re.sub(r'<a class="skip-link" href="#app">Skip to content</a>\s*','',shell)
shell=shell.replace('<body>','<body>\n<a class="skip-link" href="#app">Skip to content</a>')
for name,(title,desc) in pages.items():
 url=base+('/' if name=='home' else '/'+('404' if name=='notfound' else name))
 e=html.escape
 head=f'''<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#04060f">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="facePay Demo">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{base}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="facePay wordmark on a dark glass aurora background. Interactive demo, no real payments.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{base}/og.jpg">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/x-icon" sizes="16x16 32x32 48x48" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/styles.css?v=7">'''
 if name in ('notfound','settings'):head+='\n<meta name="robots" content="noindex">'
 out=shell.replace('{{HEAD}}',head).replace('/app.js?v=6','/app.js?v=7')
 if name=='notfound':out=out.replace('<body>','<body data-not-found="true">')
 (root/('index.html' if name=='home' else ('404.html' if name=='notfound' else name+'.html'))).write_text(out)
(root/'page-meta.json').write_text(json.dumps(pages,indent=2)+'\n')
(root/'site.webmanifest').write_text(json.dumps({'name':'facePay Demo','short_name':'facePay','description':'Interactive checkout prototype. No real payments.','start_url':'/','scope':'/','display':'standalone','background_color':'#04060f','theme_color':'#04060f','icons':[{'src':'/icon-192.png','sizes':'192x192','type':'image/png'},{'src':'/icon-512.png','sizes':'512x512','type':'image/png'}]},indent=2)+'\n')
(root/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+base+'/sitemap.xml\n')
(root/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+base+('/' if n=='home' else '/'+n)+'</loc></url>' for n in pages if n not in ('notfound','settings'))+'</urlset>\n')
