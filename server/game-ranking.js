// Общий подсчёт рейтингов: сортировка по значению, при равенстве — у кого рекорд поставлен раньше, затем по имени.
// Места «спортивные»: одинаковый результат и время — одинаковое место (1, 2, 2, 4).
export const shortName = (a) => {
  const last = String(a.lastName || '').trim().slice(0, 1);
  return `${String(a.firstName || '').trim()}${last ? ` ${last}.` : ''}`.trim() || 'Ученик';
};

export const isRankable = (account) => account && account.role === 'student' && account.status !== 'withdrawn' && !account.progress?.trialAccount;

/** entries: [{ id, name, value, at }]  →  { top, me } */
export function buildRanking(entries, meId, limit = 20) {
  const list = entries.filter((e) => Number.isFinite(e.value) && e.value > 0)
    .map((e) => ({ ...e, at: Number.isFinite(e.at) && e.at > 0 ? e.at : Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => b.value - a.value || a.at - b.at || a.name.localeCompare(b.name, 'ru') || (a.id < b.id ? -1 : 1));
  let rank = 0;
  const ranked = list.map((e, i) => {
    if (i === 0 || e.value !== list[i - 1].value || e.at !== list[i - 1].at) rank = i + 1;
    return { id: e.id, rank, name: e.name, value: e.value };
  });
  const strip = ({ id, ...rest }) => ({ ...rest, me: id === meId });
  const mine = ranked.find((e) => e.id === meId);
  return { top: ranked.slice(0, limit).map(strip), me: mine ? { rank: mine.rank, value: mine.value } : null };
}
