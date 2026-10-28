import crypto from 'crypto';

/**
 * Generates an unbiased cryptographically secure integer in range [min, max).
 */
export function secureRandomInt(min, max) {
  if (min >= max) return min;
  return crypto.randomInt(min, max);
}

/**
 * Unbiased Fisher-Yates shuffle backed by crypto.randomInt.
 */
export function secureShuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects N unique random items from an array without repeats.
 */
export function secureSelectWinners(items, count = 1) {
  if (!items || items.length === 0) return [];
  const shuffled = secureShuffle(items);
  return shuffled.slice(0, Math.min(count, items.length));
}

/**
 * Splits items into balanced groups without losing any participants.
 * e.g., 23 items into 4 groups => sizes 6, 6, 6, 5.
 */
export function formBalancedGroups(items, groupCount) {
  if (!items || items.length === 0 || groupCount <= 0) return [];
  const shuffled = secureShuffle(items);
  const actualGroupCount = Math.min(groupCount, items.length);

  const groups = Array.from({ length: actualGroupCount }, (_, i) => ({
    id: `group-${i + 1}`,
    name: `Group ${i + 1}`,
    members: []
  }));

  shuffled.forEach((item, index) => {
    const targetGroup = index % actualGroupCount;
    groups[targetGroup].members.push(item);
  });

  return groups;
}
