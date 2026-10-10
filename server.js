import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const app = express();
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
const port = Number(process.env.PORT || 3000);
const dataDir = path.resolve(process.env.DATA_DIR || path.join(ROOT, '.data'));
const credentialsPath = path.join(dataDir, 'admin.json');
const sessionSecretPath = path.join(dataDir, 'session-secret');
const accountsPath = path.join(dataDir, 'accounts.json');
const cookieName = 'study_admin_session';
const userCookieName = 'study_user_session';
const sessionDurationSeconds = 12 * 60 * 60;
const DEFAULT_CREDENTIALS = {
  username: 'study-admin',
  salt: 'MD+0kK7dVBWtuVpZmBwK2g==',
  passwordHash: 'PVp1UE40/4mVYCL30qMrK8eDOEP2Wi4okglSmBMh6Wl+gIVWxFmx9AiUrlhKn5r7jjCNMvO+bMEdD0odlgyScA==',
  mustChangePassword: false,
};

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));

let sessionSecret;
let credentials;
let accounts = [];

async function initializeAuth() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    credentials = DEFAULT_CREDENTIALS;
    await writeCredentials(credentials);
  }

  try {
    sessionSecret = await fs.readFile(sessionSecretPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    sessionSecret = crypto.randomBytes(48);
    await fs.writeFile(sessionSecretPath, sessionSecret, { mode: 0o600, flag: 'wx' });
  }

  try {
    accounts = JSON.parse(await fs.readFile(accountsPath, 'utf8'));
    if (!Array.isArray(accounts)) throw new Error('Invalid account store');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    accounts = [];
    await writeAccounts(accounts);
  }
}

async function writeCredentials(nextCredentials) {
  const temporaryPath = `${credentialsPath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(nextCredentials, null, 2), { mode: 0o600 });
  await fs.rename(temporaryPath, credentialsPath);
  credentials = nextCredentials;
}

async function writeAccounts(nextAccounts) {
  const temporaryPath = `${accountsPath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(nextAccounts, null, 2), { mode: 0o600 });
  await fs.rename(temporaryPath, accountsPath);
  accounts = nextAccounts;
}

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function passwordsMatch(password, salt, expectedHash) {
  return hashPassword(password, Buffer.from(salt, 'base64')).then((actualHash) => {
    const expected = Buffer.from(expectedHash, 'base64');
    return actualHash.length === expected.length && crypto.timingSafeEqual(actualHash, expected);
  });
}

