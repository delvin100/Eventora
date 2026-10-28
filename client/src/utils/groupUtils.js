import * as XLSX from 'xlsx';
import { fisherYatesShuffle } from './shuffleUtils';
import { GROUP_NAME_THEMES } from './taskBank';

/**
 * Creates G balanced groups from an array of participants.
 * Handles uneven counts without losing anyone (e.g. 23 items / 4 groups => 6, 6, 6, 5).
 * Supports thematic names (e.g. Gospel writers, virtues, stars).
 */
export function createGroupsByCount(participants, groupCount, themeKey = 'standard') {
  if (!participants || participants.length === 0 || groupCount <= 0) return [];

  const shuffled = fisherYatesShuffle(participants);
  const actualCount = Math.min(groupCount, participants.length);

  const themeConfig = GROUP_NAME_THEMES[themeKey];
  const customNames = themeConfig?.names;

  const groups = Array.from({ length: actualCount }, (_, i) => {
    let name = `Team ${String.fromCharCode(65 + i)}`;
    if (customNames && customNames[i]) {
      name = customNames[i];
    } else if (customNames && i >= customNames.length) {
      name = `${customNames[i % customNames.length]} ${Math.floor(i / customNames.length) + 1}`;
    }
    return {
      id: `grp-${Date.now()}-${i + 1}`,
      name,
      members: []
    };
  });

  // Balanced round-robin distribution
  shuffled.forEach((participant, index) => {
    const targetGroup = index % actualCount;
    groups[targetGroup].members.push(participant);
  });

  return groups;
}

/**
 * Creates groups with target size S from an array of participants.
 */
export function createGroupsBySize(participants, groupSize, themeKey = 'standard') {
  if (!participants || participants.length === 0 || groupSize <= 0) return [];
  const targetCount = Math.max(1, Math.round(participants.length / groupSize));
  return createGroupsByCount(participants, targetCount, themeKey);
}

/**
 * Exports group assignments to an Excel spreadsheet.
 */
export function exportGroupsToExcel(groups, eventName = 'Event') {
  const sanitize = (val) => {
    if (typeof val === 'string' && /^[=+@-]/i.test(val)) return `'${val}`;
    return val || '';
  };

  const rows = [];
  groups.forEach(g => {
    g.members.forEach((m, idx) => {
      rows.push({
        'Group / Team': sanitize(g.name),
        '# in Group': idx + 1,
        'Member Name': sanitize(m.name),
        'Identifier / ID': sanitize(m.external_identifier),
        'Department / Category': sanitize(m.metadata?.department || m.category)
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 26 },
    { wch: 18 },
    { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Groups');

  const safeName = `${eventName.replace(/[^a-zA-Z0-9_-]/g, '_')}_groups.xlsx`;
  XLSX.writeFile(workbook, safeName);
}
