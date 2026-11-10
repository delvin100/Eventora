import * as XLSX from 'xlsx';

function generateId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function normalizeKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveRoundType(typeStr, hasOptions) {
  const norm = normalizeKey(typeStr);
  if (norm.includes('two') || norm.includes('2chance') || norm === 'mcq2') {
    return 'one_question_two_chances';
  }
  if (norm.includes('direct') || norm.includes('answer') || norm.includes('verbal') || norm === 'qonly') {
    return 'answer_to_question';
  }
  if (norm.includes('media')) {
    return 'media_based';
  }
  if (norm.includes('one') || norm.includes('1chance') || norm === 'mcq') {
    return 'one_question_one_chance';
  }
  // Default based on whether options exist
  return hasOptions ? 'one_question_one_chance' : 'answer_to_question';
}

function resolveMediaType(url, explicitType) {
  if (explicitType) {
    const norm = String(explicitType).toLowerCase().trim();
    if (['video', 'audio', 'image'].includes(norm)) return norm;
  }
  if (!url) return 'video';
  const u = String(url).toLowerCase();
  if (u.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) return 'image';
  if (u.match(/\.(mp3|wav|ogg|m4a|aac)/i)) return 'audio';
  return 'video';
}

/**
 * Parses an Excel or CSV file buffer and returns structured rounds and questions.
 * @param {ArrayBuffer} dataBuffer
 * @param {Object} [options]
 * @param {number} [options.forceRoundNumber] - If specified, forces all questions in the sheet into this round.
 * @param {number} [options.defaultRoundNumber=1] - Fallback round number if none is in the sheet.
 * @returns {Promise<{ success: boolean, rounds: Array, totalQuestions: number, errors: Array, warnings: Array }>}
 */
