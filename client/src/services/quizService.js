import { supabase } from '../lib/supabase';
import { slugify } from '../utils/slugUtils';

const LOCAL_STORAGE_KEY = 'eventora_quizzes_cache';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

function formatQuizRecord(r) {
  const currentRound = Number(r.settings?.currentRound) || 1;
  const isFinished = Boolean(r.settings?.isFinished);
  const introMediaUrl = r.settings?.introMediaUrl || '';
  const introMediaType = r.settings?.introMediaType || 'video';
  const rawRounds = r.settings?.rounds || r.result_snapshot?.rounds;
  const baseRounds = Array.isArray(rawRounds) && rawRounds.length > 0
    ? rawRounds
    : [
        {
          roundNumber: 1,
          quizType: r.settings?.quizType || null,
          isTypeConfirmed: Boolean(r.settings?.quizType && (r.result_snapshot?.questions?.length > 0 || r.settings?.isTypeConfirmed)),
          questions: r.result_snapshot?.questions || [],
          isCompleted: false,
          introMediaUrl: '',
          introMediaType: 'video'
        }
      ];

  const rounds = baseRounds.map(rnd => ({
    ...rnd,
    introMediaUrl: rnd.introMediaUrl || '',
    introMediaType: rnd.introMediaType || 'video'
  }));

  const activeRound = rounds.find(rnd => rnd.roundNumber === currentRound) || rounds[0];
  const questions = activeRound?.questions || r.result_snapshot?.questions || [];
  const participants = r.result_snapshot?.participants || r.settings?.participants || [];
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  return {
    id: r.id,
    owner_id: r.owner_id,
    owner: r.owner || null,
    name: r.result_name,
    description: r.settings?.description || '',
    quizType: activeRound?.quizType || r.settings?.quizType || null,
    defaultMarks: Number(r.settings?.defaultMarks) || 1,
    defaultTimeValue: r.settings?.defaultTimeValue ?? '',
    defaultTimeUnit: r.settings?.defaultTimeUnit || 'sec',
    currentRound,
    isFinished,
    introMediaUrl,
    introMediaType,
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
  },
  {
    id: 'rapid_fire',
    name: 'Rapid Fire Round',
    description: 'Single participant hot-seat round with master countdown timer and instant question flow.',
    mode: 'rapid',
    isAvailable: true
  }
];

