/* Хранилище CRM поверх той же таблицы app_settings (key → JSON-текст), что и остальной сайт.
   Без Supabase — один JSON-файл в DATA_DIR (только для локальной разработки).
   Ключи вида `crm:<коллекция>:<id>`: каждая сущность — отдельная строка, поэтому
   переписки и заявки не раздувают один большой JSON. */
import fs from 'node:fs/promises';
import path from 'node:path';

export function createKv({ getSupabase, dataDir }) {
  const file = path.join(dataDir, 'crm-store.json');
  let local = null;
  let timer = null;
  let chain = Promise.resolve();

  async function loadLocal() {
    if (local) return local;
    try { local = JSON.parse(await fs.readFile(file, 'utf8')); } catch { local = {}; }
    if (!local || typeof local !== 'object') local = {};
    return local;
  }
  function scheduleFlush() {
    clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, 250);
  }
  function flush() {
    clearTimeout(timer);
    chain = chain.then(async () => {
      if (!local) return;
      await fs.mkdir(dataDir, { recursive: true });
      const tmp = `${file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(local), { mode: 0o600 });
      await fs.rename(tmp, file);
    }).catch((error) => console.warn('CRM: не удалось сохранить локальный файл:', error.message));
    return chain;
  }

  return {
    async get(key) {
      const supabase = getSupabase();
      if (supabase) {
        const r = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
        if (r.error) throw new Error(`CRM get ${key}: ${r.error.message}`);
        return r.data?.value ? JSON.parse(r.data.value) : null;
      }
      return (await loadLocal())[key] ?? null;
    },
    async set(key, value) {
      const supabase = getSupabase();
      if (supabase) {
        const r = await supabase.from('app_settings').upsert({ key, value: JSON.stringify(value) });
        if (r.error) throw new Error(`CRM set ${key}: ${r.error.message}`);
        return;
      }
      (await loadLocal())[key] = value;
      scheduleFlush();
    },
    async del(key) {
      const supabase = getSupabase();
      if (supabase) {
        const r = await supabase.from('app_settings').delete().eq('key', key);
        if (r.error) throw new Error(`CRM del ${key}: ${r.error.message}`);
        return;
      }
      delete (await loadLocal())[key];
      scheduleFlush();
    },
    /* все записи с префиксом: [{ key, value }] */
    async list(prefix) {
      const supabase = getSupabase();
      if (supabase) {
        const out = [];
        for (let offset = 0; ; offset += 1000) {
          const r = await supabase.from('app_settings').select('key,value').like('key', `${prefix}%`).order('key').range(offset, offset + 999);
          if (r.error) throw new Error(`CRM list ${prefix}: ${r.error.message}`);
          for (const row of r.data || []) { try { out.push({ key: row.key, value: JSON.parse(row.value) }); } catch { /* битая строка пропускается */ } }
          if (!r.data || r.data.length < 1000) break;
        }
        return out;
      }
      const data = await loadLocal();
      return Object.keys(data).filter((key) => key.startsWith(prefix)).sort().map((key) => ({ key, value: data[key] }));
    },
    flush,
  };
}
