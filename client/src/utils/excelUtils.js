import * as XLSX from 'xlsx';
import { formatDate } from './dateUtils';

/**
 * Generates and downloads a clean sample Excel template for importing participants.
 */
export function downloadSampleTemplate() {
  const sampleData = [
    { 'Full Name': 'Emma Watson' },
    { 'Full Name': 'Liam Davis' },
    { 'Full Name': 'Sophia Chen' },
    { 'Full Name': 'Noah Miller' },
    { 'Full Name': 'Olivia Jones' }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Set nice column width for Full Name
  worksheet['!cols'] = [
    { wch: 30 } // Full Name
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');
  XLSX.writeFile(workbook, 'eventora_participants_template.xlsx');
}

/**
 * Parses an uploaded Excel or CSV file into sheets and raw rows.
 * @param {File} file 
 * @returns {Promise<{ sheetNames: string[], sheets: Record<string, any[]> }>}
 */
export function parseSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        const sheets = {};

        sheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          // Convert to JSON with headers as keys
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          sheets[sheetName] = rows;
        });

        resolve({ sheetNames, sheets });
      } catch (err) {
        reject(new Error('Failed to parse file: ' + err.message));
      }
    };

    reader.onerror = (err) => reject(new Error('Error reading file: ' + err.message));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exports participants list to an Excel workbook with safety sanitization against formula injection.
 * @param {Array} participants 
 * @param {string} eventName 
 */
export function exportParticipantsToExcel(participants, eventName = 'Event') {
  const sanitize = (val) => {
    if (typeof val === 'string' && /^[=+@-]/i.test(val)) {
      // Prevent spreadsheet formula injection by prefixing with a quote
      return `'${val}`;
    }
    return val || '';
  };

  const rows = participants.map((p, idx) => ({
    '#': idx + 1,
    'Full Name': sanitize(p.name)
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 32 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

  const safeFilename = `${eventName.replace(/[^a-zA-Z0-9_-]/g, '_')}_participants.xlsx`;
  XLSX.writeFile(workbook, safeFilename);
}
