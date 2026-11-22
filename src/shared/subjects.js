// Предметы центра Study Task. Используется на сервере, в админке и на лендинге.
export const SUBJECT_LIST = [
  { id: 'math', name: 'Математика', note: 'алгебра и геометрия' },
  { id: 'physics', name: 'Физика', note: '' },
  { id: 'informatics', name: 'Информатика', note: '' },
  { id: 'programming', name: 'Программирование', note: '' },
];
export const DEFAULT_SUBJECTS = ['math'];
export const SUBJECT_IDS = SUBJECT_LIST.map((s) => s.id);
/** Оставляет только известные предметы (в порядке списка, без повторов). */
export function cleanSubjects(input) {
  const set = new Set(Array.isArray(input) ? input : []);
  return SUBJECT_IDS.filter((id) => set.has(id));
}
