import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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
const schedulePath = path.join(dataDir, 'schedule.json');
const auditLogPath = path.join(dataDir, 'admin-audit.json');
const inboxesPath = path.join(dataDir, 'account-inboxes.json');
const studentLessonHistoryPath = path.join(dataDir, 'student-lesson-history.json');
const cookieName = 'study_admin_session';
const userCookieName = 'study_user_session';
const sessionDurationSeconds = 12 * 60 * 60;
const DEFAULT_CREDENTIALS = {
  username: 'timaadmin',
  salt: '8eaDDuWATmBuSe0bN9yY6g==',
  passwordHash: 'xBlWaStWhFYz1ClSRAWhhn4kMQsOo2s9k/EUHNPkcu7IeZA4PZ6R05E+xaqKpg7IlVmARYa7OKT8cvDBszOqfA==',
  mustChangePassword: true,
};
const LEGACY_DEFAULT_PASSWORD_HASH = 'PVp1UE40/4mVYCL30qMrK8eDOEP2Wi4okglSmBMh6Wl+gIVWxFmx9AiUrlhKn5r7jjCNMvO+bMEdD0odlgyScA==';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));

let sessionSecret;
let credentials;
let accounts = [];
let supabase = null;
let persistedAccountsSnapshot = [];

function snapshotAccounts(nextAccounts) {
  return JSON.parse(JSON.stringify(nextAccounts));
}

async function fetchSupabaseAccounts() {
  const allRows = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase.from('accounts').select('*').order('created_at', { ascending: true }).range(offset, offset + 999);
    if (result.error) throw new Error(`Could not read accounts from Supabase: ${result.error.message}`);
    allRows.push(...result.data);
    if (result.data.length < 1000) break;
  }
  return allRows.map(accountFromDatabase);
}

async function refreshAccounts() {
  if (!supabase) return;
  accounts = await fetchSupabaseAccounts();
  persistedAccountsSnapshot = snapshotAccounts(accounts);
}

function accountFromDatabase(row) {
  return {
    id: row.id,
    role: row.role,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    studentClass: row.student_class || '',
    teacherId: row.teacher_id || undefined,
    children: row.children || [],
    status: row.status || 'active',
    salt: row.password_salt,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    withdrawnAt: row.withdrawn_at || undefined,
    progress: row.progress || null,
  };
}

function accountToDatabase(account) {
  return {
    id: account.id,
    role: account.role,
    phone: account.phone,
    first_name: account.firstName,
    last_name: account.lastName,
    student_class: account.studentClass || null,
    teacher_id: account.teacherId || null,
    children: account.children || [],
    status: account.status || 'active',
    password_salt: account.salt,
    password_hash: account.passwordHash,
    created_at: account.createdAt || new Date().toISOString(),
    withdrawn_at: account.withdrawnAt || null,
    progress: account.progress || null,
  };
}

async function readJsonFileOr(filePath, fallback) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function initializeFileStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  credentials = await readJsonFileOr(credentialsPath, DEFAULT_CREDENTIALS);
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const bootstrapUsername = process.env.ADMIN_BOOTSTRAP_USERNAME || DEFAULT_CREDENTIALS.username;
  if (credentials.username !== bootstrapUsername || credentials.passwordHash === LEGACY_DEFAULT_PASSWORD_HASH) {
    if (!bootstrapPassword && credentials.username === bootstrapUsername && credentials.passwordHash !== LEGACY_DEFAULT_PASSWORD_HASH) {
      // Keep an already-customized administrator password.
    } else if (!bootstrapPassword) {
      credentials = DEFAULT_CREDENTIALS;
      await writeCredentials(credentials);
    } else {
    if (bootstrapPassword.length < 8 || bootstrapPassword.length > 128) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must contain 8–128 characters.');
    const salt = crypto.randomBytes(16);
    credentials = {
      username: bootstrapUsername,
      salt: salt.toString('base64'),
      passwordHash: (await hashPassword(bootstrapPassword, salt)).toString('base64'),
      mustChangePassword: true,
    };
    await writeCredentials(credentials);
    }
  }
  if (!(await fs.stat(credentialsPath).catch(() => null))) await writeCredentials(credentials);
  try {
    sessionSecret = await fs.readFile(sessionSecretPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    sessionSecret = crypto.randomBytes(48);
    await fs.writeFile(sessionSecretPath, sessionSecret, { mode: 0o600, flag: 'wx' });
  }
  accounts = await readJsonFileOr(accountsPath, []);
}

async function initializeSupabaseStorage(secretKey) {
  supabase = createClient(process.env.SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const credentialResult = await supabase.from('admin_credentials').select('*');
  if (credentialResult.error) throw new Error(`Supabase admin_credentials: ${credentialResult.error.message}. Выполните SQL из supabase/schema.sql.`);
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const bootstrapUsername = process.env.ADMIN_BOOTSTRAP_USERNAME || DEFAULT_CREDENTIALS.username;
  const rows = credentialResult.data || [];
  const bootstrapAccountExists = rows.some((row) => row.username === bootstrapUsername);
  if (bootstrapPassword && !bootstrapAccountExists) {
    if (bootstrapPassword.length < 8 || bootstrapPassword.length > 128) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must contain 8–128 characters.');
    const salt = crypto.randomBytes(16);
    credentials = {
      username: bootstrapUsername,
      salt: salt.toString('base64'),
      passwordHash: (await hashPassword(bootstrapPassword, salt)).toString('base64'),
      mustChangePassword: true,
    };
    await writeCredentials(credentials);
  } else if (bootstrapAccountExists) {
    const row = rows.find((item) => item.username === bootstrapUsername);
    credentials = { username: row.username, salt: row.password_salt, passwordHash: row.password_hash, mustChangePassword: row.must_change_password };
    if (credentials.passwordHash === LEGACY_DEFAULT_PASSWORD_HASH) {
      credentials = DEFAULT_CREDENTIALS;
      await writeCredentials(credentials);
    }
  } else if (rows.length) {
    if (bootstrapPassword) {
      if (bootstrapPassword.length < 8 || bootstrapPassword.length > 128) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must contain 8–128 characters.');
      const salt = crypto.randomBytes(16);
      credentials = {
        username: bootstrapUsername,
        salt: salt.toString('base64'),
        passwordHash: (await hashPassword(bootstrapPassword, salt)).toString('base64'),
        mustChangePassword: true,
      };
    } else {
      credentials = DEFAULT_CREDENTIALS;
    }
    await writeCredentials(credentials);
  } else {
    credentials = await readJsonFileOr(credentialsPath, DEFAULT_CREDENTIALS);
    await writeCredentials(credentials);
  }
  const obsoleteUsernames = rows.map((row) => row.username).filter((username) => username !== credentials.username);
  if (obsoleteUsernames.length) {
    const deleteResult = await supabase.from('admin_credentials').delete().in('username', obsoleteUsernames);
    if (deleteResult.error) throw new Error(`Could not remove obsolete admin credentials from Supabase: ${deleteResult.error.message}`);
  }

  const settingsResult = await supabase.from('app_settings').select('value').eq('key', 'session_secret').maybeSingle();
  if (settingsResult.error) throw new Error(`Supabase app_settings: ${settingsResult.error.message}. Выполните SQL из supabase/schema.sql.`);
  if (settingsResult.data?.value) {
    sessionSecret = Buffer.from(settingsResult.data.value, 'base64');
  } else {
    try { sessionSecret = await fs.readFile(sessionSecretPath); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      sessionSecret = crypto.randomBytes(48);
    }
    const settingWrite = await supabase.from('app_settings').upsert({ key: 'session_secret', value: sessionSecret.toString('base64') });
    if (settingWrite.error) throw new Error(`Supabase app_settings: ${settingWrite.error.message}`);
  }

  try {
    accounts = await fetchSupabaseAccounts();
  } catch (error) {
    throw new Error(`Supabase accounts: ${error.message}. Выполните SQL из supabase/schema.sql.`);
  }
  if (accounts.length) {
    persistedAccountsSnapshot = snapshotAccounts(accounts);
  } else {
    const localAccounts = await readJsonFileOr(accountsPath, []);
    accounts = Array.isArray(localAccounts) ? localAccounts : [];
    persistedAccountsSnapshot = [];
    if (accounts.length) await writeAccounts(accounts);
  }
}

async function initializeAuth() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (Boolean(supabaseUrl) !== Boolean(secretKey)) throw new Error('Set both SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the service environment.');
  if (supabaseUrl && secretKey) return initializeSupabaseStorage(secretKey);
  return initializeFileStorage();
}

