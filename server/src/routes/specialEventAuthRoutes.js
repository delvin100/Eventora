import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/v1/ps/login
 * Authenticate allocated users for Prathibha Sangamam
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Database connection is not available.'
      });
    }

    // 1. Locate Prathibha Sangamam special event
    let { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, name, description, accent_color')
      .ilike('name', '%Prathibha Sangamam%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!event) {
      // Fallback: search for any special event
      const { data: fallbackEvent } = await supabase
        .from('events')
        .select('id, name, description, accent_color')
        .eq('category', 'Special Event')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      event = fallbackEvent;
    }

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Prathibha Sangamam event could not be found.'
      });
    }

    // 2. Fetch allocated users for this event
    const { data: allocRecord, error: allocErr } = await supabase
      .from('results')
      .select('result_snapshot')
      .eq('event_id', event.id)
      .eq('operation_type', 'special_event_allocations')
      .maybeSingle();

    const allocatedUsers = Array.isArray(allocRecord?.result_snapshot)
      ? allocRecord.result_snapshot
      : [];

    // 3. Find matching username & password
    const cleanUser = username.trim().toLowerCase();
    const matched = allocatedUsers.find(
      u => u.username.toLowerCase() === cleanUser && u.password === password
    );

    if (!matched) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password for Prathibha Sangamam.'
      });
    }

    // Success
    return res.json({
      success: true,
      user: {
        id: matched.id,
        username: matched.username,
        access_level: matched.access_level || 'Operator',
        created_at: matched.created_at,
        event_id: event.id,
        event_name: event.name
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/event-info
 */
router.get('/event-info', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database not connected' });
    }

    const { data: event } = await supabase
      .from('events')
      .select('id, name, description')
      .ilike('name', '%Prathibha Sangamam%')
      .limit(1)
      .maybeSingle();

    res.json({
      success: true,
      event: event || { name: 'Prathibha Sangamam' }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// LIVE SYNCHRONIZED EVALUATION ENGINE (For Admin Wheel <-> Evaluator Screen)
// ============================================================================

let activeLiveState = {
  eventId: null,
  status: 'waiting', // 'waiting' | 'evaluating' | 'completed'
  currentRound: 1,
  roundTask: '',
  currentStudent: null, // { id, name }
  submissions: {}, // { [username]: { score: 85, submittedAt: '...' } }
  requiredEvaluators: [],
  updatedAt: new Date().toISOString()
};

let cachedEventOwnerId = null;

async function getOrInitEventId() {
  if (activeLiveState.eventId && cachedEventOwnerId) return activeLiveState.eventId;
  if (!supabase) return null;
  const { data: event } = await supabase
    .from('events')
    .select('id, owner_id')
    .ilike('name', '%Prathibha Sangamam%')
    .limit(1)
    .maybeSingle();
  if (event) {
    activeLiveState.eventId = event.id;
    cachedEventOwnerId = event.owner_id;
  }
  return activeLiveState.eventId;
}

async function getRequiredEvaluators(eventId) {
  if (!supabase || !eventId) return [];
  const { data: allocRecord } = await supabase
    .from('results')
    .select('result_snapshot')
    .eq('event_id', eventId)
    .eq('operation_type', 'special_event_allocations')
    .maybeSingle();

  const users = Array.isArray(allocRecord?.result_snapshot) ? allocRecord.result_snapshot : [];
  return users.map(u => u.username);
}

async function persistLiveState(eventId) {
  if (!supabase || !eventId) return;
  try {
    const { data: existing } = await supabase
      .from('results')
      .select('id')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_live_state')
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('results')
        .update({
          result_snapshot: activeLiveState,
          result_name: `Live Evaluation State (${activeLiveState.status})`
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('results')
        .insert([{
          event_id: eventId,
          owner_id: cachedEventOwnerId,
          operation_type: 'special_event_live_state',
          result_name: `Live Evaluation State (${activeLiveState.status})`,
          result_snapshot: activeLiveState
        }]);
    }
  } catch (err) {
    console.error('Error persisting live state:', err);
  }
}

let isLiveStateRestored = false;

async function ensureLiveStateRestored(eventId) {
  if (isLiveStateRestored || !supabase || !eventId) return;
  try {
    const { data: record } = await supabase
      .from('results')
      .select('result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_live_state')
      .maybeSingle();

    if (record?.result_snapshot && typeof record.result_snapshot === 'object') {
      activeLiveState = {
        ...activeLiveState,
        ...record.result_snapshot,
        eventId
      };
    }
    isLiveStateRestored = true;
  } catch (err) {
    console.error('Failed to restore live state from DB:', err);
  }
}

async function getRoundTaskFromSettings(eventId, roundNumber) {
  if (!supabase || !eventId) return '';
  try {
    const { data: record } = await supabase
      .from('results')
      .select('result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_settings')
      .maybeSingle();

    const rounds = record?.result_snapshot?.rounds;
    if (Array.isArray(rounds)) {
      const match = rounds.find(r => Number(r.roundNumber) === Number(roundNumber));
      if (match?.task) return match.task;
    }
  } catch (err) {
    console.error('Error fetching round task from settings:', err);
  }
  return '';
}

async function getEvaluatedCountInRound(eventId, roundNumber) {
  if (!supabase || !eventId) return 0;
  try {
    const { data: scoreRecord } = await supabase
      .from('results')
      .select('result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_scores')
      .maybeSingle();

    const scores = Array.isArray(scoreRecord?.result_snapshot) ? scoreRecord.result_snapshot : [];
    const inRound = scores.filter(s => Number(s.roundNumber) === Number(roundNumber));
    const uniqueStudents = new Set(inRound.map(s => s.studentId || s.studentName));
    return uniqueStudents.size;
  } catch (err) {
    console.error('Error counting evaluated students:', err);
    return 0;
  }
}

/**
 * GET /api/v1/ps/live-state
 * Polled by evaluators on /ps and admin wheel to stay in real-time sync
 */
router.get('/live-state', async (req, res, next) => {
  try {
    const eventId = await getOrInitEventId();
    if (eventId) {
      await ensureLiveStateRestored(eventId);
      activeLiveState.requiredEvaluators = await getRequiredEvaluators(eventId);

      // Auto-populate task name from special event settings if not set
      if (!activeLiveState.roundTask) {
        activeLiveState.roundTask = await getRoundTaskFromSettings(eventId, activeLiveState.currentRound || 1);
      }

      // Compute evaluated participant count for current round
      activeLiveState.evaluatedCount = await getEvaluatedCountInRound(eventId, activeLiveState.currentRound || 1);
    }
    return res.json({
      success: true,
      liveState: activeLiveState
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/start-evaluation
 * Triggered by Admin Wheel to push selected student to all evaluators
 */
router.post('/start-evaluation', async (req, res, next) => {
  try {
    const { student, roundNumber, roundTask } = req.body;
    const eventId = await getOrInitEventId();

    const evaluators = await getRequiredEvaluators(eventId);

    activeLiveState = {
      eventId,
      status: 'evaluating',
      currentRound: roundNumber || activeLiveState.currentRound || 1,
      roundTask: roundTask || activeLiveState.roundTask || '',
      currentStudent: student,
      submissions: {},
      requiredEvaluators: evaluators,
      updatedAt: new Date().toISOString()
    };

    await persistLiveState(eventId);

    return res.json({
      success: true,
      liveState: activeLiveState
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/submit-score
 * Submitted by an individual evaluator on /ps
 */
router.post('/submit-score', async (req, res, next) => {
  try {
    const { username, score, grace, grade, studentId, studentName, roundNumber } = req.body;
    if (!username || score === undefined || score === null) {
      return res.status(400).json({ success: false, message: 'Username and score are required.' });
    }

    const eventId = await getOrInitEventId();
    const cleanScore = Number(score) || 0;
    const cleanGrace = (grace !== undefined && grace !== null && grace !== '')
      ? Number(grace)
      : (grade && !isNaN(Number(grade)) ? Number(grade) : 0);
    const totalScore = cleanScore + cleanGrace;

    // 1. Record evaluator submission in active state
    if (!activeLiveState.submissions) {
      activeLiveState.submissions = {};
    }
    activeLiveState.submissions[username] = {
      score: cleanScore,
      grace: cleanGrace,
      totalScore: totalScore,
      submittedAt: new Date().toISOString()
    };
    activeLiveState.updatedAt = new Date().toISOString();

    // 2. Persist to permanent scores log in Supabase
    if (supabase && eventId) {
      try {
        const { data: scoreRecord } = await supabase
          .from('results')
          .select('id, result_snapshot')
          .eq('event_id', eventId)
          .eq('operation_type', 'special_event_scores')
          .maybeSingle();

        const currentScores = Array.isArray(scoreRecord?.result_snapshot) ? scoreRecord.result_snapshot : [];
        const targetStudentId = studentId || activeLiveState.currentStudent?.id;
        const targetStudentName = studentName || activeLiveState.currentStudent?.name;
        const targetRound = Number(roundNumber || activeLiveState.currentRound || 1);

        const newEntry = {
          id: 'score-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          studentId: targetStudentId,
          studentName: targetStudentName,
          roundNumber: targetRound,
          evaluator: username,
          score: cleanScore,
          grace: cleanGrace,
          totalScore: totalScore,
          createdAt: new Date().toISOString()
        };

        // If this evaluator already submitted a score for this student in this round, update it; otherwise append
        const existingIdx = currentScores.findIndex(
          s => s.evaluator === username &&
               ((targetStudentId && s.studentId === targetStudentId) || (targetStudentName && s.studentName === targetStudentName)) &&
               Number(s.roundNumber) === targetRound
        );

        let updatedScores;
        if (existingIdx >= 0) {
          updatedScores = [...currentScores];
          updatedScores[existingIdx] = {
            ...updatedScores[existingIdx],
            score: cleanScore,
            grace: cleanGrace,
            totalScore: totalScore,
            updatedAt: new Date().toISOString()
          };
        } else {
          updatedScores = [...currentScores, newEntry];
        }

        if (scoreRecord?.id) {
          await supabase.from('results').update({ result_snapshot: updatedScores }).eq('id', scoreRecord.id);
        } else {
          await supabase.from('results').insert([{
            event_id: eventId,
            owner_id: cachedEventOwnerId,
            operation_type: 'special_event_scores',
            result_name: 'Evaluator Score Entries',
            result_snapshot: updatedScores
          }]);
        }
      } catch (dbErr) {
        console.error('Error logging score permanently:', dbErr);
      }
    }

    await persistLiveState(eventId);

    return res.json({
      success: true,
      liveState: activeLiveState
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/finish-student
 * Called after all evaluators submitted scores and admin advances to next spin
 */
router.post('/finish-student', async (req, res, next) => {
  try {
    const eventId = await getOrInitEventId();

    activeLiveState.status = 'waiting';
    activeLiveState.currentStudent = null;
    activeLiveState.submissions = {};
    activeLiveState.updatedAt = new Date().toISOString();

    await persistLiveState(eventId);

    return res.json({
      success: true,
      liveState: activeLiveState
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/set-round
 * Called by admin to change or advance round
 */
router.post('/set-round', async (req, res, next) => {
  try {
    const { roundNumber, roundTask } = req.body;
    const eventId = await getOrInitEventId();

    activeLiveState.currentRound = Number(roundNumber) || 1;
    if (roundTask !== undefined) {
      activeLiveState.roundTask = roundTask;
    }
    activeLiveState.status = 'waiting';
    activeLiveState.currentStudent = null;
    activeLiveState.submissions = {};
    activeLiveState.updatedAt = new Date().toISOString();

    await persistLiveState(eventId);

    return res.json({
      success: true,
      liveState: activeLiveState
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/end-event
 * Concludes the special event and marks live state as completed
 */
router.post('/end-event', async (req, res, next) => {
  try {
    const eventId = await getOrInitEventId();
    activeLiveState.status = 'completed';
    activeLiveState.currentStudent = null;
    activeLiveState.submissions = {};
    activeLiveState.endedAt = new Date().toISOString();
    activeLiveState.updatedAt = new Date().toISOString();

    await persistLiveState(eventId);

    return res.json({
      success: true,
      liveState: activeLiveState,
      message: 'Special event concluded successfully.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/scores
 * Fetch all recorded scores
 */
router.get('/scores', async (req, res, next) => {
  try {
    const eventId = await getOrInitEventId();
    if (!supabase || !eventId) {
      return res.json({ success: true, scores: [] });
    }

    const { data: scoreRecord } = await supabase
      .from('results')
      .select('result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_scores')
      .maybeSingle();

    const scores = Array.isArray(scoreRecord?.result_snapshot) ? scoreRecord.result_snapshot : [];
    return res.json({ success: true, scores });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/reset-event
 * Clears participants and results for the special event, and resets active live state
 */
router.post('/reset-event', async (req, res, next) => {
  try {
    const { eventId: targetEventId } = req.body;
    const eventId = targetEventId || await getOrInitEventId();

    if (supabase && eventId) {
      await supabase.from('participants').delete().eq('event_id', eventId);
      await supabase.from('results').delete().eq('event_id', eventId);
    }

    activeLiveState.status = 'waiting';
    activeLiveState.currentRound = 1;
    activeLiveState.roundTask = '';
    activeLiveState.currentStudent = null;
    activeLiveState.submissions = {};
    activeLiveState.evaluatedCount = 0;
    activeLiveState.updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Special event data reset successfully.',
      liveState: activeLiveState
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/registered-users
 * Fetch all registered users in the system except admin
 */
router.get('/registered-users', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.json({ success: true, users: [] });
    }

    // Try fetching from auth.admin.listUsers()
    let authUsers = [];
    try {
      const { data } = await supabase.auth.admin.listUsers();
      if (data?.users) {
        authUsers = data.users;
      }
    } catch (e) {
      console.warn('Could not list auth users via admin API:', e.message);
    }

    // Fetch profiles table
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*');

    const profileMap = new Map();
    (profiles || []).forEach(p => {
      profileMap.set(p.id, p);
    });

    const resultUsers = [];
    if (authUsers.length > 0) {
      authUsers.forEach(u => {
        const email = u.email || '';
        if (email.toLowerCase() === 'admin@gmail.com') return;
        const prof = profileMap.get(u.id);
        resultUsers.push({
          id: u.id,
          email: email,
          displayName: prof?.display_name || u.user_metadata?.display_name || email.split('@')[0] || 'User',
          usageType: prof?.usage_type || u.user_metadata?.usage_type || 'personal'
        });
      });
    } else {
      (profiles || []).forEach(p => {
        if (p.id === 'f92acb4e-09b2-4f1c-ae6f-fc4d6e7601e1') return;
        resultUsers.push({
          id: p.id,
          email: p.display_name?.toLowerCase().includes('@') ? p.display_name : `${p.display_name?.toLowerCase().replace(/\s+/g, '')}@user.app`,
          displayName: p.display_name || 'User',
          usageType: p.usage_type || 'personal'
        });
      });
    }

    return res.json({
      success: true,
      users: resultUsers
    });
  } catch (err) {
    next(err);
  }
});

export default router;

