import * as XLSX from 'xlsx';

/**
 * Downloads a sample pre-formatted Excel template for importing multiple quiz rounds and questions.
 */
export function downloadQuizExcelTemplate() {
  const headers = [
    'Round Number',
    'Round Name',
    'Round Type',
    'Round Intro Media',
    'Round Intro Type',
    'Question',
    'Question Media',
    'Question Media Type',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Marks',
    '2nd Try Marks',
    'Time Limit (sec)'
  ];

  const sampleRows = [
    {
      'Round Number': 1,
      'Round Name': 'General Knowledge',
      'Round Type': 'one_question_one_chance',
      'Round Intro Media': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'Round Intro Type': 'video',
      'Question': 'What is the capital city of France?',
      'Question Media': '',
      'Question Media Type': '',
      'Option A': 'London',
      'Option B': 'Berlin',
      'Option C': 'Paris',
      'Option D': 'Madrid',
      'Correct Answer': 'C',
      'Marks': 1,
      '2nd Try Marks': '',
      'Time Limit (sec)': 30
    },
    {
      'Round Number': 1,
      'Round Name': 'General Knowledge',
      'Round Type': 'one_question_one_chance',
      'Round Intro Media': '',
      'Round Intro Type': '',
      'Question': 'കേരളത്തിലെ ഏറ്റവും വലിയ ജില്ല ഏത്?',
      'Question Media': '',
      'Question Media Type': '',
      'Option A': 'വയനാട്',
      'Option B': 'ഇടുക്കി',
      'Option C': 'പാലക്കാട്',
      'Option D': 'മലപ്പുറം',
      'Correct Answer': 'B',
      'Marks': 1,
      '2nd Try Marks': '',
      'Time Limit (sec)': 30
    },
    {
      'Round Number': 2,
      'Round Name': 'Two Chances Round',
      'Round Type': 'one_question_two_chances',
      'Round Intro Media': '',
      'Round Intro Type': '',
      'Question': 'Which planet in our solar system is known as the Red Planet?',
      'Question Media': '',
      'Question Media Type': '',
      'Option A': 'Venus',
      'Option B': 'Mars',
      'Option C': 'Jupiter',
      'Option D': 'Saturn',
      'Correct Answer': 'B',
      'Marks': 2,
      '2nd Try Marks': 1,
      'Time Limit (sec)': 45
    },
    {
      'Round Number': 3,
      'Round Name': 'Direct Verbal Q&A',
      'Round Type': 'answer_to_question',
      'Round Intro Media': '',
      'Round Intro Type': '',
      'Question': 'തിരുസഭയിൽ ആകെ എത്ര കൂദാശകളാണുള്ളത്?',
      'Question Media': '',
      'Question Media Type': '',
      'Option A': '',
      'Option B': '',
      'Option C': '',
      'Option D': '',
      'Correct Answer': '7 കൂദാശകൾ (മാമ്മോദീസ, സ്ഥൈര്യലേപനം, കുർബാന, കുമ്പസാരം, രോഗീലേപനം, തിരുപ്പട്ടം, വിവാഹം)',
      'Marks': 2,
      '2nd Try Marks': '',
      'Time Limit (sec)': 60
    },
    {
      'Round Number': 4,
      'Round Name': 'Media & Visual Round',
      'Round Type': 'media_based',
      'Round Intro Media': '',
      'Round Intro Type': '',
      'Question': 'Identify the world-famous landmark shown in this picture.',
      'Question Media': 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=600&q=80',
      'Question Media Type': 'image',
      'Option A': 'Eiffel Tower',
      'Option B': 'Big Ben',
      'Option C': 'Colosseum',
      'Option D': 'Leaning Tower of Pisa',
      'Correct Answer': 'A',
      'Marks': 2,
      '2nd Try Marks': '',
      'Time Limit (sec)': 30
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });

  worksheet['!cols'] = [
    { wch: 14 }, // Round Number
    { wch: 22 }, // Round Name
    { wch: 26 }, // Round Type
    { wch: 35 }, // Round Intro Media
    { wch: 18 }, // Round Intro Type
    { wch: 45 }, // Question
    { wch: 30 }, // Question Media
    { wch: 20 }, // Question Media Type
    { wch: 20 }, // Option A
    { wch: 20 }, // Option B
    { wch: 20 }, // Option C
    { wch: 20 }, // Option D
    { wch: 25 }, // Correct Answer
    { wch: 10 }, // Marks
    { wch: 14 }, // 2nd Try Marks
    { wch: 18 }  // Time Limit (sec)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'All Rounds');
  XLSX.writeFile(workbook, 'eventora_quiz_all_rounds_template.xlsx');
}

/**
 * Downloads a simple Excel template specifically for a single round.
 * No "Round Number" column needed — all rows belong to this round.
 */
export function downloadSingleRoundExcelTemplate(roundNumber = 1) {
  const headers = [
    'Question',
    'Question Media',
    'Question Media Type',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Correct Answer',
    'Marks',
    '2nd Try Marks',
    'Time Limit (sec)',
    'Round Type'
  ];

  const sampleRows = [
    {
      'Question': 'What is the capital city of France?',
      'Question Media': '',
      'Question Media Type': '',
      'Option A': 'London',
      'Option B': 'Berlin',
      'Option C': 'Paris',
      'Option D': 'Madrid',
      'Correct Answer': 'C',
      'Marks': 1,
      '2nd Try Marks': '',
      'Time Limit (sec)': 30,
      'Round Type': ''
    },
    {
      'Question': 'കേരളത്തിലെ ഏറ്റവും വലിയ ജില്ല ഏത്?',
      'Question Media': '',
      'Question Media Type': '',
      'Option A': 'വയനാട്',
      'Option B': 'ഇടുക്കി',
      'Option C': 'പാലക്കാട്',
      'Option D': 'മലപ്പുറം',
      'Correct Answer': 'B',
      'Marks': 1,
      '2nd Try Marks': '',
      'Time Limit (sec)': 30,
      'Round Type': ''
    },
    {
      'Question': 'തിരുസഭയിൽ ആകെ എത്ര കൂദാശകളാണുള്ളത്? (Direct Q&A Example)',
      'Question Media': '',
      'Question Media Type': '',
      'Option A': '',
      'Option B': '',
      'Option C': '',
      'Option D': '',
      'Correct Answer': '7 കൂദാശകൾ',
      'Marks': 2,
      '2nd Try Marks': '',
      'Time Limit (sec)': 45,
      'Round Type': 'answer_to_question'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });

  worksheet['!cols'] = [
    { wch: 45 }, // Question
    { wch: 30 }, // Question Media
    { wch: 20 }, // Question Media Type
    { wch: 20 }, // Option A
    { wch: 20 }, // Option B
    { wch: 20 }, // Option C
    { wch: 20 }, // Option D
    { wch: 25 }, // Correct Answer
    { wch: 10 }, // Marks
    { wch: 14 }, // 2nd Try Marks
    { wch: 18 }, // Time Limit (sec)
    { wch: 25 }  // Round Type
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Round ${roundNumber}`);
  XLSX.writeFile(workbook, `eventora_round_${roundNumber}_questions_template.xlsx`);
}
