import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createKv } from '../server/crm/kv.js';
import { createCrmCore } from '../server/crm/core.js';
import { createChannels } from '../server/crm/channels.js';
import { normalizePhone, nameKey, namesCompatible, cleanAttribution, sourceFromReferrer, stripHtml } from '../server/crm/util.js';

async function makeCore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'crm-test-'));
  const events = [];
  const kv = createKv({ getSupabase: () => null, dataDir: dir });
  const core = await createCrmCore({ kv, emit: (type, payload) => events.push({ type, payload }) });
  await core.init();
  return { core, kv, dir, events };
}

test('phone, name and attribution helpers', () => {
  assert.equal(normalizePhone('8 (700) 123-45-67'), '77001234567');
  assert.equal(normalizePhone('700 123 45 67'), '77001234567');
  assert.equal(normalizePhone('12'), '');
  assert.equal(nameKey('Иванов  Пётр'), nameKey('петр иванов'));
  assert.equal(sourceFromReferrer('https://l.instagram.com/?u=x'), 'instagram');
  assert.equal(sourceFromReferrer('https://www.google.com/'), 'google');
  const a = cleanAttribution({ last: { utm_source: 'ignored', source: 'IG', campaign: 'Sept', fbclid: 'abc' }, referrer: 'https://t.me/x', landing: '/trial' });
  assert.equal(a.source, 'ig');
  assert.equal(a.campaign, 'sept');
  assert.equal(a.fbclid, 'abc');
  assert.equal(cleanAttribution({ referrer: 'https://t.me/x' }).source, 'telegram');
  assert.equal(cleanAttribution(null).source, '');
  assert.equal(stripHtml('<b>Привет</b> &lt;3'), 'Привет <3');
});

test('same parent phone reuses the parent and adds a second student', async () => {
  const { core } = await makeCore();
  const one = await core.newLead({ type: 'trial', phone: '87001234567', parentName: 'Айгуль', studentName: 'Алия Иванова', grade: 5 });
  const two = await core.newLead({ type: 'intensive', phone: '+7 700 123 45 67', parentName: 'Айгуль', studentName: 'Тимур Иванов', grade: 9 });
  const again = await core.newLead({ type: 'trial', phone: '77001234567', studentName: 'алия иванова', grade: 6 });
  assert.equal(one.contactId, two.contactId);
  assert.equal(one.contactId, again.contactId);
  assert.equal(again.studentId, one.studentId);
  const parent = core.maps.contact.get(one.contactId);
  assert.equal(parent.childIds.length, 2);
  assert.equal(core.maps.contact.get(one.studentId).grade, 6);
  assert.deepEqual([one.number, two.number, again.number], [1, 2, 3]);
});

test('duplicates are suggested, can be dismissed, and merge only on request', async () => {
  const { core } = await makeCore();
  const a = await core.put('contact', core.blankContact({ name: 'Мария Петрова', phones: ['77011111111'] }));
  const b = await core.put('contact', core.blankContact({ name: 'мария петрова', phones: ['77022222222'], notes: 'из Telegram' }));
  const c = await core.put('contact', core.blankContact({ name: 'Другой Человек', phones: ['77011111111'] }));
  const pairs = core.findDuplicates();
  assert.equal(pairs.length, 2, 'пара по имени и пара по общему телефону');
  assert.deepEqual(pairs.find((p) => p.reasons.includes('phone')).reasons, ['phone']);
  assert.equal(core.maps.contact.size, 3, 'сами по себе дубли не объединяются');
  const meta = core.meta();
  meta.dismissed.push(core.pairKey(a.id, b.id));
  assert.equal(core.findDuplicates().length, 1);
  const lead = await core.newLead({ type: 'manual', contactId: b.id, phone: '77022222222' });
  const merged = await core.mergeContacts(a.id, b.id);
  assert.deepEqual(merged.phones.sort(), ['77011111111', '77022222222']);
  assert.match(merged.notes, /Telegram/);
  assert.equal(core.maps.contact.has(b.id), false);
  assert.equal(core.maps.lead.get(lead.id).contactId, a.id);
  await assert.rejects(core.mergeContacts(a.id, 'missing'), /не найден/);
  const student = await core.put('contact', core.blankContact({ kind: 'student', name: 'Ученик' }));
  await assert.rejects(core.mergeContacts(a.id, student.id), /одного типа/);
});

