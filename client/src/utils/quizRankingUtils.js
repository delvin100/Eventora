/**
 * Utility functions for calculating quiz standings with joint / shared ranks for ties.
 * Participants are ranked strictly by Score (highest first).
 * Equal scores share the same rank (Tied).
 */

export function computeStandings(list) {
  if (!Array.isArray(list) || list.length === 0) return [];

  // Sort by score ONLY (descending)
  const sorted = [...list].sort((a, b) => {
    return (Number(b.score) || 0) - (Number(a.score) || 0);
  });

  // Calculate standard competition ranking (1, 1, 3, 4...) based strictly on score
  return sorted.map((p, idx) => {
    const pScore = Number(p.score) || 0;

    // Standard competition rank: 1 + number of participants with strictly higher score
    let rank = 1;
    for (let j = 0; j < idx; j++) {
      const prevScore = Number(sorted[j].score) || 0;
      if (prevScore > pScore) {
        rank++;
      }
    }

    // Check if tied with any other participant with the same score
    const isTied = sorted.some((other, oIdx) => {
      if (oIdx === idx) return false;
      const otherScore = Number(other.score) || 0;
      return otherScore === pScore;
    });

    return {
      ...p,
      rank,
      isTied
    };
  });
}

export function getRankBadge(rank, isTied = false, format = 'short') {
  const tieLabel = isTied ? ' (Tied)' : '';
  if (format === 'ordinal') {
    if (rank === 1) return `🥇 1st${tieLabel}`;
    if (rank === 2) return `🥈 2nd${tieLabel}`;
    if (rank === 3) return `🥉 3rd${tieLabel}`;
    return `#${rank}${tieLabel}`;
  }
  // short format
  if (rank === 1) return `🥇 1${tieLabel}`;
  if (rank === 2) return `🥈 2${tieLabel}`;
  if (rank === 3) return `🥉 3${tieLabel}`;
  return `#${rank}${tieLabel}`;
}

export function getRankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

