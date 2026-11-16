// Какие пробные уроки реально занимают слот в расписании преподавателя.
// Отказ, «не пришёл», «пришёл» и «записался» — это уже итог пробного, слот он больше не занимает.
export const ACTIVE_TRIAL_STATUSES = ['scheduled', 'trial'];

export function isActiveTrial(lesson) {
  if (!lesson) return false;
  const status = lesson.status;
  return status === undefined || status === null || status === '' || ACTIVE_TRIAL_STATUSES.includes(status);
}

export function activeTrialsInSlot(trials, teacherId, day, hour) {
  return (Array.isArray(trials) ? trials : []).filter((lesson) => isActiveTrial(lesson) && lesson.teacherId === teacherId && lesson.day === day && lesson.hour === hour);
}