test('trial lessons sync into leads and follow later changes', async () => {
  const { core } = await makeCore();
  const lead = await core.newLead({ type: 'trial', phone: '77001234567', parentName: 'Мама', studentName: 'Алия Иванова', grade: 5 });
  const trial = { id: 't1', firstName: 'Алия', lastName: 'Иванова', studentClass: '5 класс', parentPhone: '77001234567', teacherId: 'tc', day: 1, hour: 16, status: 'scheduled', createdAt: new Date().toISOString(), scheduledAt: new Date(Date.now() + 86400000).toISOString() };
  await core.syncTrials([trial], () => 'Анна Учитель');
  assert.equal(core.getLead(lead.id).status, 'trial_booked');
  assert.equal(core.getLead(lead.id).trial.teacherName, 'Анна Учитель');
  assert.equal(core.maps.lead.size, 1);
  await core.syncTrials([{ ...trial, status: 'attended' }], () => 'Анна Учитель');
  assert.equal(core.getLead(lead.id).status, 'trial_done');
  await core.syncTrials([{ ...trial, status: 'enrolled', studentId: 'acc1' }], () => 'Анна Учитель');
  assert.equal(core.getLead(lead.id).status, 'paid');
  assert.equal(core.maps.contact.get(core.getLead(lead.id).studentId).accountId, 'acc1');
  const before = core.getLead(lead.id).timeline.length;
  await core.syncTrials([{ ...trial, status: 'enrolled', studentId: 'acc1' }], () => 'Анна Учитель');
  assert.equal(core.getLead(lead.id).timeline.length, before, 'повторная синхронизация ничего не дублирует');
  // пробный, созданный в админке без заявки, появляется в CRM
  await core.syncTrials([{ ...trial }, { id: 't2', firstName: 'Новый', lastName: 'Ученик', studentClass: '7 класс', parentPhone: '77019998877', teacherId: 'tc', day: 2, hour: 17, status: 'scheduled', createdAt: new Date().toISOString() }], () => '');
  const created = [...core.maps.lead.values()].find((l) => l.trialLessonId === 't2');
  assert.ok(created); assert.equal(created.channel, 'admin'); assert.equal(created.status, 'trial_booked');
  // отказ и удаление
  await core.syncTrials([{ ...trial, id: 't2', status: 'declined', declineReason: 'дорого', parentPhone: '77019998877', firstName: 'Новый', lastName: 'Ученик' }], () => '');
  assert.equal(core.getLead(created.id).status, 'lost');
  assert.equal(core.getLead(created.id).lostReason, 'дорого');
  const removed = await core.newLead({ type: 'trial', phone: '77015556677', studentName: 'Тест Удаление' });
  await core.syncTrials([{ id: 't3', firstName: 'Тест', lastName: 'Удаление', studentClass: '6 класс', parentPhone: '77015556677', day: 0, hour: 9, status: 'scheduled', createdAt: new Date().toISOString() }], () => '');
  await core.syncTrials([], () => '');
  assert.equal(core.getLead(removed.id).trial.removed, true);
  assert.equal(core.getLead(removed.id).status, 'contacted');
});

