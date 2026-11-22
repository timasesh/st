// Предметы учеников. Хранятся отдельной картой {studentId: [subjectId]} (Supabase app_settings или файл DATA_DIR),
// чтобы не менять схему таблицы accounts. Нет записи — значит «Математика».
import path from 'node:path';
import { cleanSubjects, DEFAULT_SUBJECTS } from '../src/shared/subjects.js';

const KEY = 'student_subjects';

export function createStudentSubjects({ getSupabase, readJsonFileOr, writeJsonAtomically, dataDir }) {
  const filePath = path.join(dataDir, 'student-subjects.json');
  let cache = null;

  async function load() {
    if (cache) return cache;
    const sb = getSupabase();
    let raw;
    if (sb) {
      const r = await sb.from('app_settings').select('value').eq('key', KEY).maybeSingle();
      if (r.error) throw new Error(`Supabase app_settings: ${r.error.message}`);
      try { raw = r.data?.value ? JSON.parse(r.data.value) : {}; } catch { raw = {}; }
    } else raw = await readJsonFileOr(filePath, {});
    cache = raw && typeof raw === 'object' ? raw : {};
    return cache;
  }
  async function persist() {
    const sb = getSupabase();
    if (sb) { const r = await sb.from('app_settings').upsert({ key: KEY, value: JSON.stringify(cache) }); if (r.error) throw new Error(`Supabase app_settings: ${r.error.message}`); }
    else await writeJsonAtomically(filePath, cache);
  }
  /** Синхронно, после await load(). */
  const get = (id) => { const v = cache && cache[id]; const c = cleanSubjects(v); return Array.isArray(v) && c.length ? c : [...DEFAULT_SUBJECTS]; };
  async function set(id, subjects) {
    await load();
    const c = cleanSubjects(subjects);
    cache[id] = c.length ? c : [...DEFAULT_SUBJECTS];
    await persist();
    return cache[id];
  }
  return { load, get, set };
}