async function writeCredentials(nextCredentials) {
  if (supabase) {
    const result = await supabase.from('admin_credentials').upsert({
      username: nextCredentials.username,
      password_salt: nextCredentials.salt,
      password_hash: nextCredentials.passwordHash,
      must_change_password: Boolean(nextCredentials.mustChangePassword),
    }, { onConflict: 'username' });
    if (result.error) throw new Error(`Could not save admin credentials to Supabase: ${result.error.message}`);
  }
  const temporaryPath = `${credentialsPath}.tmp`;
  if (!supabase) {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(temporaryPath, JSON.stringify(nextCredentials, null, 2), { mode: 0o600 });
    await fs.rename(temporaryPath, credentialsPath);
  }
  credentials = nextCredentials;
}

async function recordAdminAudit(actor, action, details = '') {
  const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), actor, action, details };
  if (supabase) {
    const result = await supabase.from('app_settings').insert({ key: `admin_audit:${entry.id}`, value: JSON.stringify(entry) });
    if (result.error) throw new Error(`Could not record admin audit event: ${result.error.message}`);
    return entry;
  }
  const entries = await readJsonFileOr(auditLogPath, []);
  await fs.mkdir(dataDir, { recursive: true });
  const temporaryPath = `${auditLogPath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify([entry, ...entries], null, 2), { mode: 0o600 });
  await fs.rename(temporaryPath, auditLogPath);
  return entry;
}

async function listAdminAuditHistory() {
  if (supabase) {
    const entries = [];
    for (let offset = 0; ; offset += 1000) {
      const result = await supabase.from('app_settings').select('value').like('key', 'admin_audit:%').order('updated_at', { ascending: false }).range(offset, offset + 999);
      if (result.error) throw new Error(`Could not load admin audit history: ${result.error.message}`);
      entries.push(...result.data.map((row) => JSON.parse(row.value)));
      if (result.data.length < 1000) break;
    }
    return entries;
  }
  return readJsonFileOr(auditLogPath, []);
}

async function readAccountInbox(accountId) {
  if (!supabase) {
    const inboxes = await readJsonFileOr(inboxesPath, {});
    return inboxes[accountId] || [];
  }
  const result = await supabase.from('app_settings').select('value').eq('key', `account_inbox:${accountId}`).maybeSingle();
  if (result.error) throw new Error(`Could not load account messages: ${result.error.message}`);
  return result.data?.value ? JSON.parse(result.data.value) : [];
}

async function writeAccountInbox(accountId, messages) {
  if (supabase) {
    const result = await supabase.from('app_settings').upsert({ key: `account_inbox:${accountId}`, value: JSON.stringify(messages) });
    if (result.error) throw new Error(`Could not save account messages: ${result.error.message}`);
    return;
  }
  const inboxes = await readJsonFileOr(inboxesPath, {});
  inboxes[accountId] = messages;
  await fs.mkdir(dataDir, { recursive: true });
  const temporaryPath = `${inboxesPath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(inboxes, null, 2), { mode: 0o600 });
  await fs.rename(temporaryPath, inboxesPath);
}

async function readStudentLessonHistory(studentId) {
  const key = `student_lesson_history:${studentId}`;
  if (supabase) {
    const result = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
    if (result.error) throw new Error(`Could not load student lesson history: ${result.error.message}`);
    return result.data?.value ? JSON.parse(result.data.value) : [];
  }
  const histories = await readJsonFileOr(studentLessonHistoryPath, {});
  return histories[studentId] || [];
}

