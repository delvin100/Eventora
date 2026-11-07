import { supabase } from '../lib/supabase';
import { slugify } from '../utils/slugUtils';

const LOCAL_STORAGE_KEY = 'eventora_quizzes_cache';

function formatQuizRecord(r) {
  const currentRound = Number(r.settings?.currentRound) || 1;
  const isFinished = Boolean(r.settings?.isFinished);
  const rawRounds = r.settings?.rounds || r.result_snapshot?.rounds;
  const rounds = Array.isArray(rawRounds) && rawRounds.length > 0
    ? rawRounds
    : [
        {
          roundNumber: 1,
          quizType: r.settings?.quizType || null,
          isTypeConfirmed: Boolean(r.settings?.quizType && (r.result_snapshot?.questions?.length > 0 || r.settings?.isTypeConfirmed)),
          questions: r.result_snapshot?.questions || [],
          isCompleted: false
        }
      ];

  const activeRound = rounds.find(rnd => rnd.roundNumber === currentRound) || rounds[0];
  const questions = activeRound?.questions || r.result_snapshot?.questions || [];
  const participants = r.result_snapshot?.participants || r.settings?.participants || [];
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  return {
    id: r.id,
    name: r.result_name,
    description: r.settings?.description || '',
    quizType: activeRound?.quizType || r.settings?.quizType || null,
    defaultMarks: Number(r.settings?.defaultMarks) || 1,
    defaultTimeValue: r.settings?.defaultTimeValue ?? '',
    defaultTimeUnit: r.settings?.defaultTimeUnit || 'sec',
    currentRound,
    isFinished,
    rounds,
    questionsCount: questions.length,
    participantsCount: Array.isArray(participants) ? participants.length : 0,
    totalMarks,
    questions,
    participants,
    created_at: r.created_at,
    updated_at: r.settings?.updated_at || r.created_at
  };
}