export const quizService = {
  // Fetch all quizzes across all users (Admin only)
  async getAllUsersQuizzes(user = null) {
    let currentUser = user;
    if (!currentUser && supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        currentUser = data?.user;
      } catch (_) {}
    }

    const email = currentUser?.email || '';

    // 1. Try Backend Admin API
    try {
      const res = await fetch(`${API_BASE_URL}/ps/admin/all-quizzes?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.quizzes)) {
          return json.quizzes.map(q => {
            const formatted = formatQuizRecord(q);
            return {
              ...formatted,
              owner: q.owner || null
            };
          });
        }
      }
    } catch (err) {
      console.warn('Backend all-quizzes API fetch failed, trying Supabase fallback:', err);
    }

    // 2. Supabase Fallback (direct access)
    if (supabase) {
      try {
        const [{ data: results, error: resErr }, { data: profiles }] = await Promise.all([
          supabase.from('results').select('*').eq('operation_type', 'quiz').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*')
        ]);

        if (resErr) throw resErr;

        const profileMap = new Map();
        (profiles || []).forEach(p => profileMap.set(p.id, p));

        return (results || []).map(r => {
          const profile = profileMap.get(r.owner_id);
          const ownerEmail = profile?.display_name?.includes('@')
            ? profile.display_name
            : `${profile?.display_name?.toLowerCase().replace(/\s+/g, '') || 'user'}@eventora.app`;

          const formatted = formatQuizRecord(r);
          return {
            ...formatted,
            owner: {
              id: r.owner_id,
              displayName: profile?.display_name || 'Organizer',
              email: ownerEmail,
              usageType: profile?.usage_type || 'personal'
            }
          };
        });
      } catch (fbErr) {
        console.error('Supabase fallback all-quizzes failed:', fbErr);
      }
    }

    // 3. Fallback to all local quizzes with simulated owner
    const allLocal = getLocalQuizzes();
    return allLocal.map(q => ({
      ...q,
      owner: q.owner || {
        id: 'local_user',
        displayName: 'Local Organizer',
        email: 'organizer@eventora.app',
        usageType: 'personal'
      }
    }));
  },

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

    const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';
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
        let query = supabase
          .from('results')
          .select('*')
          .eq('operation_type', 'quiz')
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          query = query.eq('owner_id', user.id);
        }

        const { data: allQuizzes, error } = await query;

        if (!error && Array.isArray(allQuizzes)) {
          const matched = allQuizzes.find(r => {
            const rSlug = slugify(r.result_name);
            return rSlug === targetSlug || r.result_name?.toLowerCase() === cleanName || r.id === idOrSlug;
          }) || allQuizzes.find(r => r.result_name?.toLowerCase().includes(cleanName));

          if (matched) {
            return formatQuizRecord(matched);
          }
        }
      } catch (_) {}
    }

    // 2. Try Backend API (Admin cross-user lookup or server fallback)
    try {
      const res = await fetch(`${API_BASE_URL}/ps/quizzes/${encodeURIComponent(idOrSlug)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.quiz) {
          return formatQuizRecord(json.quiz);
        }
      }
    } catch (err) {
      console.warn('Backend get-quiz API fetch failed, trying local cache:', err);
    }

    // 3. Try Local Cache
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
      isCompleted: false,
      introMediaUrl: '',
      introMediaType: 'video'
    }));

    const initialSettings = {
      description: description.trim(),
      quizType: null,
      defaultMarks: Number(defaultMarks) || 1,
      defaultTimeValue: '',
      defaultTimeUnit: 'sec',
      currentRound: 1,
      isFinished: false,
      introMediaUrl: '',
      introMediaType: 'video',
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
    participants,
    turnHistory,
    introMediaUrl,
    introMediaType
  }) {
    if (!quizId) throw new Error('Quiz ID is required');

    let user = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (_) {}
    }

    // 1. Fetch current quiz from database / API to preserve all existing rounds, media, and questions
    let existing = null;
    if (supabase && user) {
      try {
        const { data: dbData } = await supabase
          .from('results')
          .select('*')
          .eq('id', quizId)
          .eq('operation_type', 'quiz')
          .maybeSingle();
        if (dbData) {
          existing = formatQuizRecord(dbData);
        }
      } catch (_) {}
    }

    if (!existing) {
      try {
        existing = await this.getQuizById(quizId);
      } catch (_) {}
    }

    if (!existing) {
      const local = getLocalQuizzes(user?.id);
      existing = local.find(q => q.id === quizId) || null;
    }

    const activeRoundNum = currentRound !== undefined ? Number(currentRound) : (existing?.currentRound || 1);
    const updatedIsFinished = isFinished !== undefined ? Boolean(isFinished) : Boolean(existing?.isFinished);

    // Resolve Quiz-Level Intro Media: never wipe to empty if not passed
    const finalIntroMediaUrl = introMediaUrl !== undefined ? introMediaUrl : (existing?.introMediaUrl || '');
    const finalIntroMediaType = introMediaType !== undefined ? introMediaType : (existing?.introMediaType || 'video');

    // Resolve clean rounds: if rounds not passed, KEEP EXISTING ROUNDS!
    let cleanRounds;
    if (rounds !== undefined) {
      cleanRounds = Array.isArray(rounds) ? [...rounds] : [];
    } else if (existing?.rounds && existing.rounds.length > 0) {
      cleanRounds = [...existing.rounds];
    } else {
      cleanRounds = [
        {
          roundNumber: 1,
          quizType: existing?.quizType || null,
          isTypeConfirmed: Boolean(existing?.quizType),
          questions: existing?.questions || [],
          isCompleted: false,
          introMediaUrl: '',
          introMediaType: 'video'
        }
      ];
    }

    // Merge round details for activeRoundNum if quizType or questions are provided
    const roundIdx = cleanRounds.findIndex(r => r.roundNumber === activeRoundNum);
    if (roundIdx >= 0) {
      const targetR = cleanRounds[roundIdx];
      const existingMatchingRound = (existing?.rounds || []).find(er => er.roundNumber === activeRoundNum);

      cleanRounds[roundIdx] = {
        ...targetR,
        quizType: quizType !== undefined ? quizType : targetR.quizType,
        isTypeConfirmed: quizType !== undefined ? Boolean(quizType) : targetR.isTypeConfirmed,
        questions: questions !== undefined
          ? (Array.isArray(questions) ? questions : [])
          : (targetR.questions?.length > 0 ? targetR.questions : (existingMatchingRound?.questions || [])),
        introMediaUrl: targetR.introMediaUrl !== undefined
          ? targetR.introMediaUrl
          : (existingMatchingRound?.introMediaUrl || ''),
        introMediaType: targetR.introMediaType || existingMatchingRound?.introMediaType || 'video'
      };
    } else if (quizType !== undefined || questions !== undefined) {
      cleanRounds.push({
        roundNumber: activeRoundNum,
        name: `Round ${activeRoundNum}`,
        title: `Round ${activeRoundNum}`,
        quizType: quizType || null,
        isTypeConfirmed: Boolean(quizType),
        questions: questions !== undefined ? (Array.isArray(questions) ? questions : []) : [],
        isCompleted: false,
        introMediaUrl: '',
        introMediaType: 'video'
      });
    }

    // Ensure every round preserves its intro media if existing
    cleanRounds = cleanRounds.map(r => {
      const existingMatching = (existing?.rounds || []).find(er => er.roundNumber === r.roundNumber);
      return {
        ...r,
        introMediaUrl: r.introMediaUrl !== undefined ? r.introMediaUrl : (existingMatching?.introMediaUrl || ''),
        introMediaType: r.introMediaType || existingMatching?.introMediaType || 'video',
        questions: r.questions || existingMatching?.questions || []
      };
    });

    const currentRoundEntry = cleanRounds.find(r => r.roundNumber === activeRoundNum) || cleanRounds[0];
    const cleanQuestions = questions !== undefined
      ? (Array.isArray(questions) ? questions : [])
      : (currentRoundEntry?.questions || existing?.questions || []);
    const cleanParticipants = participants !== undefined
      ? (Array.isArray(participants) ? participants : [])
      : (existing?.participants || []);
    const cleanTurnHistory = turnHistory !== undefined
      ? (Array.isArray(turnHistory) ? turnHistory : [])
      : (existing?.turnHistory || []);
    const totalMarks = cleanQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

    const updatedSettings = {
      description: description !== undefined ? description : (existing?.description || ''),
      quizType: quizType !== undefined ? quizType : (currentRoundEntry?.quizType || existing?.quizType || null),
      defaultMarks: Number(defaultMarks) || (existing?.defaultMarks || 1),
      defaultTimeValue: defaultTimeValue !== undefined ? defaultTimeValue : (existing?.defaultTimeValue ?? ''),
      defaultTimeUnit: defaultTimeUnit || (existing?.defaultTimeUnit || 'sec'),
      currentRound: activeRoundNum,
      isFinished: updatedIsFinished,
      introMediaUrl: finalIntroMediaUrl,
      introMediaType: finalIntroMediaType,
      rounds: cleanRounds,
      participants: cleanParticipants,
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
            rounds: cleanRounds,
            turnHistory: cleanTurnHistory
          }
        };
        if (name) updatePayload.result_name = name.trim();

        const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';
        const query = supabase
          .from('results')
          .update(updatePayload)
          .eq('id', quizId);

        if (!isAdmin) {
          query.eq('owner_id', user.id);
        }

        await query;

        // Backend API fallback for admin cross-user updates (bypasses RLS)
        if (isAdmin) {
          try {
            await fetch(`${API_BASE_URL}/ps/quizzes/${quizId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user?.email || '',
                name: name ? name.trim() : undefined,
                settings: updatedSettings,
                result_snapshot: {
                  questions: cleanQuestions,
                  participants: cleanParticipants,
                  rounds: cleanRounds,
                  turnHistory: cleanTurnHistory
                }
              })
            });
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Supabase update quiz failed:', err);
      }
    }

    // 2. Update local storage
    const local = getLocalQuizzes(user?.id);
    let foundInLocal = false;
    const updatedLocal = local.map(q => {
      if (q.id === quizId) {
        foundInLocal = true;
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
          introMediaUrl: finalIntroMediaUrl,
          introMediaType: finalIntroMediaType,
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

    if (!foundInLocal) {
      updatedLocal.unshift({
        ...(existing || {}),
        id: quizId,
        name: name ? name.trim() : (existing?.name || 'Untitled Quiz'),
        description: description !== undefined ? description : (existing?.description || ''),
        quizType: quizType !== undefined ? quizType : (currentRoundEntry?.quizType || existing?.quizType || null),
        defaultMarks: Number(defaultMarks) || existing?.defaultMarks || 1,
        defaultTimeValue: defaultTimeValue !== undefined ? defaultTimeValue : (existing?.defaultTimeValue ?? ''),
        defaultTimeUnit: defaultTimeUnit || (existing?.defaultTimeUnit || 'sec'),
        currentRound: activeRoundNum,
        isFinished: updatedIsFinished,
        introMediaUrl: finalIntroMediaUrl,
        introMediaType: finalIntroMediaType,
        rounds: cleanRounds,
        questions: cleanQuestions,
        participants: cleanParticipants,
        questionsCount: cleanQuestions.length,
        participantsCount: cleanParticipants.length,
        totalMarks,
        updated_at: new Date().toISOString()
      });
    }

    saveLocalQuizzes(user?.id, updatedLocal);
    return true;
  },

  // Helper to update only participants for a quiz
  async saveQuizParticipants(quizId, participants) {
    return this.updateQuiz(quizId, { participants });
  },

  // Reset quiz progress (points, turns, fair-turn pool, questions answered, back to round 1)
  // Keeps all questions, options, settings, intro media, and participant names completely intact
  async resetQuizProgress(quizId, { clearParticipants = false } = {}) {
    if (!quizId) throw new Error('Quiz ID is required');

    let user = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (_) {}
    }

    const currentQuiz = await this.getQuizById(quizId);
    if (!currentQuiz) throw new Error('Quiz not found');

    const resetParticipants = clearParticipants
      ? []
      : (currentQuiz.participants || []).map(p => ({
          ...p,
          score: 0,
          turns: 0,
          correct: 0
        }));

    const resetRounds = (currentQuiz.rounds || []).map(r => ({
      ...r,
      isCompleted: false
    }));

    const round1 = resetRounds.find(r => r.roundNumber === 1) || resetRounds[0];
    const round1Questions = round1?.questions || currentQuiz.questions || [];

    // Clear local storage session caches for spins / used questions
    if (typeof localStorage !== 'undefined') {
      try {
        const prefix = `eventora_quiz_session_${quizId}`;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith(prefix) || k.startsWith('eventora_live_quiz_session'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (_) {}
    }

    return await this.updateQuiz(quizId, {
      currentRound: 1,
      isFinished: false,
      rounds: resetRounds,
      questions: round1Questions,
      participants: resetParticipants,
      turnHistory: []
    });
  },

  // Reset Live Arena quiz progress & completely purge all live participants and state from DB
  async resetLiveQuizProgress(quizId) {
    return this.resetQuizProgress(quizId, { clearParticipants: true });
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

    const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';

    // 1. Try Backend Admin API if Admin
    if (isAdmin) {
      try {
        await fetch(`${API_BASE_URL}/ps/admin/quizzes/${quizId}?email=${encodeURIComponent(user?.email || '')}`, {
          method: 'DELETE'
        });
      } catch (_) {}
    }

    // 2. Supabase
    if (supabase && user) {
      try {
        const query = supabase
          .from('results')
          .delete()
          .eq('id', quizId);

        if (!isAdmin) {
          query.eq('owner_id', user.id);
        }

        await query;
      } catch (_) {}
    }

    const local = getLocalQuizzes(user?.id);
    saveLocalQuizzes(user?.id, local.filter(q => q.id !== quizId));
    return true;
  }
};