async function writeStudentLessonHistory(studentId, history) {
  const key = `student_lesson_history:${studentId}`;
  if (supabase) {
    const result = await supabase.from('app_settings').upsert({ key, value: JSON.stringify(history) });
    if (result.error) throw new Error(`Could not save student lesson history: ${result.error.message}`);
    return;
  }
  const histories = await readJsonFileOr(studentLessonHistoryPath, {});
  histories[studentId] = history;
  await fs.mkdir(dataDir, { recursive: true });
  const temporaryPath = `${studentLessonHistoryPath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(histories, null, 2), { mode: 0o600 });
  await fs.rename(temporaryPath, studentLessonHistoryPath);
}

async function recordAdminAuditSafely(actor, action, details = '') {
  try { await recordAdminAudit(actor, action, details); }
  catch (error) { console.error('Admin audit write failed:', error); }
}

async function writeAccounts(nextAccounts) {
  if (supabase) {
    const previousById = new Map(persistedAccountsSnapshot.map((account) => [account.id, account]));
    const nextById = new Map(nextAccounts.map((account) => [account.id, account]));
    const changedAccounts = nextAccounts.filter((account) => JSON.stringify(account) !== JSON.stringify(previousById.get(account.id)));
    const nextRows = changedAccounts.map(accountToDatabase);
    if (nextRows.length) {
      const upsertResult = await supabase.from('accounts').upsert(nextRows, { onConflict: 'id' });
      if (upsertResult.error) throw new Error(`Could not save accounts to Supabase: ${upsertResult.error.message}`);
    }
    const removedIds = persistedAccountsSnapshot.map((account) => account.id).filter((id) => !nextById.has(id));
    if (removedIds.length) {
      const deleteResult = await supabase.from('accounts').delete().in('id', removedIds);
      if (deleteResult.error) throw new Error(`Could not remove accounts from Supabase: ${deleteResult.error.message}`);
    }
  } else {
    const temporaryPath = `${accountsPath}.tmp`;
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(temporaryPath, JSON.stringify(nextAccounts, null, 2), { mode: 0o600 });
    await fs.rename(temporaryPath, accountsPath);
  }
  accounts = nextAccounts;
  if (supabase) persistedAccountsSnapshot = snapshotAccounts(nextAccounts);
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
  const { id, role, phone, firstName, lastName, studentClass, children = [], teacherId, status = 'active', createdAt, withdrawnAt } = account;
  const childAccounts = children.map((id) => accounts.find((entry) => entry.id === id)).filter(Boolean);
  const teacherAccount = accounts.find((entry) => entry.id === teacherId && entry.role === 'teacher');
  const parentAccount = role === 'student' ? accounts.find((entry) => entry.role === 'parent' && (entry.children || []).includes(id)) : null;
  return {
    id, role, phone, firstName, lastName, studentClass, status, createdAt, withdrawnAt,
    teacherId: teacherAccount?.id,
    teacher: teacherAccount ? { id: teacherAccount.id, firstName: teacherAccount.firstName, lastName: teacherAccount.lastName } : null,
    parent: parentAccount ? { id: parentAccount.id, firstName: parentAccount.firstName, lastName: parentAccount.lastName, phone: parentAccount.phone } : null,
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

app.get('/api/admin/history', requireAdmin, async (_req, res) => {
  try { return res.json(await listAdminAuditHistory()); }
  catch (error) { return res.status(500).json({ error: error.message || 'Не удалось загрузить историю действий.' }); }
});

app.post('/api/admin/history/theme', requireAdmin, async (req, res) => {
  const theme = req.body?.theme;
  if (theme !== 'dark' && theme !== 'light') return res.status(400).json({ error: 'Неизвестная тема оформления.' });
  await recordAdminAuditSafely(req.adminSession.sub, 'Изменена тема панели', theme === 'dark' ? 'Тёмная' : 'Светлая');
  return res.json({ ok: true });
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
  await recordAdminAuditSafely(credentials.username, 'Вход в админ-панель');
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
  await recordAdminAuditSafely(req.adminSession.sub, 'Сменён пароль администратора');
  return res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  const session = getSession(req);
  if (session) void recordAdminAuditSafely(session.sub, 'Выход из админ-панели');
  clearSessionCookie(res);
  res.json({ ok: true });
});

const accountRoles = new Set(['student', 'parent', 'teacher']);
const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

app.get('/api/admin/students', requireAdmin, async (_req, res) => {
  await refreshAccounts();
  res.json(accounts.filter((account) => account.role === 'student').map(publicAccount));
});

app.get('/api/admin/accounts', requireAdmin, async (_req, res) => {
  await refreshAccounts();
  res.json(accounts.map(publicAccount));
});

app.post('/api/admin/accounts/:id/messages', requireAdmin, async (req, res) => {
  await refreshAccounts();
  const recipient = accounts.find((account) => account.id === req.params.id && ['student', 'parent', 'teacher'].includes(account.role) && account.status !== 'withdrawn');
  if (!recipient) return res.status(404).json({ error: 'Аккаунт получателя не найден.' });
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.length > 5000) return res.status(400).json({ error: 'Сообщение должно содержать от 1 до 5000 символов.' });
  const message = { id: crypto.randomUUID(), at: new Date().toISOString(), sender: req.adminSession.sub, body, read: false };
  try {
    await writeAccountInbox(recipient.id, [message, ...await readAccountInbox(recipient.id)]);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось отправить сообщение.' });
  }
  await recordAdminAuditSafely(req.adminSession.sub, 'Отправлено сообщение', `${recipient.role}: ${recipient.firstName} ${recipient.lastName}`);
  return res.status(201).json({ message });
});

app.get('/api/admin/schedule', requireAdmin, async (_req, res) => {
  if (!supabase) {
    const saved = await readJsonFileOr(schedulePath, { lessons: [], targets: {} });
    return res.json(Array.isArray(saved) ? { lessons: saved, targets: {} } : saved);
  }
  const result = await supabase.from('app_settings').select('value').eq('key', 'weekly_schedule').maybeSingle();
  if (result.error) return res.status(500).json({ error: `Не удалось загрузить расписание: ${result.error.message}` });
  try {
    const saved = result.data?.value ? JSON.parse(result.data.value) : { lessons: [], targets: {} };
    return res.json(Array.isArray(saved) ? { lessons: saved, targets: {} } : saved);
  }
  catch { return res.status(500).json({ error: 'Данные расписания в базе повреждены.' }); }
});

app.put('/api/admin/schedule', requireAdmin, async (req, res) => {
  const lessons = req.body?.lessons;
  const incomingTargets = req.body?.targets || {};
  if (!Array.isArray(lessons) || lessons.length > 1000) return res.status(400).json({ error: 'Некорректный список занятий.' });
  const cleaned = [];
  const occupied = new Set();
  const trialLessons = await readTrialLessons();
  for (const lesson of lessons) {
    if (!lesson || typeof lesson.id !== 'string' || typeof lesson.teacherId !== 'string'
      || !Number.isInteger(lesson.day) || lesson.day < 0 || lesson.day > 5
      || !Number.isInteger(lesson.hour) || lesson.hour < 8 || lesson.hour > 20
      || typeof lesson.title !== 'string' || !lesson.title.trim() || lesson.title.trim().length > 100) {
      return res.status(400).json({ error: 'Проверьте преподавателя, день, час и название каждого урока.' });
    }
    const student = accounts.find((account) => account.id === lesson.studentId && account.role === 'student' && account.status !== 'withdrawn');
    const teacherId = student?.teacherId || lesson.teacherId;
    const teacher = accounts.find((account) => account.id === teacherId && account.role === 'teacher');
    if (lesson.studentId && !student) return res.status(400).json({ error: 'В расписании выбран неизвестный ученик.' });
    if (student && student.teacherId !== teacherId) return res.status(400).json({ error: 'У ученика изменился преподаватель. Обновите страницу и выберите ученика заново.' });
    if (!teacher) return res.status(400).json({ error: 'У ученика не назначен преподаватель.' });
    const normalizedSlotKey = `${teacherId}:${lesson.day}:${lesson.hour}`;
    if (trialLessons.some((trial) => (trial.status === 'scheduled' || trial.status === 'trial' || !trial.status) && trial.teacherId === teacherId && trial.day === lesson.day && trial.hour === lesson.hour)) {
      return res.status(409).json({ error: 'Этот слот занят пробным уроком. Выберите другое время.' });
    }
    if (occupied.has(normalizedSlotKey)) return res.status(409).json({ error: 'У преподавателя уже есть урок в этом часовом слоте.' });
    occupied.add(normalizedSlotKey);
    cleaned.push({ id: lesson.id, ...(student ? { studentId: student.id } : {}), teacherId, day: lesson.day, hour: lesson.hour, title: lesson.title.trim() });
  }
  const targets = {};
  for (const [studentId, count] of Object.entries(incomingTargets)) {
    if (accounts.some((account) => account.id === studentId && account.role === 'teacher') && Number.isInteger(count) && count >= 0 && count <= 100) continue;
    if (!accounts.some((account) => account.id === studentId && account.role === 'student') || !Number.isInteger(count) || count < 0 || count > 100) {
      return res.status(400).json({ error: 'Укажите количество занятий от 0 до 100 для существующего ученика.' });
    }
    targets[studentId] = count;
  }
  const scheduleData = { lessons: cleaned, targets };
  if (supabase) {
    const result = await supabase.from('app_settings').upsert({ key: 'weekly_schedule', value: JSON.stringify(scheduleData) });
    if (result.error) return res.status(500).json({ error: `Не удалось сохранить расписание: ${result.error.message}` });
  } else {
    await fs.mkdir(dataDir, { recursive: true });
    const temporaryPath = `${schedulePath}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(scheduleData, null, 2), { mode: 0o600 });
    await fs.rename(temporaryPath, schedulePath);
  }
  await recordAdminAuditSafely(req.adminSession.sub, 'Изменено расписание ученика', `Занятий в расписании: ${cleaned.length}`);
  return res.json(scheduleData);
});

