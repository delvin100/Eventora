/**
 * Client-side unbiased Fisher-Yates shuffle.
 */
export function fisherYatesShuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects N unique random winners from an array without replacement.
 */
export function pickRandomItems(items, count = 1) {
  if (!items || items.length === 0) return [];
  const shuffled = fisherYatesShuffle(items);
  return shuffled.slice(0, Math.min(count, items.length));
}
