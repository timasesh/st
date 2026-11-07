/* Профориентация: тест (страница /career), отчёты ИИ (NVIDIA) и заявки в CRM.
   Ответы сохраняются ТОЛЬКО когда ученик оставил имя и телефон: тогда создаётся заявка в CRM
   и в фоне генерируется отчёт, который виден в админке (Лиды с инстаграма → Профориентация). */
import crypto from 'node:crypto';
import { CAREER_SCALES, careerLevel, scoreCareer, validCareerAnswers } from '../src/shared/career.js';

const PREFIX = 'career:';
const clean = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '');

export function registerCareer(app, { requireAdmin, kv, crm, cleanLeadPhone, notifyAdmins, tgEsc }) {
  const rateLog = new Map();
  let queue = Promise.resolve();

  const load = async (id) => kv.get(`${PREFIX}${id}`);
  const save = (record) => kv.set(`${PREFIX}${record.id}`, record);

  /* ───── ИИ-отчёт ───── */
  function buildPrompt(record) {
    const ranked = CAREER_SCALES.map((scale, i) => ({ scale, score: record.scores[i] })).sort((a, b) => b.score - a.score);
    const lines = ranked.map(({ scale, score }) => `${scale.id}. ${scale.title}: ${score} из 12 (${careerLevel(score).label})`).join('\n');
    const firstName = record.name.split(' ')[0];
    return `Ты — опытный школьный профориентолог и психолог. Ученик прошёл опросник профессиональных склонностей Л. Йовайши (модификация Г. Резапкиной): 24 вопроса, шесть шкал, на каждой 0–12 баллов (10–12 ярко выражена, 7–9 склонность, 4–6 слабо выражена, 0–3 не выражена).

Ученик: ${firstName}${record.grade ? `, ${record.grade} класс` : ', класс не указан'}. Семья живёт в Казахстане (Алматы).

Результаты по шкалам (от сильных к слабым):
${lines}

Составь тёплый, конкретный и честный отчёт для ученика и его родителей. Правила:
- Только русский язык, обращение к ребёнку на «ты» в summary, к родителям на «вы» в parents.
- Опирайся на баллы. Если две шкалы близки — опиши сочетание. Если ярко выраженных нет — скажи об этом спокойно и предложи пробовать разное.
- Профессии называй современные и реальные, включая технические и IT, где это подходит. Не обещай зарплат и не выдумывай статистику.
- Не ставь диагнозов и не делай категоричных выводов: опросник — ориентир, а не приговор. Интересы в этом возрасте меняются.
- Совет по предметам и кружкам должен быть практичным (что попробовать в ближайшие 1–3 месяца).
- Верни ТОЛЬКО JSON без Markdown и пояснений, строго такого вида:
{"headline":"короткий яркий заголовок профиля, до 8 слов","summary":"3–5 предложений о профиле ребёнка","strengths":["3–5 сильных сторон"],"areas":[{"scale":1,"meaning":"2–3 предложения, что эта склонность значит именно для этого ребёнка","professions":["4–6 подходящих профессий"],"develop":"как развивать: кружки, занятия, проекты"}],"subjects":["школьные предметы и кружки, на которые стоит обратить внимание"],"parents":["3–4 совета родителям"],"next_steps":["3–4 конкретных шага на ближайшие 1–3 месяца"],"note":"одно предложение-оговорка про ориентир и консультацию профориентолога"}
В "areas" опиши ровно три самые сильные шкалы по порядку, "scale" — номер шкалы (1–6).`;
  }

  function parseJson(content) {
    const raw = String(content).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const first = raw.indexOf('{'); const last = raw.lastIndexOf('}');
    if (first < 0 || last <= first) throw new Error('Модель не вернула JSON.');
    const body = raw.slice(first, last + 1);
    try { return JSON.parse(body); } catch { return JSON.parse(body.replace(/,\s*([}\]])/g, '$1')); }
  }

  function normalizeReport(data) {
    const list = (value, max, len = 300) => (Array.isArray(value) ? value.map((item) => clean(String(item ?? ''), len)).filter(Boolean).slice(0, max) : []);
    const areas = (Array.isArray(data.areas) ? data.areas : []).slice(0, 3).map((area) => ({
      scale: Math.min(6, Math.max(1, Number(area?.scale) || 1)),
      meaning: clean(String(area?.meaning ?? ''), 700),
      professions: list(area?.professions, 8, 80),
      develop: clean(String(area?.develop ?? ''), 500),
    })).filter((area) => area.meaning);
    const report = {
      headline: clean(String(data.headline ?? ''), 120),
      summary: clean(String(data.summary ?? ''), 1400),
      strengths: list(data.strengths, 6),
      areas,
      subjects: list(data.subjects, 8, 160),
      parents: list(data.parents, 5, 400),
      nextSteps: list(data.next_steps ?? data.nextSteps, 5, 400),
      note: clean(String(data.note ?? ''), 400),
    };
    if (!report.summary || !report.areas.length) throw new Error('Отчёт модели неполный.');
    return report;
  }

  async function callNvidia(prompt) {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error('Не задан NVIDIA_API_KEY на сервере.');
    let model = process.env.NVIDIA_MODEL?.trim() || 'moonshotai/kimi-k3';
    const request = () => fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 6000, temperature: 0.4, ...(/^moonshotai\//i.test(model) ? { reasoning_effort: 'low' } : {}), stream: false }),
      signal: AbortSignal.timeout(180000),
    });
    let response = await request();
    if ([400, 404, 410].includes(response.status)) {
      // модель могла быть снята с обслуживания: берём доступную Kimi из каталога NVIDIA
      try {
        const list = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
        const ids = list.ok ? ((await list.json())?.data || []).map((item) => item.id).filter((id) => /^moonshotai\/kimi/i.test(id) && id !== model) : [];
        for (const id of ids.slice(0, 4)) { model = id; response = await request(); if (response.ok) { console.warn('[career] рабочая модель NVIDIA:', model, '— задайте её в NVIDIA_MODEL.'); break; } }
      } catch (error) { console.warn('[career] NVIDIA fallback:', error?.message); }
    }
    let result = await response.json().catch(() => null);
    if (response.status === 202 && result?.requestId) {
      for (let i = 0; i < 40 && response.status === 202; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        response = await fetch(`https://integrate.api.nvidia.com/v1/status/${encodeURIComponent(result.requestId)}`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
        result = await response.json().catch(() => null);
      }
    }
    if (!response.ok) throw new Error(result?.detail || result?.error?.message || result?.message || `NVIDIA API: HTTP ${response.status}`);
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('NVIDIA API вернул пустой ответ.');
    return { content, model };
  }

  async function generate(id) {
    const record = await load(id);
    if (!record) return;
    record.status = 'generating'; record.error = '';
    await save(record);
    try {
      let report; let used = '';
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try { const { content, model } = await callNvidia(buildPrompt(record)); used = model; report = normalizeReport(parseJson(content)); break; }
        catch (error) { if (attempt === 1) throw error; }
      }
      record.report = report; record.model = used; record.status = 'ready'; record.generatedAt = new Date().toISOString();
    } catch (error) {
      console.error('[career] отчёт не создан:', error?.message);
      record.status = 'failed'; record.error = clean(String(error?.message || 'Ошибка генерации'), 300);
    }
    await save(record);
  }
  const enqueue = (id) => { queue = queue.then(() => generate(id)).catch((error) => console.warn('[career] queue:', error?.message)); return queue; };

  /* ───── публичный приём ───── */
  app.post('/api/public/career', async (req, res) => {
    try {
      const name = clean(req.body?.name, 80);
      const phone = cleanLeadPhone(req.body?.phone);
      const grade = Number(req.body?.grade) || null;
      if (name.length < 2) return res.status(400).json({ error: 'Укажите имя.' });
      if (!phone) return res.status(400).json({ error: 'Введите номер полностью: +7 и код 700–709, 747, 771, 775–778, например +7 700 123 45 67.' });
      if (!validCareerAnswers(req.body?.answers)) return res.status(400).json({ error: 'Ответьте на все 24 вопроса.' });
      if (grade !== null && (grade < 1 || grade > 11)) return res.status(400).json({ error: 'Класс должен быть от 1 до 11.' });
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const cutoff = Date.now() - 60 * 60 * 1000;
      const recent = (rateLog.get(ip) || []).filter((time) => time > cutoff);
      if (recent.length >= 8) return res.status(429).json({ error: 'Слишком много попыток. Попробуйте позже или напишите нам в WhatsApp.' });
      recent.push(Date.now()); rateLog.set(ip, recent);

      const existing = (await kv.list(PREFIX)).map((row) => row.value).find((item) => item?.phone === phone && item?.name?.toLowerCase() === name.toLowerCase() && Date.now() - Date.parse(item.createdAt) < 24 * 60 * 60 * 1000);
      if (existing) return res.json({ ok: true, already: true });

      const record = {
        id: crypto.randomUUID(), name, phone, grade, answers: req.body.answers, scores: scoreCareer(req.body.answers),
        attribution: req.body?.attribution && typeof req.body.attribution === 'object' ? req.body.attribution : null,
        createdAt: new Date().toISOString(), status: 'queued', report: null, error: '', leadId: '',
      };
      await save(record);
      void crm.captureForm({ kind: 'career', legacyId: record.id, studentName: name, phone, grade, topic: 'Профориентация', attribution: record.attribution, createdAt: record.createdAt })
        .then(async (lead) => { if (lead?.id) { const fresh = await load(record.id); if (fresh) { fresh.leadId = lead.id; await save(fresh); } } })
        .catch((error) => console.warn('CRM career lead:', error.message));
      const top = CAREER_SCALES.map((scale, i) => ({ scale, score: record.scores[i] })).sort((a, b) => b.score - a.score).slice(0, 2);
      const message = `🧭 <b>Новая заявка: профориентация</b>\n\n👤 ${tgEsc(name)}${grade ? ` · ${grade} класс` : ''}\n📞 <a href="https://wa.me/${tgEsc(phone)}">+${tgEsc(phone)}</a>\n\n🏆 Сильные шкалы: ${top.map(({ scale, score }) => `${tgEsc(scale.title)} (${score})`).join(', ')}\n\n📋 Отчёт готовится, он появится в админке: Лиды с инстаграма → Профориентация.`;
      void Promise.resolve(notifyAdmins(message)).catch((error) => console.warn('notify career:', error?.message));
      void enqueue(record.id);
      return res.status(201).json({ ok: true });
    } catch (error) {
      console.error('[career] приём не удался:', error);
      return res.status(500).json({ error: 'Не удалось отправить ответы. Попробуйте ещё раз.' });
    }
  });

  /* ───── админка ───── */
  app.get('/api/admin/career', requireAdmin, async (_req, res) => {
    try {
      const rows = (await kv.list(PREFIX)).map((row) => row.value).filter(Boolean);
      return res.json(rows.map(({ answers, report, attribution, ...rest }) => ({ ...rest, hasReport: Boolean(report) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
    } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось загрузить список.' }); }
  });
  app.get('/api/admin/career/:id', requireAdmin, async (req, res) => {
    try {
      const record = await load(req.params.id);
      return record ? res.json(record) : res.status(404).json({ error: 'Запись не найдена.' });
    } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось загрузить запись.' }); }
  });
  app.post('/api/admin/career/:id/regenerate', requireAdmin, async (req, res) => {
    try {
      const record = await load(req.params.id);
      if (!record) return res.status(404).json({ error: 'Запись не найдена.' });
      record.status = 'queued'; record.error = '';
      await save(record);
      void enqueue(record.id);
      return res.json({ ok: true });
    } catch (error) { return res.status(500).json({ error: error.message || 'Не удалось запустить генерацию.' }); }
  });
  app.delete('/api/admin/career/:id', requireAdmin, async (req, res) => {
    try { await kv.del(`${PREFIX}${req.params.id}`); return res.json({ ok: true }); }
    catch (error) { return res.status(500).json({ error: error.message || 'Не удалось удалить запись.' }); }
  });

  // после перезапуска сервера дорабатываем отчёты, которые не успели создаться
  setTimeout(async () => {
    try { for (const row of await kv.list(PREFIX)) if (row.value && ['queued', 'generating'].includes(row.value.status)) void enqueue(row.value.id); }
    catch (error) { console.warn('[career] возобновление:', error?.message); }
  }, 25000).unref?.();
}