async function readTrialLessons() {
  if (!supabase) return readJsonFileOr(path.join(dataDir, 'trial-lessons.json'), []);
  const result = await supabase.from('app_settings').select('value').eq('key', 'trial_lessons').maybeSingle();
  if (result.error) throw new Error(`Не удалось загрузить пробные уроки: ${result.error.message}`);
  return result.data?.value ? JSON.parse(result.data.value) : [];
}

async function writeTrialLessons(lessons) {
  if (supabase) {
    const result = await supabase.from('app_settings').upsert({ key: 'trial_lessons', value: JSON.stringify(lessons) });
    if (result.error) throw new Error(`Не удалось сохранить пробный урок: ${result.error.message}`);
    return;
  }
  await fs.mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, 'trial-lessons.json');
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(lessons, null, 2), { mode: 0o600 });
  await fs.rename(temporaryPath, filePath);
}

function nextTrialSlotStart(day, hour, baseDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(baseDate);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const weekdays = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const today = weekdays[values.weekday];
  let delta = (day - today + 7) % 7;
  const currentMinutes = Number(values.hour) * 60 + Number(values.minute);
  if (delta === 0 && currentMinutes >= (hour + 1) * 60) delta = 7;
  const [year, month, date] = [Number(values.year), Number(values.month), Number(values.day)];
  const slotDate = new Date(Date.UTC(year, month - 1, date + delta));
  const target = { year: slotDate.getUTCFullYear(), month: slotDate.getUTCMonth() + 1, day: slotDate.getUTCDate(), hour };
  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour);
  let candidate = targetAsUtc;
  const targetZoneFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const local = Object.fromEntries(targetZoneFormatter.formatToParts(new Date(candidate)).map(({ type, value }) => [type, value]));
    const localAsUtc = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute));
    candidate += targetAsUtc - localAsUtc;
  }
  return new Date(candidate).toISOString();
}

function getTrialScheduledAt(lesson) {
  return lesson.scheduledAt || nextTrialSlotStart(lesson.day, lesson.hour, new Date(lesson.createdAt || Date.now()));
}