function getLocalQuizzes(userId) {
  try {
    const list = [];
    if (userId) {
      const userRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
      if (userRaw) {
        try { list.push(...JSON.parse(userRaw)); } catch (_) {}
      }
    }
    const guestRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_guest`);
    if (guestRaw) {
      try { list.push(...JSON.parse(guestRaw)); } catch (_) {}
    }
    const baseRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (baseRaw) {
      try { list.push(...JSON.parse(baseRaw)); } catch (_) {}
    }

    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_STORAGE_KEY)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) list.push(...parsed);
            }
          } catch (_) {}
        }
      }
    }

    const map = new Map();
    for (const q of list) {
      if (q && q.id && !map.has(q.id)) {
        map.set(q.id, q);
      }
    }
    return Array.from(map.values());
  } catch (_) {
    return [];
  }
}

function saveLocalQuizzes(userId, quizzes) {
  try {
    const key = `${LOCAL_STORAGE_KEY}_${userId || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(quizzes));
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_guest`, JSON.stringify(quizzes));
  } catch (_) {}
}

export const QUIZ_TYPES = [
  {
    id: 'one_question_one_chance',
    name: 'One Question - One Chance',
    description: 'Multiple choice questions with 1 attempt per question.',
    mode: 'mcq',
    isAvailable: true
  },
  {
    id: 'one_question_two_chances',
    name: 'One Question - Two Chances',
    description: 'Multiple choice questions with 2 attempts per question.',
    mode: 'mcq_2',
    isAvailable: true
  },
  {
    id: 'answer_to_question',
    name: 'Answer to Question',
    description: 'Direct question and answer without options.',
    mode: 'direct',
    isAvailable: true
  },
  {
    id: 'media_based',
    name: 'Media Question (Audio/Video/Image)',
    description: 'Questions with audio, video, or image links. Choose MCQ or Question Only.',
    mode: 'media',
    isAvailable: true
  }
];

export const quizService = {
  // Fetch all quizzes for current user
  async getQuizzes() {
    let user = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (_) {}
    }

    const localItems = getLocalQuizzes(user?.id);

    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('results')
          .select('*')
          .eq('owner_id', user.id)
          .eq('operation_type', 'quiz')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const formatted = data.map(formatQuizRecord);

          // Update local cache
          saveLocalQuizzes(user.id, formatted);
          return formatted;
        }
      } catch (err) {
        console.warn('Failed to fetch quizzes from Supabase, returning cache:', err);
      }
    }

    return localItems;
  },

  // Fetch single quiz by ID or Slug
  async getQuizById(idOrSlug) {
    if (!idOrSlug) return null;

    let user = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (_) {}
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const targetSlug = slugify(idOrSlug);
    const cleanName = decodeURIComponent(idOrSlug).replace(/[-_]+/g, ' ').trim().toLowerCase();

    // 1. Try Supabase
    if (supabase && user) {
      try {
        if (isUUID) {
          const { data, error } = await supabase
            .from('results')
            .select('*')
            .eq('id', idOrSlug)
            .eq('operation_type', 'quiz')
            .maybeSingle();

          if (!error && data) {
            return formatQuizRecord(data);
          }
        }

        // Try slug or matching result_name
        const { data: allUserQuizzes, error } = await supabase
          .from('results')
          .select('*')
          .eq('owner_id', user.id)
          .eq('operation_type', 'quiz')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(allUserQuizzes)) {
          const matched = allUserQuizzes.find(r => {
            const rSlug = slugify(r.result_name);
            return rSlug === targetSlug || r.result_name?.toLowerCase() === cleanName || r.id === idOrSlug;
          }) || allUserQuizzes.find(r => r.result_name?.toLowerCase().includes(cleanName));

          if (matched) {
            return formatQuizRecord(matched);
          }
        }
      } catch (_) {}
    }

    // 2. Try Local Cache
    const local = getLocalQuizzes(user?.id);
    if (isUUID) {
      const match = local.find(q => q && q.id === idOrSlug);
      if (match) return match;
    }

    return local.find(q => {
      if (!q) return false;
      const qSlug = slugify(q.name);
      const qName = (q.name || '').toLowerCase().trim();
      return qSlug === targetSlug || qName === cleanName || q.id === idOrSlug;
    }) || local.find(q => q && (q.name || '').toLowerCase().includes(cleanName)) || null;
  },

  // Create a new quiz
  async createQuiz({ name, description = '', defaultMarks = 1, numberOfRounds = 1 }) {
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Quiz name is required');

    let user = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (_) {}
    }

    const count = Math.max(1, parseInt(numberOfRounds, 10) || 1);
    const initialRounds = Array.from({ length: count }, (_, idx) => ({
      roundNumber: idx + 1,
      quizType: null,
      isTypeConfirmed: false,
      questions: [],
      isCompleted: false
    }));

    const initialSettings = {
      description: description.trim(),
      quizType: null,
      defaultMarks: Number(defaultMarks) || 1,
      defaultTimeValue: '',
      defaultTimeUnit: 'sec',
      currentRound: 1,
      isFinished: false,
      rounds: initialRounds,
      updated_at: new Date().toISOString()
    };

    // 1. Try Supabase insert
    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('results')
          .insert([{
            owner_id: user.id,
            result_name: cleanName,
            operation_type: 'quiz',
            settings: initialSettings,
            result_snapshot: { questions: [], participants: [], rounds: initialRounds }
          }])
          .select()
          .single();

        if (!error && data) {
          const newQuiz = {
            id: data.id,
            name: data.result_name,
            description: description.trim(),
            quizType: null,
            defaultMarks: Number(defaultMarks) || 1,
            defaultTimeValue: '',
            defaultTimeUnit: 'sec',
            currentRound: 1,
            isFinished: false,
            rounds: initialRounds,
            questionsCount: 0,
            participantsCount: 0,
            totalMarks: 0,
            questions: [],
            participants: [],
            created_at: data.created_at,
            updated_at: data.created_at
          };

          const local = getLocalQuizzes(user.id);
          saveLocalQuizzes(user.id, [newQuiz, ...local]);
          return newQuiz;
        }
      } catch (err) {
        console.warn('Supabase create quiz failed, fallback to local storage:', err);
      }
    }

    // 2. Local Fallback
    const localQuiz = {
      id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: cleanName,
      description: description.trim(),
      quizType: null,
      defaultMarks: Number(defaultMarks) || 1,
      defaultTimeValue: '',
      defaultTimeUnit: 'sec',
      currentRound: 1,
      isFinished: false,
      rounds: initialRounds,
      questionsCount: 0,
      participantsCount: 0,
      totalMarks: 0,
      questions: [],
      participants: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const local = getLocalQuizzes(user?.id);
    saveLocalQuizzes(user?.id, [localQuiz, ...local]);
    return localQuiz;
  },

  // Save / update quiz questions and settings
  async updateQuiz(quizId, {
    name,
    description,
    quizType,
    defaultMarks,
    defaultTimeValue,
    defaultTimeUnit,
    currentRound,
    isFinished,
    rounds,
    questions,
    participants
  }) {
    if (!quizId) throw new Error('Quiz ID is required');

    let user = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (_) {}
    }

    const local = getLocalQuizzes(user?.id);
    const existing = local.find(q => q.id === quizId);

    const activeRoundNum = currentRound !== undefined ? Number(currentRound) : (existing?.currentRound || 1);
    const updatedIsFinished = isFinished !== undefined ? Boolean(isFinished) : Boolean(existing?.isFinished);

    let cleanRounds = rounds !== undefined ? (Array.isArray(rounds) ? [...rounds] : []) : (existing?.rounds ? [...existing.rounds] : [
      {
        roundNumber: 1,
        quizType: existing?.quizType || null,
        isTypeConfirmed: Boolean(existing?.quizType),
        questions: existing?.questions || [],
        isCompleted: false
      }
    ]);

    // Ensure round for activeRoundNum exists in cleanRounds
    const roundIdx = cleanRounds.findIndex(r => r.roundNumber === activeRoundNum);
    if (roundIdx >= 0) {
      cleanRounds[roundIdx] = {
        ...cleanRounds[roundIdx],
        quizType: quizType !== undefined ? quizType : cleanRounds[roundIdx].quizType,
        isTypeConfirmed: quizType !== undefined ? Boolean(quizType) : cleanRounds[roundIdx].isTypeConfirmed,
        questions: questions !== undefined ? (Array.isArray(questions) ? questions : []) : (cleanRounds[roundIdx].questions || [])
      };
    } else {
      cleanRounds.push({
        roundNumber: activeRoundNum,
        quizType: quizType || null,
        isTypeConfirmed: Boolean(quizType),
        questions: questions !== undefined ? (Array.isArray(questions) ? questions : []) : [],
        isCompleted: false
      });
    }

    const currentRoundEntry = cleanRounds.find(r => r.roundNumber === activeRoundNum) || cleanRounds[0];
    const cleanQuestions = questions !== undefined ? (Array.isArray(questions) ? questions : []) : (currentRoundEntry?.questions || existing?.questions || []);
    const cleanParticipants = participants !== undefined ? (Array.isArray(participants) ? participants : []) : (existing?.participants || []);
    const totalMarks = cleanQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

    const updatedSettings = {
      description: description !== undefined ? description : (existing?.description || ''),
      quizType: quizType !== undefined ? quizType : (currentRoundEntry?.quizType || existing?.quizType || null),
      defaultMarks: Number(defaultMarks) || (existing?.defaultMarks || 1),
      defaultTimeValue: defaultTimeValue !== undefined ? defaultTimeValue : (existing?.defaultTimeValue ?? ''),
      defaultTimeUnit: defaultTimeUnit || (existing?.defaultTimeUnit || 'sec'),
      currentRound: activeRoundNum,
      isFinished: updatedIsFinished,
      rounds: cleanRounds,
      updated_at: new Date().toISOString()
    };

    // 1. Try Supabase
    if (supabase && user) {
      try {
        const updatePayload = {
          settings: updatedSettings,
          result_snapshot: {
            questions: cleanQuestions,
            participants: cleanParticipants,
            rounds: cleanRounds
          }
        };
        if (name) updatePayload.result_name = name.trim();

        await supabase
          .from('results')
          .update(updatePayload)
          .eq('id', quizId)
          .eq('owner_id', user.id);
      } catch (err) {
        console.warn('Supabase update quiz failed:', err);
      }
    }

    // 2. Update local storage
    const updatedLocal = local.map(q => {
      if (q.id === quizId) {
        return {
          ...q,
          name: name ? name.trim() : q.name,
          description: description !== undefined ? description : q.description,
          quizType: quizType !== undefined ? quizType : (currentRoundEntry?.quizType || q.quizType),
          defaultMarks: Number(defaultMarks) || q.defaultMarks,
          defaultTimeValue: defaultTimeValue !== undefined ? defaultTimeValue : (q.defaultTimeValue ?? ''),
          defaultTimeUnit: defaultTimeUnit || (q.defaultTimeUnit || 'sec'),
          currentRound: activeRoundNum,
          isFinished: updatedIsFinished,
          rounds: cleanRounds,
          questions: cleanQuestions,
          participants: cleanParticipants,
          questionsCount: cleanQuestions.length,
          participantsCount: cleanParticipants.length,
          totalMarks,
          updated_at: new Date().toISOString()
        };
      }
      return q;
    });

    saveLocalQuizzes(user?.id, updatedLocal);
    return true;
  },

  // Helper to update only participants for a quiz
  async saveQuizParticipants(quizId, participants) {
    return this.updateQuiz(quizId, { participants });
  },

  // Delete a quiz
  async deleteQuiz(quizId) {
    if (!quizId) return;

    let user = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (_) {}
    }

    if (supabase && user) {
      try {
        await supabase
          .from('results')
          .delete()
          .eq('id', quizId)
          .eq('owner_id', user.id);
      } catch (_) {}
    }

    const local = getLocalQuizzes(user?.id);
    saveLocalQuizzes(user?.id, local.filter(q => q.id !== quizId));
    return true;
  }
};