test('conversations: new contact creates a lead once, messages persist across chunks', async () => {
  const { core, kv } = await makeCore();
  const first = await core.ingest({ channel: 'telegram', externalId: 555, profile: { name: 'Асем', username: 'asem' }, message: { text: 'Здравствуйте!', externalId: 1 } });
  assert.equal(first.isNewConv, true); assert.equal(first.isNewLead, true);
  const lead = [...core.maps.lead.values()][0];
  assert.equal(lead.type, 'message'); assert.equal(lead.source, 'telegram');
  const dup = await core.ingest({ channel: 'telegram', externalId: 555, message: { text: 'Здравствуйте!', externalId: 1 } });
  assert.equal(dup.duplicate, true);
  const convId = first.conv.id;
  for (let i = 2; i <= 450; i += 1) await core.ingest({ channel: 'telegram', externalId: 555, message: { text: `m${i}`, externalId: i } });
  assert.equal(core.maps.lead.size, 1, 'повторные сообщения не плодят заявки');
  const conv = core.maps.conv.get(convId);
  assert.equal(conv.unread, 450); assert.equal(conv.msgChunk, 2);
  const page = await core.getMessages(convId, { limit: 100 });
  assert.equal(page.messages.length, 100); assert.equal(page.messages.at(-1).text, 'm450'); assert.equal(page.hasMore, true);
  const older = await core.getMessages(convId, { before: page.messages[0].seq, limit: 500 });
  assert.equal(older.messages.length, 350); assert.equal(older.messages[0].text, 'Здравствуйте!'); assert.equal(older.hasMore, false);
  await core.ingest({ channel: 'telegram', externalId: 555, dir: 'out', author: 'admin', message: { text: 'Ответ' } });
  assert.equal(core.maps.conv.get(convId).unread, 0);
  assert.equal(await core.findMessage(convId, page.messages.at(-1).id) !== null, true);
  // после «перезапуска» всё читается из хранилища
  const reborn = await createCrmCore({ kv });
  await reborn.init();
  assert.equal(reborn.maps.conv.size, 1); assert.equal(reborn.maps.lead.size, 1);
  assert.equal((await reborn.getMessages(convId, { limit: 1 })).messages[0].text, 'Ответ');
  // привязанный ученик не создаёт заявку
  const linked = await core.ingest({ channel: 'telegram', externalId: 777, profile: { name: 'Ученик' }, linked: { id: 'acc', role: 'student', phone: '77004443322', firstName: 'Ученик', lastName: 'Бота' }, message: { text: 'вопрос по домашке', externalId: 1 } });
  assert.equal(linked.isNewLead, false); assert.equal(core.maps.lead.size, 1);
  // исходящее без диалога игнорируется
  assert.equal(await core.ingest({ channel: 'telegram', externalId: 999, dir: 'out', auto: true, message: { text: 'x' } }), null);
});

test('analytics groups by source and campaign with funnel conversion', async () => {
  const { core } = await makeCore();
  const mk = async (n, utm, status) => {
    const l = await core.newLead({ type: 'trial', phone: `7700000000${n}`, studentName: `Ученик ${n}`, attribution: { last: utm } });
    if (status) await core.applyStatus(l, status); await core.put('lead', l);
  };
  await mk(1, { source: 'instagram', campaign: 'sept' }, 'paid');
  await mk(2, { source: 'instagram', campaign: 'sept' }, 'trial_done');
  await mk(3, { source: 'instagram', campaign: 'oct' }, 'lost');
  await mk(4, { source: 'google', campaign: 'brand' }, 'trial_booked');
  await mk(5, {}, null);
  const bySource = core.analytics({ groupBy: 'source' });
  const ig = bySource.rows.find((r) => r.key === 'instagram');
  assert.deepEqual([ig.leads, ig.booked, ig.done, ig.paid, ig.lost], [3, 2, 2, 1, 1]);
  assert.equal(ig.conversion, 33.3);
  assert.ok(bySource.rows.find((r) => r.key === 'direct'));
  assert.equal(bySource.total.leads, 5);
  const byCampaign = core.analytics({ groupBy: 'campaign' });
  assert.equal(byCampaign.rows[0].key, 'instagram / sept');
  assert.ok(bySource.series.reduce((sum, d) => sum + d.leads, 0) <= 5);
});

