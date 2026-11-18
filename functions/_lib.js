const enc = new TextEncoder();
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
export const err = (status, message) => json({ error: message }, status);
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export async function getSetting(env, k) {
  const r = await env.DB.prepare('SELECT v FROM settings WHERE k=?').bind(k).first();
  return r ? r.v : null;
}
export async function setSetting(env, k, v) {
  await env.DB.prepare('INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(k, v).run();
}
async function secret(env) {
  let s = await getSetting(env, 'session_secret');
  if (!s) { s = b64u(crypto.getRandomValues(new Uint8Array(32))); await setSetting(env, 'session_secret', s); }
  return s;
}
const hmacKey = async (s) => crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
export async function makeToken(env, user, role, ttlSec = 60 * 60 * 12) {
  const body = b64u(enc.encode(JSON.stringify({ u: user, r: role, e: Math.floor(Date.now() / 1000) + ttlSec })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(await secret(env)), enc.encode(body));
  return body + '.' + b64u(sig);
}
export async function readSession(env, request) {
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)fp_session=([^;]+)/);
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(await secret(env)), unb64u(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    if (p.e < Date.now() / 1000) return null;
    // sessions die when credentials change (version stamp)
    return { user: p.u, role: p.r };
  } catch (e) { return null; }
}
export const sessionCookie = (token, maxAge) => `fp_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
export async function hashPassword(pw, user, it = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2(pw, salt, it);
  return JSON.stringify({ u: user, s: btoa(String.fromCharCode(...salt)), h: btoa(String.fromCharCode(...new Uint8Array(h))), it });
}
async function pbkdf2(pw, salt, it) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, k, 256);
}
export async function checkPassword(credJson, user, pw) {
  if (!credJson) return false;
  const c = JSON.parse(credJson);
  if (String(user).toLowerCase() !== c.u) return false;
  const h = new Uint8Array(await pbkdf2(pw, unb64(c.s), c.it || 100000));
  const want = unb64(c.h);
  if (h.length !== want.length) return false;
  let d = 0; for (let i = 0; i < h.length; i++) d |= h[i] ^ want[i];
  return d === 0;
}
export const DEFAULT_SETTINGS = { amounts: [5, 10, 18, 36, 50, 72, 100, 180], org_name: 'Tzedakah', lang: 'yi', max_amount: 5000, min_amount: 1 };
export async function loadSettings(env) {
  const v = await getSetting(env, 'config');
  let o = {}; try { o = v ? JSON.parse(v) : {}; } catch (e) {}
  return { ...DEFAULT_SETTINGS, ...o };
}
