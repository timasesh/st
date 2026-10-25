// Показ логина/пароля ученику в настройках и вход на сайт из Mini App одним нажатием.
// Пароль в аккаунте хранится только как scrypt-хэш, поэтому для показа держим отдельную
// зашифрованную копию (AES-256-GCM, ключ из секрета сервера). Копию снимаем при входе по паролю,
// смене пароля и создании/изменении пароля администратором. Перед показом сверяем с хэшем.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const STORE_KEY = 'account_pw_view';
const LINK_TTL_MS = 2 * 60 * 1000;

export function createAccountAccess({ getSupabase, dataDir, getAccounts, refreshAccounts, getUserSession, setUserSessionCookie, getSecret, passwordsMatch }) {
  const storePath = path.join(dataDir, 'account-pw-view.json');
  let cache = null;
  let chain = Promise.resolve();
  const usedLinks = new Map();

  const key = () => crypto.createHmac('sha256', getSecret()).update('pw-view-v1').digest();
  const enc = (text) => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
    const body = Buffer.concat([c.update(text, 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
  };
  const dec = (value) => {
    try {
      const buf = Buffer.from(value, 'base64');
      const d = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
      d.setAuthTag(buf.subarray(12, 28));
      return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
    } catch { return null; }
  };

  async function load() {
    if (cache) return cache;
    let raw = null;
    const supabase = getSupabase();
    try {
      if (supabase) {
        const r = await supabase.from('app_settings').select('value').eq('key', STORE_KEY).maybeSingle();
        if (!r.error && r.data?.value) raw = JSON.parse(r.data.value);
      } else raw = JSON.parse(await fs.readFile(storePath, 'utf8'));
    } catch { raw = null; }
    cache = raw && typeof raw === 'object' ? raw : {};
    return cache;
  }
  async function save() {
    const supabase = getSupabase();
    const snapshot = JSON.stringify(cache);
    if (supabase) {
      const r = await supabase.from('app_settings').upsert({ key: STORE_KEY, value: snapshot }, { onConflict: 'key' });
      if (r.error) throw new Error(r.error.message);
    } else {
      await fs.mkdir(dataDir, { recursive: true });
      const tmp = `${storePath}.tmp`;
      await fs.writeFile(tmp, snapshot, { mode: 0o600 });
      await fs.rename(tmp, storePath);
    }
  }
  // Запоминаем пароль (не ломаем вход, если хранилище недоступно).
  function remember(accountId, password) {
    if (!accountId || typeof password !== 'string' || !password || password.length > 128) return Promise.resolve();
    chain = chain.then(async () => {
      await load();
      cache[accountId] = enc(password);
      await save();
    }).catch((error) => console.warn('account-access: не удалось сохранить', error.message));
    return chain;
  }

  const sign = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${crypto.createHmac('sha256', getSecret()).update(`weblink:${body}`).digest('base64url')}`;
  };
  const verify = (token) => {
    if (typeof token !== 'string' || token.length > 600) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(`weblink:${body}`).digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    try { const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); return p.exp > Date.now() ? p : null; } catch { return null; }
  };

  function register(app) {
    app.get('/api/auth/credentials', async (req, res) => {
      res.set('Cache-Control', 'no-store');
      await refreshAccounts();
      const user = getUserSession(req);
      if (!user) return res.status(401).json({ error: 'Сеанс завершён. Войдите в аккаунт снова.' });
      const store = await load();
      let password = null;
      const value = store[user.account.id] ? dec(store[user.account.id]) : null;
      if (value && await passwordsMatch(value, user.account.salt, user.account.passwordHash)) password = value;
      return res.json({ login: user.account.phone, password });
    });

    app.post('/api/auth/web-link', async (req, res) => {
      res.set('Cache-Control', 'no-store');
      await refreshAccounts();
      const user = getUserSession(req);
      if (!user) return res.status(401).json({ error: 'Сеанс завершён. Войдите в аккаунт снова.' });
      const t = sign({ sub: user.account.id, exp: Date.now() + LINK_TTL_MS, n: crypto.randomBytes(8).toString('hex') });
      const dest = user.account.role === 'student' ? '/student' : user.account.role === 'parent' ? '/parent' : '/student';
      return res.json({ url: `${(req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim()}://${req.get('host')}/api/auth/web-login?t=${encodeURIComponent(t)}&to=${encodeURIComponent(dest)}` });
    });

    app.get('/api/auth/web-login', async (req, res) => {
      res.set('Cache-Control', 'no-store');
      await refreshAccounts();
      const p = verify(req.query.t);
      for (const [n, exp] of usedLinks) if (exp < Date.now()) usedLinks.delete(n);
      if (!p || usedLinks.has(p.n)) return res.redirect(302, '/');
      const account = getAccounts().find((a) => a.id === p.sub && a.status !== 'withdrawn');
      if (!account) return res.redirect(302, '/');
      usedLinks.set(p.n, p.exp);
      setUserSessionCookie(res, account);
      const to = ['/student', '/parent'].includes(req.query.to) ? req.query.to : '/student';
      return res.redirect(302, to);
    });
  }
  return { register, remember };
}