export async function parseQuizExcel(dataBuffer, options = {}) {
  const errors = [];
  const warnings = [];
  const forceRoundNumber = options.forceRoundNumber ? parseInt(options.forceRoundNumber, 10) : null;
  const defaultRoundNumber = options.defaultRoundNumber ? parseInt(options.defaultRoundNumber, 10) : 1;

  let workbook;
  try {
    workbook = XLSX.read(dataBuffer, { type: 'array' });
  } catch (err) {
    return {
      success: false,
      rounds: [],
      totalQuestions: 0,
      errors: ['Failed to read spreadsheet file. Please ensure it is a valid .xlsx, .xls, or .csv document.'],
      warnings: []
    };
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      success: false,
      rounds: [],
      totalQuestions: 0,
      errors: ['The uploaded workbook has no sheets.'],
      warnings: []
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    return {
      success: false,
      rounds: [],
      totalQuestions: 0,
      errors: ['The spreadsheet contains no data rows.'],
      warnings: []
    };
  }

  // Group rows by round number
  const roundsMap = new Map();

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // 1-based, accounting for header row
    const normalizedRow = {};
    for (const [k, v] of Object.entries(row)) {
      normalizedRow[normalizeKey(k)] = typeof v === 'string' ? v.trim() : v;
    }

    const roundNumVal = normalizedRow['roundnumber'] || normalizedRow['roundno'] || normalizedRow['round'] || defaultRoundNumber;
    const roundNumber = forceRoundNumber ? forceRoundNumber : (parseInt(roundNumVal, 10) || defaultRoundNumber);

    const roundName = normalizedRow['roundname'] || normalizedRow['roundtitle'] || `Round ${roundNumber}`;
    const roundTypeRaw = normalizedRow['roundtype'] || '';
    const roundIntroMedia = normalizedRow['roundintromedia'] || normalizedRow['roundmedia'] || normalizedRow['intromedia'] || '';
    const roundIntroTypeRaw = normalizedRow['roundintrotype'] || normalizedRow['roundmediatype'] || '';

    const questionText = normalizedRow['question'] || normalizedRow['questiontext'] || normalizedRow['title'] || '';
    if (!questionText) {
      warnings.push(`Row ${rowNum}: Skipped because question text is empty.`);
      return;
    }

    const questionMedia = normalizedRow['questionmedia'] || normalizedRow['mediaurl'] || normalizedRow['media'] || '';
    const questionMediaType = resolveMediaType(questionMedia, normalizedRow['questionmediatype'] || normalizedRow['mediatype']);

    const marksVal = normalizedRow['marks'] || normalizedRow['mark'] || normalizedRow['points'] || 1;
    const marks = Math.max(1, parseInt(marksVal, 10) || 1);

    const secondMarksVal = normalizedRow['2ndtrymarks'] || normalizedRow['secondtrymarks'] || normalizedRow['secondattemptmarks'] || 1;
    const secondTryMarks = Math.max(0, parseInt(secondMarksVal, 10) || 1);

    const timeLimitVal = normalizedRow['timelimitsec'] || normalizedRow['timelimit'] || normalizedRow['time'] || '';
    const timeLimit = timeLimitVal !== '' ? Math.max(5, parseInt(timeLimitVal, 10) || 30) : '';

    // Collect options
    const rawOptions = [];
    ['optiona', 'optionb', 'optionc', 'optiond', 'optione', 'optionf'].forEach((key, optIdx) => {
      const val = normalizedRow[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        rawOptions.push({
          letter: String.fromCharCode(65 + optIdx),
          text: String(val).trim()
        });
      }
    });

    const correctAnswerVal = String(
      normalizedRow['correctanswer'] ||
      normalizedRow['answer'] ||
      normalizedRow['correct'] ||
      ''
    ).trim();

    const hasOptions = rawOptions.length >= 2;
    const roundType = resolveRoundType(roundTypeRaw, hasOptions);

    const explicitFormat = normalizedRow['format'] || normalizedRow['questionformat'] || '';
    const normFormat = String(explicitFormat).toLowerCase();
    const isExplicitDirect = normFormat.includes('direct') || normFormat.includes('verbal') || normFormat.includes('qonly') || normFormat === 'answer';
    const isExplicitMcq = normFormat.includes('mcq') || normFormat.includes('choice');

    const isDirectFormat = roundType === 'answer_to_question' || isExplicitDirect || (!hasOptions && (roundType === 'media_based' || Boolean(correctAnswerVal) || !isExplicitMcq));

    let structuredOptions = [];
    let directAnswer = '';

    if (isDirectFormat) {
      directAnswer = correctAnswerVal || '';
    } else {
      // It is an MCQ
      if (rawOptions.length < 2) {
        errors.push(`Row ${rowNum} ("${questionText.substring(0, 30)}..."): MCQs require at least 2 options (Option A & Option B).`);
        return;
      }

      // Check which option is correct
      const upperCorrect = correctAnswerVal.toUpperCase();
      let matchedIndex = -1;

      // 1. Try matching letter: 'A', 'B', 'C', 'D'
      matchedIndex = rawOptions.findIndex(o => o.letter === upperCorrect);

      // 2. If not matched, try matching exact option text
      if (matchedIndex === -1 && correctAnswerVal) {
        matchedIndex = rawOptions.findIndex(o => o.text.toLowerCase() === correctAnswerVal.toLowerCase());
      }

      if (matchedIndex === -1) {
        warnings.push(`Row ${rowNum} ("${questionText.substring(0, 30)}..."): Correct Answer "${correctAnswerVal}" didn't match any option letters or texts. Defaulted Option A as correct.`);
        matchedIndex = 0;
      }

      structuredOptions = rawOptions.map((o, idx) => ({
        id: generateId('opt'),
        text: o.text,
        isCorrect: idx === matchedIndex
      }));
    }

    const questionObj = {
      id: generateId('q'),
      text: questionText,
      marks,
      secondTryMarks,
      timeLimit,
      mediaUrl: questionMedia,
      mediaType: questionMediaType,
      options: structuredOptions,
      answer: directAnswer,
      format: isDirectFormat ? 'direct' : 'mcq'
    };

    if (!roundsMap.has(roundNumber)) {
      roundsMap.set(roundNumber, {
        roundNumber,
        name: roundName,
        title: roundName,
        quizType: roundType,
        isTypeConfirmed: true,
        introMediaUrl: roundIntroMedia,
        introMediaType: resolveMediaType(roundIntroMedia, roundIntroTypeRaw),
        questions: []
      });
    }

    const roundObj = roundsMap.get(roundNumber);
    // Keep roundType updated if first question provided it
    if (roundType && (!roundObj.quizType || roundObj.quizType === 'one_question_one_chance')) {
      roundObj.quizType = roundType;
    }
    if (roundIntroMedia && !roundObj.introMediaUrl) {
      roundObj.introMediaUrl = roundIntroMedia;
      roundObj.introMediaType = resolveMediaType(roundIntroMedia, roundIntroTypeRaw);
    }
    roundObj.questions.push(questionObj);
  });

  const sortedRounds = Array.from(roundsMap.values()).sort((a, b) => a.roundNumber - b.roundNumber);
  const totalQuestions = sortedRounds.reduce((sum, r) => sum + r.questions.length, 0);

  if (sortedRounds.length === 0 && errors.length === 0) {
    errors.push('No valid questions could be extracted from the uploaded spreadsheet.');
  }

  return {
    success: errors.length === 0,
    rounds: sortedRounds,
    totalQuestions,
    errors,
    warnings
  };
}