function signSession(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function getSession(req) {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((part) => {
    const separator = part.indexOf('=');
    return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
  const token = cookies[cookieName];
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  const expected = crypto.createHmac('sha256', sessionSecret).update(encodedPayload).digest();
  let provided;
  try {
    provided = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.sub !== credentials.username || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function getCookieToken(req, name) {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((part) => {
    const separator = part.indexOf('=');
    return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
  const token = cookies[name];
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  const expected = crypto.createHmac('sha256', sessionSecret).update(encodedPayload).digest();
  const provided = Buffer.from(signature, 'base64url');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function getUserSession(req) {
  const session = getCookieToken(req, userCookieName);
  if (!session || session.role !== 'user') return null;
  const account = accounts.find((entry) => entry.id === session.sub);
  return account && account.status !== 'withdrawn' ? { session, account } : null;
}

function publicAccount(account) {
  const { id, role, phone, firstName, lastName, studentClass, children = [], teacherId, status = 'active' } = account;
  const childAccounts = children.map((id) => accounts.find((entry) => entry.id === id)).filter(Boolean);
  const teacherAccount = accounts.find((entry) => entry.id === teacherId && entry.role === 'teacher');
  return {
    id, role, phone, firstName, lastName, studentClass, status,
    teacherId: teacherAccount?.id,
    teacher: teacherAccount ? { id: teacherAccount.id, firstName: teacherAccount.firstName, lastName: teacherAccount.lastName } : null,
    children: childAccounts.map(({ id: childId, firstName: childFirstName, lastName: childLastName, studentClass: childClass }) => ({ id: childId, firstName: childFirstName, lastName: childLastName, studentClass: childClass })),
  };
}

function setUserSessionCookie(res, account) {
  const token = signSession({ sub: account.id, role: 'user', exp: Date.now() + sessionDurationSeconds * 1000 });
  res.cookie(userCookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: sessionDurationSeconds * 1000,
  });
}

function clearUserSessionCookie(res) {
  res.clearCookie(userCookieName, { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/' });
}

function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Требуется войти в аккаунт администратора.' });
  req.adminSession = session;
  next();
}

function setSessionCookie(res) {
  const token = signSession({ sub: credentials.username, exp: Date.now() + sessionDurationSeconds * 1000 });
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: sessionDurationSeconds * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  });
}

const failedLoginAttempts = new Map();
function isLoginRateLimited(ip) {
  const cutoff = Date.now() - 15 * 60 * 1000;
  const attempts = (failedLoginAttempts.get(ip) || []).filter((timestamp) => timestamp > cutoff);
  failedLoginAttempts.set(ip, attempts);
  return attempts.length >= 8;
}

app.get('/api/admin/session', (req, res) => {
  const session = getSession(req);
  res.json({
    authenticated: Boolean(session),
    mustChangePassword: Boolean(session && credentials.mustChangePassword),
  });
});

app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isLoginRateLimited(ip)) {
    return res.status(429).json({ error: 'Слишком много попыток. Попробуйте ещё раз через 15 минут.' });
  }

  const { login, password } = req.body || {};
  const validLogin = typeof login === 'string' && login === credentials.username;
  const validPassword = typeof password === 'string' && password.length <= 128
    ? await passwordsMatch(password, credentials.salt, credentials.passwordHash)
    : false;
  if (!validLogin || !validPassword) {
    failedLoginAttempts.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Неверный логин или пароль.' });
  }

  failedLoginAttempts.delete(ip);
  setSessionCookie(res);
  return res.json({ ok: true });
});

app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || currentPassword.length > 128 || !(await passwordsMatch(currentPassword, credentials.salt, credentials.passwordHash))) {
    return res.status(401).json({ error: 'Текущий пароль указан неверно.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: 'Новый пароль должен содержать от 8 до 128 символов.' });
  }
  if (await passwordsMatch(newPassword, credentials.salt, credentials.passwordHash)) {
    return res.status(400).json({ error: 'Новый пароль должен отличаться от текущего.' });
  }

  const salt = crypto.randomBytes(16);
  const passwordHash = await hashPassword(newPassword, salt);
  await writeCredentials({
    username: credentials.username,
    salt: salt.toString('base64'),
    passwordHash: passwordHash.toString('base64'),
    mustChangePassword: false,
  });
  return res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

const accountRoles = new Set(['student', 'parent', 'teacher']);
const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

app.get('/api/admin/students', requireAdmin, (_req, res) => {
  res.json(accounts.filter((account) => account.role === 'student').map(publicAccount));
});

app.get('/api/admin/accounts', requireAdmin, (_req, res) => {
  res.json(accounts.map(publicAccount));
});

app.post('/api/admin/accounts', requireAdmin, async (req, res) => {
  const { role, phone, password, firstName, lastName, studentClass, children, teacherId } = req.body || {};
  const normalizedPhone = normalizePhone(phone);
  if (!accountRoles.has(role)) return res.status(400).json({ error: 'Выберите тип аккаунта.' });
  if (normalizedPhone.length < 10 || normalizedPhone.length > 16) return res.status(400).json({ error: 'Введите корректный номер телефона.' });
  if (accounts.some((account) => account.phone === normalizedPhone)) return res.status(409).json({ error: 'Аккаунт с таким номером телефона уже существует.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Пароль должен содержать от 8 до 128 символов.' });
  if (typeof firstName !== 'string' || !firstName.trim() || firstName.trim().length > 80 || typeof lastName !== 'string' || !lastName.trim() || lastName.trim().length > 80) {
    return res.status(400).json({ error: 'Укажите имя и фамилию (до 80 символов каждое).' });
  }
  if (role === 'student' && !/^([5-9]) класс$/.test(studentClass || '')) return res.status(400).json({ error: 'Выберите класс ученика с 5 по 9.' });
  if (role === 'student' && !accounts.some((account) => account.id === teacherId && account.role === 'teacher')) return res.status(400).json({ error: 'Выберите преподавателя для ученика.' });
  let linkedChildren = [];
  if (role === 'parent') {
    linkedChildren = [...new Set(Array.isArray(children) ? children : [])];
    if (!linkedChildren.length) return res.status(400).json({ error: 'Для аккаунта родителя выберите хотя бы одного ученика.' });
    if (linkedChildren.some((id) => !accounts.some((account) => account.id === id && account.role === 'student'))) return res.status(400).json({ error: 'В списке есть неизвестный ученик.' });
  }

  const salt = crypto.randomBytes(16);
  const passwordHash = await hashPassword(password, salt);
  const account = {
    id: crypto.randomUUID(), role, phone: normalizedPhone, firstName: firstName.trim(), lastName: lastName.trim(), status: 'active',
    studentClass: role === 'student' ? studentClass : '', teacherId: role === 'student' ? teacherId : undefined, children: linkedChildren,
    salt: salt.toString('base64'), passwordHash: passwordHash.toString('base64'), createdAt: new Date().toISOString(),
  };
  await writeAccounts([...accounts, account]);
  return res.status(201).json({ account: publicAccount(account) });
});

app.put('/api/admin/accounts/:id', requireAdmin, async (req, res) => {
  const index = accounts.findIndex((account) => account.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Аккаунт не найден.' });
  const current = accounts[index];
  const { phone, password, firstName, lastName, studentClass, children, teacherId } = req.body || {};
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 10 || normalizedPhone.length > 16) return res.status(400).json({ error: 'Введите корректный номер телефона.' });
  if (accounts.some((account) => account.id !== current.id && account.phone === normalizedPhone)) return res.status(409).json({ error: 'Аккаунт с таким номером телефона уже существует.' });
  if (typeof firstName !== 'string' || !firstName.trim() || firstName.trim().length > 80 || typeof lastName !== 'string' || !lastName.trim() || lastName.trim().length > 80) {
    return res.status(400).json({ error: 'Укажите имя и фамилию (до 80 символов каждое).' });
  }
  if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < 8 || password.length > 128)) return res.status(400).json({ error: 'Новый пароль должен содержать от 8 до 128 символов.' });
  let linkedChildren = current.children || [];
  if (current.role === 'student') {
    if (!/^([5-9]) класс$/.test(studentClass || '')) return res.status(400).json({ error: 'Выберите класс ученика с 5 по 9.' });
    if (!accounts.some((account) => account.id === teacherId && account.role === 'teacher')) return res.status(400).json({ error: 'Выберите преподавателя для ученика.' });
  }
  if (current.role === 'parent') {
    linkedChildren = [...new Set(Array.isArray(children) ? children : [])];
    if (!linkedChildren.length) return res.status(400).json({ error: 'Для аккаунта родителя выберите хотя бы одного ученика.' });
    if (linkedChildren.some((id) => !accounts.some((account) => account.id === id && account.role === 'student'))) return res.status(400).json({ error: 'В списке есть неизвестный ученик.' });
  }

  let updated = {
    ...current, phone: normalizedPhone, firstName: firstName.trim(), lastName: lastName.trim(),
    studentClass: current.role === 'student' ? studentClass : '',
    teacherId: current.role === 'student' ? teacherId : undefined,
    children: current.role === 'parent' ? linkedChildren : [],
  };
  if (typeof password === 'string' && password.length) {
    const salt = crypto.randomBytes(16);
    const passwordHash = await hashPassword(password, salt);
    updated = { ...updated, salt: salt.toString('base64'), passwordHash: passwordHash.toString('base64') };
  }
  const nextAccounts = [...accounts];
  nextAccounts[index] = updated;
  await writeAccounts(nextAccounts);
  return res.json({ account: publicAccount(updated) });
});

app.delete('/api/admin/accounts/:id', requireAdmin, async (req, res) => {
  const account = accounts.find((entry) => entry.id === req.params.id);
  if (!account) return res.status(404).json({ error: 'Аккаунт не найден.' });
  if (account.role === 'teacher' && accounts.some((entry) => entry.role === 'student' && entry.status !== 'withdrawn' && entry.teacherId === account.id)) {
    return res.status(409).json({ error: 'К преподавателю прикреплены ученики. Сначала назначьте им другого преподавателя.' });
  }
  const nextAccounts = accounts
    .filter((entry) => entry.id !== account.id)
    .map((entry) => {
      if (entry.role === 'parent' && account.role === 'student') return { ...entry, children: (entry.children || []).filter((id) => id !== account.id) };
      if (entry.role === 'student' && account.role === 'teacher' && entry.teacherId === account.id) return { ...entry, teacherId: undefined };
      return entry;
    });
  await writeAccounts(nextAccounts);
  return res.json({ ok: true });
});

app.post('/api/admin/accounts/:id/archive', requireAdmin, async (req, res) => {
  const index = accounts.findIndex((entry) => entry.id === req.params.id && entry.role === 'student');
  if (index < 0) return res.status(404).json({ error: 'Ученик не найден.' });
  if (accounts[index].status === 'withdrawn') return res.status(409).json({ error: 'Ученик уже находится в разделе «Выбывшие».' });
  const nextAccounts = [...accounts];
  nextAccounts[index] = { ...nextAccounts[index], status: 'withdrawn', withdrawnAt: new Date().toISOString() };
  await writeAccounts(nextAccounts);
  return res.json({ ok: true });
});

app.post('/api/admin/accounts/:id/restore', requireAdmin, async (req, res) => {
  const index = accounts.findIndex((entry) => entry.id === req.params.id && entry.role === 'student');
  if (index < 0) return res.status(404).json({ error: 'Ученик не найден.' });
  if (accounts[index].status !== 'withdrawn') return res.status(409).json({ error: 'Ученик уже находится в активном списке.' });
  if (!accounts.some((entry) => entry.id === accounts[index].teacherId && entry.role === 'teacher')) return res.status(409).json({ error: 'Нельзя вернуть ученика без преподавателя. Отредактируйте аккаунт и выберите преподавателя.' });
  const nextAccounts = [...accounts];
  const { withdrawnAt: _withdrawnAt, ...rest } = nextAccounts[index];
  nextAccounts[index] = { ...rest, status: 'active' };
  await writeAccounts(nextAccounts);
  return res.json({ ok: true });
});

app.get('/api/auth/session', (req, res) => {
  const user = getUserSession(req);
  res.json({ authenticated: Boolean(user), account: user ? publicAccount(user.account) : null });
});

app.post('/api/auth/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isLoginRateLimited(ip)) return res.status(429).json({ error: 'Слишком много попыток. Попробуйте ещё раз через 15 минут.' });
  const phone = normalizePhone(req.body?.phone);
  const password = req.body?.password;
  const account = accounts.find((entry) => entry.phone === phone);
  const validPassword = account && account.status !== 'withdrawn' && typeof password === 'string' && password.length <= 128
    ? await passwordsMatch(password, account.salt, account.passwordHash)
    : false;
  if (!validPassword) {
    if (!failedLoginAttempts.has(ip)) failedLoginAttempts.set(ip, []);
    failedLoginAttempts.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Неверный номер телефона или пароль.' });
  }
  failedLoginAttempts.delete(ip);
  setUserSessionCookie(res, account);
  return res.json({ account: publicAccount(account) });
});

app.post('/api/auth/logout', (_req, res) => {
  clearUserSessionCookie(res);
  res.json({ ok: true });
});

async function start() {
  await initializeAuth();

  if (isProduction) {
    const distDir = path.join(ROOT, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      configFile: path.join(ROOT, 'vite.config.ts'),
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`StudyTask server listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Could not start StudyTask server:', error);
  process.exitCode = 1;
});
