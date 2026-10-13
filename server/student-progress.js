export function mergeStudentProgress(currentProgress, requestBody) {
  const { xp, level, claimedPrizes, unlockedAchievements } = requestBody || {};
  if (!Number.isSafeInteger(xp) || xp < 0 || xp > 100_000_000 || !Number.isSafeInteger(level) || level < 1 || level > 100_000) {
    throw new TypeError('Некорректные значения прогресса.');
  }
  if (!Array.isArray(claimedPrizes) || claimedPrizes.length > 100 || claimedPrizes.some((id) => typeof id !== 'string' || id.length > 120)) {
    throw new TypeError('Некорректный список призов.');
  }
  if (!Array.isArray(unlockedAchievements) || unlockedAchievements.length > 200 || unlockedAchievements.some((id) => typeof id !== 'string' || id.length > 120)) {
    throw new TypeError('Некорректный список достижений.');
  }

  return {
    ...(currentProgress || {}),
    stars: Number.isSafeInteger(currentProgress?.stars) && currentProgress.stars >= 0 ? currentProgress.stars : 0,
    xp,
    level,
    claimedPrizes: [...new Set(claimedPrizes)],
    unlockedAchievements: [...new Set(unlockedAchievements)],
  };
}
