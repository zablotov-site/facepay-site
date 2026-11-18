import { json, err, readSession, makeToken, sessionCookie, checkPassword, hashPassword, getSetting, setSetting, loadSettings } from '../_lib.js';
import { chargeCard } from '../_charge.js';

const nowIso = () => new Date().toISOString();
const rid = (p) => p + '-' + crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const validDesc = (d) => Array.isArray(d) && d.length === 128 && d.every((x) => typeof x === 'number' && isFinite(x));
const donorOut = (r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, card_label: r.card_label, card_last4: r.card_last4, has_face: !!r.face_json, created_at: r.created_at, updated_at: r.updated_at, total_cents: r.total_cents || 0, gifts: r.gifts || 0 });
const donationOut = (r) => ({ id: r.id, donor_id: r.donor_id, donor_name: r.donor_name, amount_cents: r.amount_cents, currency: r.currency, charge_status: r.charge_status, charge_ref: r.charge_ref, video_id: r.video_id, heard: r.heard, voided: !!r.voided, created_at: r.created_at });

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const path = '/' + (Array.isArray(params.path) ? params.path.join('/') : params.path || '');
  const method = request.method;
  if (!env.DB) return err(500, 'Database not bound');
  try {
    if (path === '/login' && method === 'POST') return login(request, env);
    if (path === '/logout' && method === 'POST') return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
    const sess = await readSession(env, request);
    if (path === '/me') return json(sess ? { user: sess.user, role: sess.role } : { user: null });
    if (!sess) return err(401, 'login required');
    const admin = sess.role === 'admin';
    const need = (ok) => (ok ? null : err(403, 'admin only'));
    let m;

    if (path === '/settings' && method === 'GET') return json(await loadSettings(env));
    if (path === '/settings' && method === 'PUT') {
      const bad = need(admin); if (bad) return bad;
      const b = await request.json();
      const cur = await loadSettings(env);
      const amounts = Array.isArray(b.amounts) ? [...new Set(b.amounts.map(Number).filter((n) => n > 0 && n <= 5000))].sort((a, c) => a - c).slice(0, 16) : cur.amounts;
      if (!amounts.length) return err(400, 'at least one amount');
      const next = { amounts, org_name: clean(b.org_name ?? cur.org_name, 60) || cur.org_name, lang: b.lang === 'en' ? 'en' : 'yi', max_amount: Math.min(5000, Math.max(1, Number(b.max_amount) || cur.max_amount)), min_amount: 1 };
      await setSetting(env, 'config', JSON.stringify(next));
      return json(next);
    }

    if (path === '/donors' && method === 'GET') {
      const rs = await env.DB.prepare("SELECT d.*, COALESCE(SUM(CASE WHEN n.voided=0 THEN n.amount_cents END),0) total_cents, COUNT(CASE WHEN n.voided=0 THEN 1 END) gifts FROM donors d LEFT JOIN donations n ON n.donor_id=d.id GROUP BY d.id ORDER BY d.created_at DESC LIMIT 1000").all();
      return json({ donors: rs.results.map(donorOut) });
    }
    if (path === '/donors' && method === 'POST') {
      const b = await request.json();
      const name = clean(b.name, 60); if (!name) return err(400, 'name required');
      const face = null; // biometrics stay on the device in this milestone
      const id = b.guest ? 'guest' : rid('D'), t = nowIso();
      await env.DB.prepare('INSERT OR IGNORE INTO donors(id,name,phone,email,card_label,card_last4,face_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id, name, clean(b.phone, 30), clean(b.email, 100), 'Test card', '4242', face, t, t).run();
      const r = await env.DB.prepare('SELECT * FROM donors WHERE id=?').bind(id).first();
      return json({ donor: donorOut(r) }, 201);
    }
    if ((m = path.match(/^\/donors\/([\w-]+)$/))) {
      const id = m[1];
      if (method === 'GET') {
        const r = await env.DB.prepare('SELECT * FROM donors WHERE id=?').bind(id).first(); if (!r) return err(404, 'not found');
        const ds = await env.DB.prepare('SELECT * FROM donations WHERE donor_id=? ORDER BY created_at DESC LIMIT 500').bind(id).all();
        return json({ donor: donorOut(r), donations: ds.results.map(donationOut) });
      }
      const bad = need(admin); if (bad) return bad;
      if (method === 'PUT') {
        const b = await request.json(), name = clean(b.name, 60); if (!name) return err(400, 'name required');
        await env.DB.prepare('UPDATE donors SET name=?,phone=?,email=?,updated_at=? WHERE id=?').bind(name, clean(b.phone, 30), clean(b.email, 100), nowIso(), id).run();
        return json({ ok: true });
      }
      if (method === 'DELETE') {
        const ds = await env.DB.prepare('SELECT video_id FROM donations WHERE donor_id=? AND video_id IS NOT NULL').bind(id).all();
        await env.DB.batch([env.DB.prepare('DELETE FROM donations WHERE donor_id=?').bind(id), env.DB.prepare('DELETE FROM donors WHERE id=?').bind(id)]);
        return json({ ok: true });
      }
    }

    if (path === '/donations' && method === 'GET') {
      const rs = await env.DB.prepare('SELECT * FROM donations ORDER BY created_at DESC LIMIT 1000').all();
      const bad = need(admin); if (bad) return bad;
      return json({ donations: rs.results.map(donationOut) });
    }
    if (path === '/donations' && method === 'POST') {
      const b = await request.json(), cfg = await loadSettings(env);
      const amt = Math.round(Number(b.amount) * 100);
      if (!(amt >= 100 && amt <= cfg.max_amount * 100)) return err(400, 'amount out of range');
      const donor = await env.DB.prepare('SELECT * FROM donors WHERE id=?').bind(clean(b.donor_id, 40)).first();
      if (!donor) return err(404, 'donor not found');
      const vid = null; // clips stay on the collector device
      const ch = await chargeCard({ amountCents: amt, currency: 'USD', donor, env });
      const id = rid('TZ'), t = nowIso();
      await env.DB.prepare('INSERT INTO donations(id,donor_id,donor_name,amount_cents,currency,charge_status,charge_ref,video_id,heard,voided,created_at) VALUES(?,?,?,?,?,?,?,?,?,0,?)').bind(id, donor.id, donor.name, amt, 'USD', ch.status, ch.ref, vid, clean(b.heard, 120), t).run();
      return json({ donation: donationOut({ id, donor_id: donor.id, donor_name: donor.name, amount_cents: amt, currency: 'USD', charge_status: ch.status, charge_ref: ch.ref, video_id: vid, heard: clean(b.heard, 120), voided: 0, created_at: t }), donor: donorOut(donor) }, 201);
    }
    if ((m = path.match(/^\/donations\/([\w-]+)$/))) {
      const bad = need(admin); if (bad) return bad;
      if (method === 'PUT') { const b = await request.json(); await env.DB.prepare('UPDATE donations SET voided=? WHERE id=?').bind(b.voided ? 1 : 0, m[1]).run(); return json({ ok: true }); }
      if (method === 'DELETE') {
        const r = await env.DB.prepare('SELECT video_id FROM donations WHERE id=?').bind(m[1]).first();
        await env.DB.prepare('DELETE FROM donations WHERE id=?').bind(m[1]).run(); return json({ ok: true });
      }
    }

    if (path === '/account/password' && method === 'PUT') {
      const bad = need(admin); if (bad) return bad;
      const b = await request.json();
      if (!(await checkPassword(await getSetting(env, 'admin_cred'), sess.user, String(b.current || '')))) return err(403, 'current password is wrong');
      const np = String(b.next || ''); if (np.length < 10) return err(400, 'at least 10 characters');
      await setSetting(env, 'admin_cred', await hashPassword(np, 'ari'));
      await setSetting(env, 'session_secret', ''); // signs out every session
      return json({ ok: true, relogin: true }, 200, { 'set-cookie': sessionCookie('', 0) });
    }
    if (path === '/account/collector' && method === 'GET') { const bad = need(admin); if (bad) return bad; return json({ set: !!(await getSetting(env, 'collector_cred')) }); }
    if (path === '/account/collector' && method === 'PUT') {
      const bad = need(admin); if (bad) return bad;
      const b = await request.json();
      if (b.remove) { await setSetting(env, 'collector_cred', ''); return json({ ok: true, set: false }); }
      const pin = String(b.pin || ''); if (!/^\d{6,12}$/.test(pin)) return err(400, 'PIN must be 6 to 12 digits');
      await setSetting(env, 'collector_cred', await hashPassword(pin, 'collector'));
      return json({ ok: true, set: true });
    }
    return err(404, 'no such endpoint');
  } catch (e) { return err(500, 'server error'); }
}

async function login(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'x', key = 'fail:' + ip, now = Date.now();
  const f = (await getSetting(env, key)) || '0|0'; const [n, t] = f.split('|').map(Number);
  if (n >= 6 && now - t < 15 * 60 * 1000) return err(429, 'too many attempts, try again in 15 minutes');
  let b; try { b = await request.json(); } catch (e) { return err(400, 'bad request'); }
  const u = String(b.username || '').trim().toLowerCase(), p = String(b.password || '');
  let role = null;
  if (u === 'ari' && (await checkPassword(await getSetting(env, 'admin_cred'), u, p))) role = 'admin';
  else if (u === 'collector') { const c = await getSetting(env, 'collector_cred'); if (c && (await checkPassword(c, u, p))) role = 'collector'; }
  if (!role) { await setSetting(env, key, (now - t > 15 * 60 * 1000 ? 1 : n + 1) + '|' + now); return err(401, 'wrong username or password'); }
  await setSetting(env, key, '0|0');
  const ttl = role === 'admin' ? 60 * 60 * 8 : 60 * 60 * 12;
  return json({ user: u, role }, 200, { 'set-cookie': sessionCookie(await makeToken(env, u, role, ttl), ttl) });
}