test('Meta webhooks: signature check and payload parsing', () => {
  const secret = 'app-secret';
  const channels = createChannels({ env: { META_APP_SECRET: secret, WHATSAPP_VERIFY_TOKEN: 'v', WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '1' }, telegram: { enabled: () => false } });
  const raw = Buffer.from('{"a":1}');
  const good = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
  assert.equal(channels.verifySignature(raw, good), true);
  assert.equal(channels.verifySignature(raw, good.replace(/.$/, '0')), false);
  assert.equal(channels.verifySignature(raw, undefined), false);
  assert.equal(createChannels({ env: {}, telegram: null }).verifySignature(raw, good), false, 'без секрета вебхук закрыт');
  assert.equal(channels.verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'v', 'hub.challenge': '42' }, 'v'), '42');
  assert.equal(channels.verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'bad', 'hub.challenge': '42' }, 'v'), null);
  assert.equal(channels.status().whatsapp, true); assert.equal(channels.status().instagram, false);
  const wa = channels.parseWhatsApp({ entry: [{ changes: [{ value: { contacts: [{ wa_id: '77001234567', profile: { name: 'Мама' } }], messages: [{ from: '77001234567', id: 'wamid.1', timestamp: '1700000000', type: 'text', text: { body: 'Привет' } }, { from: '77001234567', id: 'wamid.2', timestamp: '1700000001', type: 'image', image: { id: 'm1', caption: 'чек' } }] } }] }] });
  assert.equal(wa.length, 2); assert.equal(wa[0].name, 'Мама'); assert.equal(wa[0].text, 'Привет'); assert.equal(wa[1].attachments[0].label, 'Фото'); assert.equal(wa[1].text, 'чек');
  const ig = channels.parseInstagram({ object: 'instagram', entry: [{ messaging: [{ sender: { id: 'u1' }, recipient: { id: 'page' }, timestamp: 1700000000000, message: { mid: 'm1', text: 'Хочу на пробный' } }, { sender: { id: 'page' }, recipient: { id: 'u1' }, timestamp: 1700000001000, message: { mid: 'm2', text: 'Ответ', is_echo: true } }] }] });
  assert.equal(ig.length, 2); assert.equal(ig[0].externalId, 'u1'); assert.equal(ig[1].echo, true); assert.equal(ig[1].externalId, 'u1');
});

test('a trial links to the right family lead: same child first, trial requests before intensives', async () => {
  assert.equal(namesCompatible('Дана', 'Дана Ким'), true);
  assert.equal(namesCompatible('Тимур Иванов', 'Алия Иванова'), false);
  const { core } = await makeCore();
  const request = await core.newLead({ type: 'trial', phone: '77001234567', parentName: 'Айгуль', studentName: 'Алия Иванова', grade: 5 });
  const intensive = await core.newLead({ type: 'intensive', phone: '77001234567', parentName: 'Айгуль', studentName: 'Тимур Иванов', grade: 9 });
  const test = await core.newLead({ type: 'level_test', phone: '77001234567', studentName: 'Алия' });
  const trial = { id: 't1', firstName: 'Алия', lastName: 'Иванова', studentClass: '5 класс', parentPhone: '77001234567', day: 1, hour: 15, status: 'scheduled', createdAt: new Date().toISOString() };
  await core.syncTrials([trial], () => '');
  assert.equal(core.getLead(request.id).trialLessonId, 't1', 'заявка на пробный того же ребёнка');
  assert.equal(core.getLead(intensive.id).trialLessonId, '');
  assert.equal(core.getLead(test.id).trialLessonId, '');
  // брат/сестра с тем же телефоном — отдельная новая заявка, а не чужая
  await core.syncTrials([trial, { ...trial, id: 't2', firstName: 'Тимур', lastName: 'Иванов', studentClass: '9 класс' }], () => '');
  assert.equal(core.getLead(intensive.id).trialLessonId, 't2');
  assert.equal(core.maps.lead.size, 3);
});
