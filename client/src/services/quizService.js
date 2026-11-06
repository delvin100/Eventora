import { supabase } from '../lib/supabase';
import { slugify } from '../utils/slugUtils';

const LOCAL_STORAGE_KEY = 'eventora_quizzes_cache';

function formatQuizRecord(r) {
  const questions = r.result_snapshot?.questions || [];
  const participants = r.result_snapshot?.participants || r.settings?.participants || [];
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  return {
    id: r.id,
    name: r.result_name,
    description: r.settings?.description || '',
    quizType: r.settings?.quizType || 'one_question_one_chance',
    defaultMarks: Number(r.settings?.defaultMarks) || 1,
    questionsCount: questions.length,
    totalMarks,
    questions,
    participants,
    created_at: r.created_at,
    updated_at: r.settings?.updated_at || r.created_at
  };
}

function getLocalQuizzes(userId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId || 'guest'}`);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveLocalQuizzes(userId, quizzes) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${userId || 'guest'}`, JSON.stringify(quizzes));
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
    name: 'One Question - 2 Chances',
    description: 'Multiple choice questions with 2 attempts per question.',
    mode: 'mcq_2',
    isAvailable: false
  },
  {
    id: 'answer_to_question',
    name: 'Answer to Question',
    description: 'Direct question and answer without options.',
    mode: 'direct',
    isAvailable: false
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
      const match = local.find(q => q.id === idOrSlug);
      if (match) return match;
    }

    return local.find(q => {
      const qSlug = slugify(q.name);
      return qSlug === targetSlug || q.name.toLowerCase() === cleanName || q.id === idOrSlug;
    }) || local.find(q => q.name.toLowerCase().includes(cleanName)) || null;
  },

  // Create a new quiz
  async createQuiz({ name, description = '', quizType = 'one_question_one_chance', defaultMarks = 1 }) {
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Quiz name is required');

    let user = null;
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (_) {}
    }

    // Initial default question for Type 1 (One Question One Chance - Multiple Choice)
    const initialQuestions = [
      {
        id: 'q_' + Date.now(),
        text: '',
        marks: Number(defaultMarks) || 1,
        options: [
          { id: 'opt_1', text: '', isCorrect: true },
          { id: 'opt_2', text: '', isCorrect: false },
          { id: 'opt_3', text: '', isCorrect: false },
          { id: 'opt_4', text: '', isCorrect: false }
        ]
      }
    ];

    const initialSettings = {
      description: description.trim(),
      quizType,
      defaultMarks: Number(defaultMarks) || 1,
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
            result_snapshot: { questions: initialQuestions }
          }])
          .select()
          .single();

        if (!error && data) {
          const newQuiz = {
            id: data.id,
            name: data.result_name,
            description: description.trim(),
            quizType,
            defaultMarks: Number(defaultMarks) || 1,
            questionsCount: initialQuestions.length,
            totalMarks: Number(defaultMarks) || 1,
            questions: initialQuestions,
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
      quizType,
      defaultMarks: Number(defaultMarks) || 1,
      questionsCount: initialQuestions.length,
      totalMarks: Number(defaultMarks) || 1,
      questions: initialQuestions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const local = getLocalQuizzes(user?.id);
    saveLocalQuizzes(user?.id, [localQuiz, ...local]);
    return localQuiz;
  },

  // Save / update quiz questions and settings
  async updateQuiz(quizId, { name, description, quizType, defaultMarks, questions, participants }) {
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

    const cleanQuestions = questions !== undefined ? (Array.isArray(questions) ? questions : []) : (existing?.questions || []);
    const cleanParticipants = participants !== undefined ? (Array.isArray(participants) ? participants : []) : (existing?.participants || []);
    const totalMarks = cleanQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    const updatedSettings = {
      description: description !== undefined ? description : (existing?.description || ''),
      quizType: quizType || (existing?.quizType || 'one_question_one_chance'),
      defaultMarks: Number(defaultMarks) || (existing?.defaultMarks || 1),
      updated_at: new Date().toISOString()
    };

    // 1. Try Supabase
    if (supabase && user) {
      try {
        const updatePayload = {
          settings: updatedSettings,
          result_snapshot: {
            questions: cleanQuestions,
            participants: cleanParticipants
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
          quizType: quizType || q.quizType,
          defaultMarks: Number(defaultMarks) || q.defaultMarks,
          questions: cleanQuestions,
          participants: cleanParticipants,
          questionsCount: cleanQuestions.length,
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