app.get('/api/admin/trial-lessons', requireAdmin, async (_req, res) => {
  try {
    await refreshAccounts();
    const lessons = await readTrialLessons();
    return res.json(lessons.map((lesson) => ({
      ...lesson,
      scheduledAt: getTrialScheduledAt(lesson),
      teacher: publicAccount(accounts.find((account) => account.id === lesson.teacherId) || { id: '', role: 'teacher', phone: '', firstName: 'Удалённый', lastName: 'преподаватель' }),
    })));
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось загрузить пробные уроки.' }); }
});

app.post('/api/admin/trial-lessons', requireAdmin, async (req, res) => {
  await refreshAccounts();
  const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : '';
  const lastName = typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : '';
  const studentClass = typeof req.body?.studentClass === 'string' ? req.body.studentClass.trim() : '';
  const parentPhone = normalizePhone(req.body?.parentPhone);
  const { teacherId, day, hour } = req.body || {};
  const teacher = accounts.find((account) => account.id === teacherId && account.role === 'teacher');
  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 || !['5 класс', '6 класс', '7 класс', '8 класс', '9 класс'].includes(studentClass) || parentPhone.length < 10 || parentPhone.length > 16) {
    return res.status(400).json({ error: 'Укажите имя, фамилию, класс ученика и корректный номер родителя.' });
  }
  if (!teacher || !Number.isInteger(day) || day < 0 || day > 5 || !Number.isInteger(hour) || hour < 8 || hour > 20) {
    return res.status(400).json({ error: 'Выберите преподавателя и временной слот.' });
  }
  try {
    const savedSchedule = supabase
      ? await supabase.from('app_settings').select('value').eq('key', 'weekly_schedule').maybeSingle()
      : null;
    if (savedSchedule?.error) throw savedSchedule.error;
    const schedule = savedSchedule ? (savedSchedule.data?.value ? JSON.parse(savedSchedule.data.value) : { lessons: [] }) : await readJsonFileOr(schedulePath, { lessons: [] });
    const plannedLessons = Array.isArray(schedule) ? schedule : schedule.lessons || [];
    const trials = await readTrialLessons();
    const occupied = plannedLessons.some((lesson) => lesson.teacherId === teacherId && lesson.day === day && lesson.hour === hour)
      || trials.some((lesson) => (lesson.status === 'scheduled' || lesson.status === 'trial' || !lesson.status) && lesson.teacherId === teacherId && lesson.day === day && lesson.hour === hour);
    if (occupied) return res.status(409).json({ error: 'Этот слот преподавателя уже занят. Выберите другое время.' });
    const createdAt = new Date().toISOString();
    const trial = { id: crypto.randomUUID(), firstName, lastName, studentClass, parentPhone, teacherId, day, hour, createdAt, scheduledAt: nextTrialSlotStart(day, hour, new Date(createdAt)), status: 'scheduled' };
    await writeTrialLessons([trial, ...trials]);
    await recordAdminAuditSafely(req.adminSession.sub, 'Создан пробный урок', `${firstName} ${lastName}, ${studentClass}; ${teacher.firstName} ${teacher.lastName}; ${day}:${hour}`);
    return res.status(201).json({ ...trial, teacher: publicAccount(teacher) });
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось создать пробный урок.' }); }
});

app.put('/api/admin/trial-lessons/:id', requireAdmin, async (req, res) => {
  await refreshAccounts();
  try {
    const trials = await readTrialLessons();
    const index = trials.findIndex((lesson) => lesson.id === req.params.id && (lesson.status === 'scheduled' || lesson.status === 'trial' || !lesson.status || lesson.status === 'no_show'));
    if (index < 0) return res.status(404).json({ error: 'Активный пробный урок не найден.' });
    const { teacherId, day, hour } = req.body || {};
    const teacher = accounts.find((account) => account.id === teacherId && account.role === 'teacher');
    if (!teacher || !Number.isInteger(day) || day < 0 || day > 5 || !Number.isInteger(hour) || hour < 8 || hour > 20) return res.status(400).json({ error: 'Выберите преподавателя и временной слот.' });
    const scheduleResult = supabase ? await supabase.from('app_settings').select('value').eq('key', 'weekly_schedule').maybeSingle() : null;
    if (scheduleResult?.error) throw scheduleResult.error;
    const schedule = scheduleResult ? (scheduleResult.data?.value ? JSON.parse(scheduleResult.data.value) : { lessons: [] }) : await readJsonFileOr(schedulePath, { lessons: [] });
    const planned = Array.isArray(schedule) ? schedule : schedule.lessons || [];
    const parentPhone = normalizePhone(req.body?.parentPhone);
    const firstName = typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : '';
    const lastName = typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : '';
    const studentClass = typeof req.body?.studentClass === 'string' ? req.body.studentClass.trim() : '';
    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 || !['5 класс', '6 класс', '7 класс', '8 класс', '9 класс'].includes(studentClass) || parentPhone.length < 10 || parentPhone.length > 16) return res.status(400).json({ error: 'Проверьте имя, фамилию, класс и контакт родителя.' });
    if (planned.some((lesson) => lesson.teacherId === teacherId && lesson.day === day && lesson.hour === hour) || trials.some((lesson) => lesson.id !== req.params.id && (lesson.status === 'scheduled' || lesson.status === 'trial' || !lesson.status) && lesson.teacherId === teacherId && lesson.day === day && lesson.hour === hour)) return res.status(409).json({ error: 'Этот слот уже занят.' });
    trials[index] = { ...trials[index], firstName, lastName, studentClass, teacherId, day, hour, parentPhone, scheduledAt: nextTrialSlotStart(day, hour), status: 'scheduled', attendance: undefined, attendanceAt: undefined, attendanceMarkedBy: undefined };
    await writeTrialLessons(trials);
    await recordAdminAuditSafely(req.adminSession.sub, 'Перенесён пробный урок', `${trials[index].firstName} ${trials[index].lastName}; ${day}:${hour}; ${teacher.firstName} ${teacher.lastName}`);
    return res.json({ ...trials[index], teacher: publicAccount(teacher) });
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось перенести пробный урок.' }); }
});

app.delete('/api/admin/trial-lessons/:id', requireAdmin, async (req, res) => {
  try {
    const trials = await readTrialLessons();
    const trial = trials.find((lesson) => lesson.id === req.params.id && (lesson.status === 'scheduled' || lesson.status === 'trial' || !lesson.status));
    if (!trial) return res.status(404).json({ error: 'Пробный урок не найден.' });
    await writeTrialLessons(trials.filter((lesson) => lesson.id !== req.params.id));
    await recordAdminAuditSafely(req.adminSession.sub, 'Удалён пробный урок', `${trial.firstName} ${trial.lastName}`);
    return res.json({ ok: true });
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось удалить пробный урок.' }); }
});

async function saveTrialAttendance(trialId, attended, markedBy, attendanceReason = '') {
  const trials = await readTrialLessons();
  const index = trials.findIndex((lesson) => lesson.id === trialId && (lesson.status === 'scheduled' || lesson.status === 'trial' || !lesson.status));
  if (index < 0) return null;
  trials[index] = { ...trials[index], status: attended ? 'attended' : 'no_show', attendance: attended ? 'attended' : 'no_show', attendanceReason: attended ? '' : attendanceReason, attendanceAt: new Date().toISOString(), attendanceMarkedBy: markedBy };
  await writeTrialLessons(trials);
  return trials[index];
}

app.post('/api/admin/trial-lessons/:id/attendance', requireAdmin, async (req, res) => {
  if (typeof req.body?.attended !== 'boolean') return res.status(400).json({ error: 'Укажите, пришёл ли ученик.' });
  try {
    const trial = await saveTrialAttendance(req.params.id, req.body.attended, req.adminSession.sub);
    if (!trial) return res.status(404).json({ error: 'Назначенный пробный урок не найден.' });
    await recordAdminAuditSafely(req.adminSession.sub, req.body.attended ? 'Отмечено посещение пробного урока' : 'Отмечена неявка на пробный урок', `${trial.firstName} ${trial.lastName}`);
    return res.json({ trial });
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось сохранить посещаемость.' }); }
});

app.post('/api/teacher/trial-lessons/:id/attendance', async (req, res) => {
  await refreshAccounts();
  const user = getUserSession(req);
  if (!user || user.account.role !== 'teacher') return res.status(403).json({ error: 'Отметить посещаемость может только преподаватель.' });
  if (typeof req.body?.attended !== 'boolean') return res.status(400).json({ error: 'Укажите, пришёл ли ученик.' });
  try {
    const trials = await readTrialLessons();
    const trial = trials.find((lesson) => lesson.id === req.params.id && lesson.teacherId === user.account.id && (lesson.status === 'scheduled' || lesson.status === 'trial' || !lesson.status));
    if (!trial) return res.status(404).json({ error: 'Назначенный пробный урок не найден.' });
    const startsAt = new Date(getTrialScheduledAt(trial)).getTime();
    if (Date.now() < startsAt || Date.now() >= startsAt + 60 * 60 * 1000) return res.status(409).json({ error: 'Отметить посещение можно только в течение часа пробного урока.' });
    const updated = await saveTrialAttendance(trial.id, req.body.attended, `${user.account.firstName} ${user.account.lastName}`);
    await recordAdminAuditSafely(user.account.id, req.body.attended ? 'Преподаватель отметил посещение пробного урока' : 'Преподаватель отметил неявку на пробный урок', `${trial.firstName} ${trial.lastName}`);
    return res.json({ trial: updated });
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось сохранить посещаемость.' }); }
});

app.post('/api/admin/trial-lessons/:id/move-to-past', requireAdmin, async (req, res) => {
  try {
    const trial = await saveTrialAttendance(req.params.id, true, req.adminSession.sub);
    if (!trial) return res.status(404).json({ error: 'Назначенный пробный урок не найден.' });
    await recordAdminAuditSafely(req.adminSession.sub, 'Пробный урок перенесён в прошедшие', `${trial.firstName} ${trial.lastName}`);
    return res.json({ trial });
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось перенести урок.' }); }
});

app.post('/api/admin/trial-lessons/:id/outcome', requireAdmin, async (req, res) => {
  await refreshAccounts();
  try {
    const trials = await readTrialLessons();
    const outcome = req.body?.outcome;
    const index = trials.findIndex((lesson) => lesson.id === req.params.id && ((lesson.status === 'scheduled' || lesson.status === 'trial' || lesson.status === 'attended' || !lesson.status) || (outcome === 'enrolled' && ['declined', 'no_show'].includes(lesson.status))));
    if (index < 0) return res.status(404).json({ error: 'Пробный урок не найден или уже обработан.' });
    if (outcome === 'declined' && trials[index].status !== 'declined') {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (!reason || reason.length > 500) return res.status(400).json({ error: 'Выберите или укажите причину отказа.' });
      trials[index] = { ...trials[index], status: 'declined', declinedAt: new Date().toISOString(), declineReason: reason };
      await writeTrialLessons(trials);
      await recordAdminAuditSafely(req.adminSession.sub, 'Зафиксирован отказ от занятий', `${trials[index].firstName} ${trials[index].lastName}; ${reason}`);
      return res.json({ trial: trials[index] });
    }
    if (outcome !== 'enrolled') return res.status(400).json({ error: 'Неизвестный результат пробного урока.' });
    const trial = trials[index];
    let phone;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      phone = `7${crypto.randomInt(1000000000, 9999999999)}`;
      if (!accounts.some((account) => account.phone === phone)) break;
      phone = undefined;
    }
    if (!phone) return res.status(500).json({ error: 'Не удалось создать временный логин ученика. Повторите попытку.' });
    const salt = crypto.randomBytes(16);
    const passwordHash = await hashPassword('study2026', salt);
    const student = { id: crypto.randomUUID(), role: 'student', phone, firstName: trial.firstName, lastName: trial.lastName, studentClass: trial.studentClass, teacherId: trial.teacherId, children: [], status: 'active', salt: salt.toString('base64'), passwordHash: passwordHash.toString('base64'), createdAt: new Date().toISOString() };
    await writeAccounts([...accounts, student]);
    trials[index] = { ...trial, status: 'enrolled', enrolledAt: new Date().toISOString(), studentId: student.id };
    await writeTrialLessons(trials);
    await recordAdminAuditSafely(req.adminSession.sub, 'Пробный ученик записался', `${student.firstName} ${student.lastName}, ${student.studentClass}`);
    return res.json({ trial: trials[index], student: publicAccount(student), temporaryLogin: phone, temporaryPassword: 'study2026' });
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось сохранить результат пробного урока.' }); }
});

app.post('/api/admin/accounts', requireAdmin, async (req, res) => {
  await refreshAccounts();
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
  await recordAdminAuditSafely(req.adminSession.sub, 'Создан аккаунт', `${role}: ${account.firstName} ${account.lastName}`);
  return res.status(201).json({ account: publicAccount(account) });
});

app.put('/api/admin/accounts/:id', requireAdmin, async (req, res) => {
  await refreshAccounts();
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

  const parentId = current.role === 'student' ? (typeof req.body?.parentId === 'string' && req.body.parentId ? req.body.parentId : '') : '';
  if (current.role === 'student' && parentId && !accounts.some((account) => account.id === parentId && account.role === 'parent')) return res.status(400).json({ error: 'Выбранный родитель не найден.' });
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
  const nextAccounts = accounts.map((account, accountIndex) => {
    if (accountIndex === index) return updated;
    if (current.role === 'student' && account.role === 'parent') {
      const oldChildren = account.children || [];
      const childrenWithoutStudent = oldChildren.filter((id) => id !== current.id);
      return { ...account, children: account.id === parentId ? [...new Set([...childrenWithoutStudent, current.id])] : childrenWithoutStudent };
    }
    return account;
  });
  await writeAccounts(nextAccounts);
  await recordAdminAuditSafely(req.adminSession.sub, 'Изменён аккаунт', `${current.role}: ${updated.firstName} ${updated.lastName}`);
  return res.json({ account: publicAccount(updated) });
});

app.delete('/api/admin/accounts/:id', requireAdmin, async (req, res) => {
  await refreshAccounts();
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
  await recordAdminAuditSafely(req.adminSession.sub, 'Удалён аккаунт', `${account.role}: ${account.firstName} ${account.lastName}`);
  return res.json({ ok: true });
});

app.post('/api/admin/accounts/:id/archive', requireAdmin, async (req, res) => {
  await refreshAccounts();
  const index = accounts.findIndex((entry) => entry.id === req.params.id && entry.role === 'student');
  if (index < 0) return res.status(404).json({ error: 'Ученик не найден.' });
  if (accounts[index].status === 'withdrawn') return res.status(409).json({ error: 'Ученик уже находится в разделе «Выбывшие».' });
  const nextAccounts = [...accounts];
  nextAccounts[index] = { ...nextAccounts[index], status: 'withdrawn', withdrawnAt: new Date().toISOString() };
  await writeAccounts(nextAccounts);
  await recordAdminAuditSafely(req.adminSession.sub, 'Ученик перемещён в выбывшие', `${nextAccounts[index].firstName} ${nextAccounts[index].lastName}`);
  return res.json({ ok: true });
});

app.post('/api/admin/accounts/:id/restore', requireAdmin, async (req, res) => {
  await refreshAccounts();
  const index = accounts.findIndex((entry) => entry.id === req.params.id && entry.role === 'student');
  if (index < 0) return res.status(404).json({ error: 'Ученик не найден.' });
  if (accounts[index].status !== 'withdrawn') return res.status(409).json({ error: 'Ученик уже находится в активном списке.' });
  if (!accounts.some((entry) => entry.id === accounts[index].teacherId && entry.role === 'teacher')) return res.status(409).json({ error: 'Нельзя вернуть ученика без преподавателя. Отредактируйте аккаунт и выберите преподавателя.' });
  const nextAccounts = [...accounts];
  const { withdrawnAt: _withdrawnAt, ...rest } = nextAccounts[index];
  nextAccounts[index] = { ...rest, status: 'active' };
  await writeAccounts(nextAccounts);
  await recordAdminAuditSafely(req.adminSession.sub, 'Ученик восстановлен', `${nextAccounts[index].firstName} ${nextAccounts[index].lastName}`);
  return res.json({ ok: true });
});

app.get('/api/auth/session', async (req, res) => {
  await refreshAccounts();
  const user = getUserSession(req);
  const progress = user?.account.progress ? {
    ...user.account.progress,
    userName: `${user.account.firstName} ${user.account.lastName}`,
    userClass: user.account.studentClass || '',
  } : null;
  res.json({ authenticated: Boolean(user), account: user ? publicAccount(user.account) : null, progress });
});

function teacherStudentSummary(student) {
  const teacher = accounts.find((entry) => entry.id === student.teacherId && entry.role === 'teacher');
  const parent = accounts.find((entry) => entry.role === 'parent' && (entry.children || []).includes(student.id));
  return { id: student.id, role: 'student', firstName: student.firstName, lastName: student.lastName, studentClass: student.studentClass || '', teacher: teacher ? { firstName: teacher.firstName, lastName: teacher.lastName } : null, parent: parent ? { firstName: parent.firstName, lastName: parent.lastName } : null, createdAt: student.createdAt };
}

async function getAssignedTeacherLessonSubject(req, res) {
  const user = getUserSession(req);
  if (!user || user.account.role !== 'teacher') {
    res.status(403).json({ error: 'Доступ к карточкам учеников есть только у преподавателя.' });
    return null;
  }
  const student = accounts.find((entry) => entry.id === req.params.studentId && entry.role === 'student' && entry.teacherId === user.account.id && entry.status !== 'withdrawn');
  if (student) return { id: student.id, firstName: student.firstName, lastName: student.lastName, studentClass: student.studentClass || '', summary: teacherStudentSummary(student) };
  const trial = (await readTrialLessons()).find((entry) => entry.id === req.params.studentId && entry.teacherId === user.account.id && ['scheduled', 'trial', 'attended', 'no_show'].includes(entry.status || 'scheduled'));
  if (trial) return { id: trial.id, firstName: trial.firstName, lastName: trial.lastName, studentClass: trial.studentClass || '', summary: teacherStudentSummary({ ...trial, id: trial.id }), trial: true };
  res.status(404).json({ error: 'Ученик или пробное занятие не найдено либо не закреплено за вами.' });
  return null;
}

app.get('/api/teacher/students/:studentId/lesson-history', async (req, res) => {
  await refreshAccounts();
  const subject = await getAssignedTeacherLessonSubject(req, res);
  if (!subject) return;
  try { return res.json({ student: subject.summary, history: await readStudentLessonHistory(subject.id) }); }
  catch (error) { return res.status(500).json({ error: error.message || 'Не удалось загрузить историю занятий.' }); }
});

app.post('/api/teacher/students/:studentId/lesson-history', async (req, res) => {
  await refreshAccounts();
  const subject = await getAssignedTeacherLessonSubject(req, res);
  if (!subject) return;
  const { date, time, homeworkGrade, topic, nextHomework, testGrade, attendance, attendanceReason } = req.body || {};
  const parsedDate = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return res.status(400).json({ error: 'Укажите корректную дату занятия.' });
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ error: 'Укажите корректное время занятия.' });
  if (typeof topic !== 'string' || topic.trim().length > 300 || (attendance !== false && !topic.trim())) return res.status(400).json({ error: 'Укажите тему урока (до 300 символов).' });
  if (typeof attendance !== 'boolean') return res.status(400).json({ error: 'Отметьте, присутствовал ли ученик.' });
  const absenceReasons = ['Ученик отменил', 'Заболел', 'По собственной причине'];
  if (attendance === false && !absenceReasons.includes(attendanceReason)) return res.status(400).json({ error: 'Выберите причину отсутствия.' });
  if (typeof (homeworkGrade ?? '') !== 'string' || homeworkGrade.length > 30 || typeof (nextHomework ?? '') !== 'string' || nextHomework.length > 2000 || typeof (testGrade ?? '') !== 'string' || testGrade.length > 30) return res.status(400).json({ error: 'Проверьте оценки и домашнее задание.' });
  try {
    const history = await readStudentLessonHistory(subject.id);
    const entry = { id: crypto.randomUUID(), date, time, studentName: `${subject.firstName} ${subject.lastName}`, studentClass: subject.studentClass, homeworkGrade: homeworkGrade.trim(), topic: topic.trim(), nextHomework: nextHomework.trim(), testGrade: testGrade.trim(), attendance, attendanceReason: attendance ? '' : attendanceReason, createdAt: new Date().toISOString() };
    const nextHistory = [entry, ...history].sort((left, right) => `${right.date}T${right.time}`.localeCompare(`${left.date}T${left.time}`));
    await writeStudentLessonHistory(subject.id, nextHistory);
    if (subject.trial) {
      const marked = await saveTrialAttendance(subject.id, attendance, `${getUserSession(req).account.firstName} ${getUserSession(req).account.lastName}`, attendanceReason);
      if (!marked) return res.status(409).json({ error: 'Посещение пробного занятия уже отмечено.' });
    }
    return res.status(201).json({ entry, history: nextHistory });
  } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось сохранить занятие.' }); }
});

app.get('/api/auth/portal', async (req, res) => {
  await refreshAccounts();
  const user = getUserSession(req);
  if (!user) return res.status(401).json({ error: 'Войдите в личный кабинет.' });
  const current = user.account;
  const account = publicAccount(current);
  const relatedAccounts = current.role === 'parent'
    ? accounts.filter((item) => current.children?.includes(item.id) && item.role === 'student')
    : current.role === 'teacher'
      ? accounts.filter((item) => item.role === 'student' && item.status !== 'withdrawn' && item.teacherId === current.id)
      : [];
  let scheduleData = { lessons: [], targets: {} };
  try {
    if (supabase) {
      const result = await supabase.from('app_settings').select('value').eq('key', 'weekly_schedule').maybeSingle();
      if (result.error) throw result.error;
      if (result.data?.value) scheduleData = JSON.parse(result.data.value);
    } else scheduleData = await readJsonFileOr(schedulePath, scheduleData);
    if (Array.isArray(scheduleData)) scheduleData = { lessons: scheduleData, targets: {} };
    const relatedIds = new Set(relatedAccounts.map((item) => item.id));
    const lessons = (scheduleData.lessons || []).filter((lesson) => current.role === 'student'
      ? lesson.studentId === current.id
      : current.role === 'parent'
        ? relatedIds.has(lesson.studentId)
        : lesson.teacherId === current.id).map((lesson) => ({
      ...lesson,
      student: accounts.find((item) => item.id === lesson.studentId)
        ? current.role === 'teacher'
          ? teacherStudentSummary(accounts.find((item) => item.id === lesson.studentId))
          : publicAccount(accounts.find((item) => item.id === lesson.studentId))
        : null,
    }));
    if (current.role === 'teacher') {
      const trialLessons = await readTrialLessons();
      lessons.push(...trialLessons.filter((lesson) => lesson.teacherId === current.id && (lesson.status === 'scheduled' || lesson.status === 'trial' || !lesson.status)).map((lesson) => ({
        ...lesson,
        trial: true,
        scheduledAt: getTrialScheduledAt(lesson),
        attendanceOpen: Date.now() >= new Date(getTrialScheduledAt(lesson)).getTime() && Date.now() < new Date(getTrialScheduledAt(lesson)).getTime() + 60 * 60 * 1000,
        title: `Пробный урок · ${lesson.firstName} ${lesson.lastName}`,
        student: { id: lesson.id, role: 'student', firstName: lesson.firstName, lastName: lesson.lastName, studentClass: lesson.studentClass },
      })));
    }
    let recordedLessonIds = [];
    if (current.role === 'teacher') {
      const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const part = (type) => parts.find((item) => item.type === type)?.value || '';
      const today = `${part('year')}-${part('month')}-${part('day')}`;
      const historyByLesson = await Promise.all(lessons.map(async (lesson) => {
        const subjectId = lesson.trial ? lesson.id : lesson.studentId;
        if (!subjectId) return null;
        const history = await readStudentLessonHistory(subjectId);
        return history.some((entry) => entry.date === today && entry.time === `${String(lesson.hour).padStart(2, '0')}:00`) ? lesson.id : null;
      }));
      recordedLessonIds = historyByLesson.filter(Boolean);
    }
    const messages = await readAccountInbox(current.id);
    return res.json({
      account,
      progress: current.progress || null,
      relatedAccounts: relatedAccounts.map((item) => current.role === 'teacher' ? teacherStudentSummary(item) : publicAccount(item)),
      lessons,
      recordedLessonIds,
      messages,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось загрузить личный кабинет.' });
  }
});

app.post('/api/auth/messages/:id/read', async (req, res) => {
  const user = getUserSession(req);
  if (!user) return res.status(401).json({ error: 'Войдите в личный кабинет.' });
  const messages = await readAccountInbox(user.account.id);
  const index = messages.findIndex((message) => message.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Сообщение не найдено.' });
  messages[index] = { ...messages[index], read: true };
  await writeAccountInbox(user.account.id, messages);
  return res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res) => {
  await refreshAccounts();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isLoginRateLimited(ip)) return res.status(429).json({ error: 'Слишком много попыток. Попробуйте ещё раз через 15 минут.' });
  const phone = normalizePhone(req.body?.phone);
  const password = req.body?.password;
  const audience = req.body?.audience;
  const account = accounts.find((entry) => entry.phone === phone);
  const roleAllowed = account && account.status !== 'withdrawn' && (audience === 'teacher' ? account.role === 'teacher' : ['student', 'parent'].includes(account.role));
  const validPassword = account && account.status !== 'withdrawn' && typeof password === 'string' && password.length <= 128
    ? await passwordsMatch(password, account.salt, account.passwordHash)
    : false;
  if (!roleAllowed || !validPassword) {
    if (!failedLoginAttempts.has(ip)) failedLoginAttempts.set(ip, []);
    failedLoginAttempts.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Неверный номер телефона или пароль.' });
  }
  failedLoginAttempts.delete(ip);
  setUserSessionCookie(res, account);
  const progress = account.progress ? {
    ...account.progress,
    userName: `${account.firstName} ${account.lastName}`,
    userClass: account.studentClass || '',
  } : null;
  return res.json({ account: publicAccount(account), progress });
});

app.put('/api/auth/progress', async (req, res) => {
  await refreshAccounts();
  const user = getUserSession(req);
  if (!user) return res.status(401).json({ error: 'Войдите в аккаунт, чтобы сохранить прогресс.' });
  if (user.account.role !== 'student') return res.status(403).json({ error: 'Прогресс доступен только для аккаунта ученика.' });
  const { stars, xp, level, claimedPrizes, unlockedAchievements } = req.body || {};
  if (!Number.isSafeInteger(stars) || stars < 0 || stars > 10000000 || !Number.isSafeInteger(xp) || xp < 0 || xp > 100000000 || !Number.isSafeInteger(level) || level < 1 || level > 100000) {
    return res.status(400).json({ error: 'Некорректные значения прогресса.' });
  }
  if (!Array.isArray(claimedPrizes) || claimedPrizes.length > 100 || claimedPrizes.some((id) => typeof id !== 'string' || id.length > 120)) {
    return res.status(400).json({ error: 'Некорректный список призов.' });
  }
  if (!Array.isArray(unlockedAchievements) || unlockedAchievements.length > 200 || unlockedAchievements.some((id) => typeof id !== 'string' || id.length > 120)) {
    return res.status(400).json({ error: 'Некорректный список достижений.' });
  }
  const progress = {
    stars, xp, level, claimedPrizes: [...new Set(claimedPrizes)], unlockedAchievements: [...new Set(unlockedAchievements)],
    userName: `${user.account.firstName} ${user.account.lastName}`, userClass: user.account.studentClass || '',
  };
  const nextAccounts = accounts.map((account) => account.id === user.account.id ? { ...account, progress } : account);
  await writeAccounts(nextAccounts);
  return res.json({ ok: true });
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
