import * as XLSX from 'xlsx';

/**
 * Generates and downloads a clean sample Excel template for importing participants.
 */
export function downloadSampleTemplate() {
  const sampleData = [
    {
      'Full Name': 'Emma Watson',
      'Identifier / ID': 'STU-1001',
      'Department / Group': 'Science',
      'Notes': 'Class Rep'
    },
    {
      'Full Name': 'Liam Davis',
      'Identifier / ID': 'STU-1002',
      'Department / Group': 'Arts',
      'Notes': ''
    },
    {
      'Full Name': 'Sophia Chen',
      'Identifier / ID': 'STU-1003',
      'Department / Group': 'Science',
      'Notes': ''
    },
    {
      'Full Name': 'Noah Miller',
      'Identifier / ID': 'STU-1004',
      'Department / Group': 'Commerce',
      'Notes': ''
    },
    {
      'Full Name': 'Olivia Jones',
      'Identifier / ID': 'STU-1005',
      'Department / Group': 'Arts',
      'Notes': ''
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Set nice column widths
  worksheet['!cols'] = [
    { wch: 22 }, // Full Name
    { wch: 18 }, // ID
    { wch: 22 }, // Department
    { wch: 20 }  // Notes
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
    'Participant Name': sanitize(p.name),
    'Identifier / ID': sanitize(p.external_identifier),
    'Category / Group': sanitize(p.metadata?.department || p.category || ''),
    'Added Date': p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

  const safeFilename = `${eventName.replace(/[^a-zA-Z0-9_-]/g, '_')}_participants.xlsx`;
  XLSX.writeFile(workbook, safeFilename);
}
