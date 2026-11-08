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
        access_level: matched.access_level || 'Evaluator',
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

async function saveRoundTaskToSettings(eventId, roundNumber, task) {
  if (!supabase || !eventId || !task) return;
  try {
    const { data: existing } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_settings')
      .maybeSingle();

    let settings = existing?.result_snapshot || {};
    let rounds = Array.isArray(settings.rounds) ? [...settings.rounds] : [];
    const rIdx = rounds.findIndex(r => Number(r.roundNumber) === Number(roundNumber));
    if (rIdx >= 0) {
      rounds[rIdx] = { ...rounds[rIdx], task };
    } else {
      rounds.push({ roundNumber: Number(roundNumber), task });
    }
    settings.rounds = rounds;

    if (existing?.id) {
      await supabase
        .from('results')
        .update({ result_snapshot: settings })
        .eq('id', existing.id);
    }
  } catch (err) {
    console.warn('Failed to auto-save round task to settings:', err);
  }
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
      const dbCount = await getEvaluatedCountInRound(eventId, activeLiveState.currentRound || 1);
      const memCount = Array.isArray(activeLiveState.completedStudentsInRound) ? activeLiveState.completedStudentsInRound.length : 0;
      activeLiveState.evaluatedCount = Math.max(dbCount, memCount, activeLiveState.evaluatedCount || 0);
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

    const targetRound = roundNumber || activeLiveState.currentRound || 1;
    let taskToUse = (roundTask !== undefined && roundTask !== null && roundTask !== '')
      ? roundTask
      : (activeLiveState.roundTask || '');

    if (!taskToUse && eventId) {
      taskToUse = await getRoundTaskFromSettings(eventId, targetRound) || '';
    }

    activeLiveState = {
      eventId,
      status: 'evaluating',
      currentRound: targetRound,
      roundTask: taskToUse,
      currentStudent: student,
      submissions: {},
      requiredEvaluators: evaluators,
      updatedAt: new Date().toISOString()
    };

    if (taskToUse && eventId) {
      await saveRoundTaskToSettings(eventId, targetRound, taskToUse);
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
          task: activeLiveState.roundTask || '',
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
    const { studentId, roundNumber, evaluatedCount: explicitCount } = req.body || {};
    const eventId = await getOrInitEventId();

    const targetStudentId = studentId || activeLiveState.currentStudent?.id;
    if (targetStudentId) {
      if (!Array.isArray(activeLiveState.completedStudentsInRound)) {
        activeLiveState.completedStudentsInRound = [];
      }
      if (!activeLiveState.completedStudentsInRound.includes(targetStudentId)) {
        activeLiveState.completedStudentsInRound.push(targetStudentId);
      }
    }

    activeLiveState.status = 'waiting';
    activeLiveState.currentStudent = null;
    activeLiveState.submissions = {};
    activeLiveState.updatedAt = new Date().toISOString();

    const dbCount = eventId ? await getEvaluatedCountInRound(eventId, activeLiveState.currentRound || 1) : 0;
    const memCount = Array.isArray(activeLiveState.completedStudentsInRound) ? activeLiveState.completedStudentsInRound.length : 0;
    const expCount = typeof explicitCount === 'number' ? explicitCount : 0;

    activeLiveState.evaluatedCount = Math.max(dbCount, memCount, expCount);

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
 * POST /api/v1/ps/update-task
 * Called when organizer sets or updates the round task in WinnerDialog
 */
router.post('/update-task', async (req, res, next) => {
  try {
    const { roundTask, roundNumber } = req.body;
    const eventId = await getOrInitEventId();
    const targetRound = Number(roundNumber) || activeLiveState.currentRound || 1;

    if (roundTask !== undefined && roundTask !== null && roundTask !== '') {
      activeLiveState.roundTask = roundTask;
      if (eventId) {
        await saveRoundTaskToSettings(eventId, targetRound, roundTask);
      }
    }

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

    const targetRound = Number(roundNumber) || 1;
    activeLiveState.currentRound = targetRound;
    activeLiveState.completedStudentsInRound = [];
    activeLiveState.evaluatedCount = 0;

    if (roundTask !== undefined && roundTask !== '') {
      activeLiveState.roundTask = roundTask;
      if (eventId) {
        await saveRoundTaskToSettings(eventId, targetRound, roundTask);
      }
    } else if (eventId) {
      activeLiveState.roundTask = await getRoundTaskFromSettings(eventId, targetRound) || '';
    } else {
      activeLiveState.roundTask = '';
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
      // Delete all results EXCEPT special_event_user_access (preserve Authorized Users added by admin!)
      await supabase
        .from('results')
        .delete()
        .eq('event_id', eventId)
        .neq('operation_type', 'special_event_user_access');
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

    // Fetch event counts per owner
    const { data: allEvents } = await supabase
      .from('events')
      .select('id, owner_id');

    const eventCountMap = new Map();
    (allEvents || []).forEach(e => {
      eventCountMap.set(e.owner_id, (eventCountMap.get(e.owner_id) || 0) + 1);
    });

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
          usageType: prof?.usage_type || u.user_metadata?.usage_type || 'personal',
          createdAt: prof?.created_at || u.created_at || null,
          lastSignInAt: u.last_sign_in_at || null,
          eventsCount: eventCountMap.get(u.id) || 0
        });
      });
    } else {
      (profiles || []).forEach(p => {
        if (p.id === 'f92acb4e-09b2-4f1c-ae6f-fc4d6e7601e1') return;
        resultUsers.push({
          id: p.id,
          email: p.display_name?.toLowerCase().includes('@') ? p.display_name : `${p.display_name?.toLowerCase().replace(/\s+/g, '')}@user.app`,
          displayName: p.display_name || 'User',
          usageType: p.usage_type || 'personal',
          createdAt: p.created_at || null,
          eventsCount: eventCountMap.get(p.id) || 0
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

/**
 * DELETE /api/v1/ps/users/:userId
 * Delete a user account and ALL data related to that account
 * (events, participants, results, saved lists, saved list entries, profiles, auth user)
 */
router.delete('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    // Protection: never delete the master admin
    if (userId === 'f92acb4e-09b2-4f1c-ae6f-fc4d6e7601e1') {
      return res.status(403).json({ success: false, message: 'Cannot delete the master admin account.' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable.' });
    }

    // Double check email if available to prevent deleting admin@gmail.com
    try {
      const { data: userRecord } = await supabase.auth.admin.getUserById(userId);
      if (userRecord?.user?.email?.toLowerCase() === 'admin@gmail.com') {
        return res.status(403).json({ success: false, message: 'Cannot delete admin account.' });
      }
    } catch (_) {}

    // 1. Fetch user's events to cascade delete participants & results
    const { data: userEvents } = await supabase
      .from('events')
      .select('id')
      .eq('owner_id', userId);

    const eventIds = (userEvents || []).map(e => e.id);

    if (eventIds.length > 0) {
      await supabase.from('participants').delete().in('event_id', eventIds);
      await supabase.from('results').delete().in('event_id', eventIds);
      await supabase.from('events').delete().in('id', eventIds);
    }

    // Also delete any direct results created by this user
    await supabase.from('results').delete().eq('owner_id', userId);

    // 2. Fetch user's saved lists to delete list entries & lists
    const { data: userLists } = await supabase
      .from('saved_lists')
      .select('id')
      .eq('owner_id', userId);

    const listIds = (userLists || []).map(l => l.id);
    if (listIds.length > 0) {
      await supabase.from('saved_list_entries').delete().in('list_id', listIds);
      await supabase.from('saved_lists').delete().in('id', listIds);
    }

    // 3. Clean up user from any special_event_user_access records
    const { data: accessRecords } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('operation_type', 'special_event_user_access');

    for (const rec of (accessRecords || [])) {
      if (Array.isArray(rec.result_snapshot)) {
        const filtered = rec.result_snapshot.filter(u => u.id !== userId && u.userId !== userId);
        if (filtered.length !== rec.result_snapshot.length) {
          await supabase.from('results').update({ result_snapshot: filtered }).eq('id', rec.id);
        }
      }
    }

    // 4. Delete profile
    await supabase.from('profiles').delete().eq('id', userId);

    // 5. Delete auth user
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.warn('Supabase auth.admin.deleteUser notice:', authErr.message);
    }

    return res.json({
      success: true,
      message: 'User account and all related data deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/special-events
 * Fetch special events for the current user
 * Admin sees all; granted users see events they have access to.
 */
router.get('/special-events', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.json({ success: true, events: [] });
    }

    const { userId, email } = req.query;
    const userEmail = (email || '').toLowerCase().trim();
    const isAdmin = userEmail === 'admin@gmail.com';

    // 1. Fetch access records and alloc records
    const [{ data: allocData }, { data: accessData }] = await Promise.all([
      supabase.from('results').select('event_id, result_snapshot').eq('operation_type', 'special_event_allocations'),
      supabase.from('results').select('event_id, result_snapshot').eq('operation_type', 'special_event_user_access')
    ]);

    const allocCountMap = {};
    (allocData || []).forEach(r => {
      allocCountMap[r.event_id] = Array.isArray(r.result_snapshot) ? r.result_snapshot.length : 0;
    });

    const accessCountMap = {};
    const accessRecordsMap = {};
    (accessData || []).forEach(r => {
      const list = Array.isArray(r.result_snapshot) ? r.result_snapshot : [];
      accessCountMap[r.event_id] = list.length;
      accessRecordsMap[r.event_id] = list;
    });

    if (isAdmin) {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*, participants(id)')
        .eq('category', 'Special Event')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const events = (eventsData || []).map(ev => ({
        ...ev,
        participantCount: ev.participants ? ev.participants.length : 0,
        allocatedUserCount: allocCountMap[ev.id] || 0,
        grantedUserCount: accessCountMap[ev.id] || 0
      }));

      return res.json({ success: true, events });
    }

    // Normal user: find allowed event IDs
    const allowedEventIds = [];
    Object.entries(accessRecordsMap).forEach(([eventId, userList]) => {
      const isGranted = userList.some(u =>
        (userId && (u.id === userId || u.userId === userId)) ||
        (userEmail && u.email && u.email.toLowerCase() === userEmail)
      );
      if (isGranted) allowedEventIds.push(eventId);
    });

    if (allowedEventIds.length === 0) {
      return res.json({ success: true, events: [] });
    }

    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*, participants(id)')
      .in('id', allowedEventIds)
      .eq('category', 'Special Event')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const events = (eventsData || []).map(ev => ({
      ...ev,
      participantCount: ev.participants ? ev.participants.length : 0,
      allocatedUserCount: allocCountMap[ev.id] || 0,
      grantedUserCount: 0
    }));

    return res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/special-events/:eventId/access
 * Get authorized users for a special event
 */
router.get('/special-events/:eventId/access', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!supabase || !eventId) return res.json({ success: true, accessList: [] });

    const { data } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_user_access')
      .maybeSingle();

    return res.json({
      success: true,
      accessList: Array.isArray(data?.result_snapshot) ? data.result_snapshot : []
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/special-events/:eventId/access
 * Grant user access to a special event
 */
router.post('/special-events/:eventId/access', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { targetUser } = req.body;

    if (!supabase || !eventId || !targetUser) {
      return res.status(400).json({ success: false, message: 'Invalid arguments' });
    }

    const { data: event } = await supabase
      .from('events')
      .select('id, owner_id')
      .eq('id', eventId)
      .single();

    const { data: existing } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_user_access')
      .maybeSingle();

    const current = Array.isArray(existing?.result_snapshot) ? existing.result_snapshot : [];
    if (current.some(u => u.id === targetUser.id || (u.email && targetUser.email && u.email.toLowerCase() === targetUser.email.toLowerCase()))) {
      return res.json({ success: true, accessList: current });
    }

    const updated = [
      ...current,
      {
        id: targetUser.id,
        userId: targetUser.id,
        email: targetUser.email || '',
        displayName: targetUser.displayName || targetUser.display_name || targetUser.name || 'User',
        grantedAt: new Date().toISOString()
      }
    ];

    if (existing?.id) {
      await supabase
        .from('results')
        .update({ result_snapshot: updated })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('results')
        .insert([{
          event_id: eventId,
          owner_id: event?.owner_id || 'f92acb4e-09b2-4f1c-ae6f-fc4d6e7601e1',
          operation_type: 'special_event_user_access',
          result_name: 'Special Event Authorized Users',
          result_snapshot: updated
        }]);
    }

    return res.json({ success: true, accessList: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/ps/special-events/:eventId/access/:targetUserId
 * Revoke user access to a special event
 */
router.delete('/special-events/:eventId/access/:targetUserId', async (req, res, next) => {
  try {
    const { eventId, targetUserId } = req.params;
    if (!supabase || !eventId || !targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid arguments' });
    }

    const { data: existing } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_user_access')
      .maybeSingle();

    if (!existing?.id) {
      return res.json({ success: true, accessList: [] });
    }

    const current = Array.isArray(existing.result_snapshot) ? existing.result_snapshot : [];
    const updated = current.filter(u => u.id !== targetUserId && u.userId !== targetUserId);

    await supabase
      .from('results')
      .update({ result_snapshot: updated })
      .eq('id', existing.id);

    return res.json({ success: true, accessList: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/special-events/:idOrSlug
 * Get a special event by ID or slug
 */
router.get('/special-events/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    if (!supabase || !idOrSlug) return res.status(404).json({ success: false, message: 'Not found' });

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let eventData = null;
    if (isUUID) {
      const { data } = await supabase
        .from('events')
        .select('*, participants(id)')
        .eq('id', idOrSlug)
        .maybeSingle();
      eventData = data;
    } else {
      const cleanName = decodeURIComponent(idOrSlug).replace(/[-_]+/g, ' ').trim();
      const { data } = await supabase
        .from('events')
        .select('*, participants(id)')
        .ilike('name', `%${cleanName}%`)
        .maybeSingle();
      eventData = data;
    }

    if (!eventData) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.json({
      success: true,
      event: {
        ...eventData,
        participantCount: eventData.participants ? eventData.participants.length : 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/admin/all-events
 * Fetch all events from all users with creator info (Admin Only)
 */
router.get('/admin/all-events', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.json({ success: true, events: [] });
    }

    const { email } = req.query;
    let requesterEmail = (email || '').toLowerCase().trim();

    if (!requesterEmail && req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.email) requesterEmail = user.email.toLowerCase().trim();
      } catch (_) {}
    }

    const isAdmin = requesterEmail === 'admin@gmail.com';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    // 1. Fetch all events with participant ids
    const { data: events, error: eventsErr } = await supabase
      .from('events')
      .select('*, participants(id)')
      .order('created_at', { ascending: false });

    if (eventsErr) throw eventsErr;

    // 2. Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*');

    const profileMap = new Map();
    (profiles || []).forEach(p => profileMap.set(p.id, p));

    // 3. Fetch auth users if available
    const authUserMap = new Map();
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users) {
        authData.users.forEach(u => authUserMap.set(u.id, u));
      }
    } catch (_) {}

    // 4. Combine each event with owner info
    const formattedEvents = (events || []).map(ev => {
      const authUser = authUserMap.get(ev.owner_id);
      const profile = profileMap.get(ev.owner_id);
      const ownerEmail = authUser?.email || (profile?.display_name?.includes('@') ? profile.display_name : null) || 'user@eventora.app';
      const displayName = profile?.display_name || authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'User';

      return {
        ...ev,
        participantCount: ev.participants ? ev.participants.length : 0,
        owner: {
          id: ev.owner_id,
          displayName,
          email: ownerEmail,
          usageType: profile?.usage_type || authUser?.user_metadata?.usage_type || 'personal'
        }
      };
    });

    return res.json({ success: true, events: formattedEvents });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/admin/all-quizzes
 * Fetch all quizzes from all users with creator info (Admin Only)
 */
router.get('/admin/all-quizzes', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.json({ success: true, quizzes: [] });
    }

    const { email } = req.query;
    let requesterEmail = (email || '').toLowerCase().trim();

    if (!requesterEmail && req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.email) requesterEmail = user.email.toLowerCase().trim();
      } catch (_) {}
    }

    const isAdmin = requesterEmail === 'admin@gmail.com';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    // 1. Fetch all quizzes from results table
    const { data: results, error: resultsErr } = await supabase
      .from('results')
      .select('*')
      .eq('operation_type', 'quiz')
      .order('created_at', { ascending: false });

    if (resultsErr) throw resultsErr;

    // 2. Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*');

    const profileMap = new Map();
    (profiles || []).forEach(p => profileMap.set(p.id, p));

    // 3. Fetch auth users if available
    const authUserMap = new Map();
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users) {
        authData.users.forEach(u => authUserMap.set(u.id, u));
      }
    } catch (_) {}

    // 4. Combine each quiz with owner info
    const formattedQuizzes = (results || []).map(r => {
      const authUser = authUserMap.get(r.owner_id);
      const profile = profileMap.get(r.owner_id);
      const ownerEmail = authUser?.email || (profile?.display_name?.includes('@') ? profile.display_name : null) || 'user@eventora.app';
      const displayName = profile?.display_name || authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'User';

      return {
        ...r,
        owner: {
          id: r.owner_id,
          displayName,
          email: ownerEmail,
          usageType: profile?.usage_type || authUser?.user_metadata?.usage_type || 'personal'
        }
      };
    });

    return res.json({ success: true, quizzes: formattedQuizzes });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/ps/admin/quizzes/:quizId
 * Delete any quiz by ID (Admin Only)
 */
router.delete('/admin/quizzes/:quizId', async (req, res, next) => {
  try {
    const { quizId } = req.params;
    if (!supabase || !quizId) {
      return res.status(400).json({ success: false, message: 'Quiz ID is required' });
    }

    const { email } = req.query;
    let requesterEmail = (email || '').toLowerCase().trim();

    if (!requesterEmail && req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.email) requesterEmail = user.email.toLowerCase().trim();
      } catch (_) {}
    }

    const isAdmin = requesterEmail === 'admin@gmail.com';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    const { error } = await supabase
      .from('results')
      .delete()
      .eq('id', quizId)
      .eq('operation_type', 'quiz');

    if (error) throw error;
    return res.json({ success: true, message: 'Quiz deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/quizzes/:idOrSlug
 * Get any quiz by ID or slug with owner details (Admin & cross-user lookup)
 */
router.get('/quizzes/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    if (!supabase || !idOrSlug) return res.status(404).json({ success: false, message: 'Not found' });

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let quizData = null;
    if (isUUID) {
      const { data } = await supabase
        .from('results')
        .select('*')
        .eq('id', idOrSlug)
        .eq('operation_type', 'quiz')
        .maybeSingle();
      quizData = data;
    } else {
      const cleanName = decodeURIComponent(idOrSlug).replace(/[-_]+/g, ' ').trim();
      const { data } = await supabase
        .from('results')
        .select('*')
        .eq('operation_type', 'quiz')
        .ilike('result_name', `%${cleanName}%`)
        .maybeSingle();
      quizData = data;
    }

    if (!quizData) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Fetch owner profile
    let ownerProfile = null;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', quizData.owner_id)
        .maybeSingle();
      ownerProfile = prof;
    } catch (_) {}

    let authUser = null;
    try {
      const { data: u } = await supabase.auth.admin.getUserById(quizData.owner_id);
      authUser = u?.user;
    } catch (_) {}

    return res.json({
      success: true,
      quiz: {
        ...quizData,
        owner: {
          id: quizData.owner_id,
          displayName: ownerProfile?.display_name || authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'User',
          email: authUser?.email || (ownerProfile?.display_name?.includes('@') ? ownerProfile.display_name : null) || 'user@eventora.app',
          usageType: ownerProfile?.usage_type || authUser?.user_metadata?.usage_type || 'personal'
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/ps/quizzes/:quizId
 * Update any quiz by ID (Admin & owner cross-user updates)
 */
router.put('/quizzes/:quizId', async (req, res, next) => {
  try {
    const { quizId } = req.params;
    if (!supabase || !quizId) return res.status(400).json({ success: false, message: 'Quiz ID required' });

    const { name, settings, result_snapshot, email } = req.body;
    let requesterEmail = (email || '').toLowerCase().trim();

    if (!requesterEmail && req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.email) requesterEmail = user.email.toLowerCase().trim();
      } catch (_) {}
    }

    // 1. Fetch existing quiz row first to safely merge and never erase rounds/questions
    const { data: existingQuiz, error: fetchErr } = await supabase
      .from('results')
      .select('*')
      .eq('id', quizId)
      .eq('operation_type', 'quiz')
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existingQuiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const existingSettings = existingQuiz.settings || {};
    const existingSnapshot = existingQuiz.result_snapshot || {};

    // 2. Safe merge settings
    const mergedSettings = settings ? {
      ...existingSettings,
      ...settings,
      // If new settings doesn't supply rounds or sends empty, but existing had rounds, PRESERVE them!
      rounds: (Array.isArray(settings.rounds) && settings.rounds.length > 0)
        ? settings.rounds
        : (existingSettings.rounds || existingSnapshot.rounds || []),
      // Preserve intro media if not explicitly updated
      introMediaUrl: settings.introMediaUrl !== undefined ? settings.introMediaUrl : (existingSettings.introMediaUrl || ''),
      introMediaType: settings.introMediaType !== undefined ? settings.introMediaType : (existingSettings.introMediaType || 'video'),
      updated_at: new Date().toISOString()
    } : existingSettings;

    // 3. Safe merge result_snapshot
    const mergedSnapshot = result_snapshot ? {
      ...existingSnapshot,
      ...result_snapshot,
      // Never overwrite existing questions if new payload is empty/missing
      questions: (Array.isArray(result_snapshot.questions) && result_snapshot.questions.length > 0)
        ? result_snapshot.questions
        : (existingSnapshot.questions || []),
      // Never overwrite existing rounds if new payload is empty/missing
      rounds: (Array.isArray(result_snapshot.rounds) && result_snapshot.rounds.length > 0)
        ? result_snapshot.rounds
        : (mergedSettings.rounds || existingSnapshot.rounds || []),
      // Never overwrite existing participants if new payload is empty/missing
      participants: (Array.isArray(result_snapshot.participants) && result_snapshot.participants.length > 0)
        ? result_snapshot.participants
        : (existingSnapshot.participants || []),
      turnHistory: result_snapshot.turnHistory !== undefined
        ? result_snapshot.turnHistory
        : (existingSnapshot.turnHistory || [])
    } : {
      ...existingSnapshot,
      rounds: mergedSettings.rounds || existingSnapshot.rounds || []
    };

    const updatePayload = {
      settings: mergedSettings,
      result_snapshot: mergedSnapshot
    };
    if (name) updatePayload.result_name = name.trim();

    const { data, error } = await supabase
      .from('results')
      .update(updatePayload)
      .eq('id', quizId)
      .eq('operation_type', 'quiz')
      .select()
      .maybeSingle();

    if (error) throw error;
    return res.json({ success: true, quiz: data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/events/:idOrSlug
 * Get any event by ID or slug with owner details (Admin & direct lookup)
 */
router.get('/events/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    if (!supabase || !idOrSlug) return res.status(404).json({ success: false, message: 'Not found' });

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let eventData = null;
    if (isUUID) {
      const { data } = await supabase
        .from('events')
        .select('*, participants(id)')
        .eq('id', idOrSlug)
        .maybeSingle();
      eventData = data;
    } else {
      const cleanName = decodeURIComponent(idOrSlug).replace(/[-_]+/g, ' ').trim();
      const { data } = await supabase
        .from('events')
        .select('*, participants(id)')
        .ilike('name', `%${cleanName}%`)
        .maybeSingle();
      eventData = data;
    }

    if (!eventData) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Fetch owner profile
    let ownerProfile = null;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', eventData.owner_id)
        .maybeSingle();
      ownerProfile = prof;
    } catch (_) {}

    let authUser = null;
    try {
      const { data: u } = await supabase.auth.admin.getUserById(eventData.owner_id);
      authUser = u?.user;
    } catch (_) {}

    return res.json({
      success: true,
      event: {
        ...eventData,
        participantCount: eventData.participants ? eventData.participants.length : 0,
        owner: {
          id: eventData.owner_id,
          displayName: ownerProfile?.display_name || authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'User',
          email: authUser?.email || (ownerProfile?.display_name?.includes('@') ? ownerProfile.display_name : null) || 'user@eventora.app',
          usageType: ownerProfile?.usage_type || authUser?.user_metadata?.usage_type || 'personal'
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/events/:eventId/results
 * Get past results for an event
 */
router.get('/events/:eventId/results', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!supabase || !eventId) return res.json({ success: true, results: [] });

    const { data, error } = await supabase
      .from('results')
      .select('*, events(name)')
      .eq('event_id', eventId)
      .not('operation_type', 'like', 'special_event_%')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const results = (data || []).map(r => ({
      ...r,
      event_name: r.events?.name || 'General Event'
    }));

    return res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/events/:eventId/results
 * Save draw/shuffle/group result for an event
 */
router.post('/events/:eventId/results', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { result_name, operation_type, settings, result_snapshot, owner_id } = req.body;

    if (!supabase || !eventId || !result_name || !operation_type || !result_snapshot) {
      return res.status(400).json({ success: false, message: 'Missing required result fields.' });
    }

    let resolvedOwnerId = owner_id;
    if (!resolvedOwnerId) {
      const { data: ev } = await supabase.from('events').select('owner_id').eq('id', eventId).maybeSingle();
      resolvedOwnerId = ev?.owner_id;
    }

    const { data, error } = await supabase
      .from('results')
      .insert([{
        event_id: eventId,
        owner_id: resolvedOwnerId,
        result_name,
        operation_type,
        settings: settings || {},
        result_snapshot
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, result: data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/events/:eventId/participants
 * Get participants for a special event
 */
router.get('/events/:eventId/participants', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!supabase || !eventId) return res.json({ success: true, participants: [] });

    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.json({ success: true, participants: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/events/:eventId/participants
 * Add a participant to a special event
 */
router.post('/events/:eventId/participants', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const body = req.body.participant || req.body;
    const name = (body.name || '').trim();
    const external_identifier = (body.external_identifier || '').trim();
    const metadata = body.metadata || {};

    if (!supabase || !eventId || !name) {
      return res.status(400).json({ success: false, message: 'Event ID and participant name are required.' });
    }

    const newRecord = {
      event_id: eventId,
      name,
      external_identifier,
      metadata
    };

    const { data, error } = await supabase
      .from('participants')
      .insert([newRecord])
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, participant: data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/events/:eventId/participants/bulk
 * Bulk add participants to a special event
 */
router.post('/events/:eventId/participants/bulk', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const items = req.body.items || req.body.participants || [];

    if (!supabase || !eventId || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid arguments.' });
    }

    const formatted = items.map(item => ({
      event_id: eventId,
      name: (item.name || '').trim(),
      external_identifier: (item.external_identifier || item.id || '').trim(),
      metadata: item.metadata || {}
    })).filter(p => p.name.length > 0);

    if (formatted.length === 0) {
      return res.json({ success: true, participants: [] });
    }

    const { data, error } = await supabase
      .from('participants')
      .insert(formatted)
      .select();

    if (error) throw error;
    return res.json({ success: true, participants: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/ps/events/:eventId/participants/:participantId
 * Update a participant in a special event
 */
router.put('/events/:eventId/participants/:participantId', async (req, res, next) => {
  try {
    const { eventId, participantId } = req.params;
    const updates = req.body.updates || req.body;

    if (!supabase || !eventId || !participantId) {
      return res.status(400).json({ success: false, message: 'Invalid arguments.' });
    }

    const { data, error } = await supabase
      .from('participants')
      .update(updates)
      .eq('id', participantId)
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, participant: data });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/ps/events/:eventId/participants/:participantId
 * Delete a participant from a special event
 */
router.delete('/events/:eventId/participants/:participantId', async (req, res, next) => {
  try {
    const { eventId, participantId } = req.params;
    if (!supabase || !eventId || !participantId) {
      return res.status(400).json({ success: false, message: 'Invalid arguments.' });
    }

    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantId)
      .eq('event_id', eventId);

    if (error) throw error;
    return res.json({ success: true, message: 'Participant deleted.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/events/:eventId/participants/bulk-delete
 * Bulk delete participants from a special event
 */
router.post('/events/:eventId/participants/bulk-delete', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const participantIds = req.body.participantIds || [];

    if (!supabase || !eventId || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid arguments.' });
    }

    const { error } = await supabase
      .from('participants')
      .delete()
      .in('id', participantIds)
      .eq('event_id', eventId);

    if (error) throw error;
    return res.json({ success: true, message: 'Participants deleted.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/allocations/:eventId
 * Get allocated credentials for a special event
 */
router.get('/allocations/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!supabase || !eventId) return res.json({ success: true, allocatedUsers: [] });

    const { data, error } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_allocations')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching allocations:', error);
    }

    const list = Array.isArray(data?.result_snapshot) ? data.result_snapshot : [];
    return res.json({ success: true, allocatedUsers: list });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/allocations/:eventId
 * Add an allocated user credential for a special event
 */
router.post('/allocations/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { username, password, accessLevel = 'Evaluator' } = req.body;

    if (!supabase || !eventId) {
      return res.status(400).json({ success: false, message: 'Invalid arguments' });
    }

    const cleanUsername = (username || '').trim();
    if (!cleanUsername) {
      return res.status(400).json({ success: false, message: 'Username cannot be empty.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' });
    }

    const { data: event } = await supabase
      .from('events')
      .select('id, owner_id')
      .eq('id', eventId)
      .single();

    const { data: existingRecord } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_allocations')
      .maybeSingle();

    const currentUsers = Array.isArray(existingRecord?.result_snapshot) ? existingRecord.result_snapshot : [];

    if (currentUsers.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" is already allocated for this event.`
      });
    }

    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      username: cleanUsername,
      password,
      access_level: accessLevel,
      created_at: new Date().toISOString()
    };

    const updatedUsers = [newUser, ...currentUsers];

    if (existingRecord?.id) {
      const { error } = await supabase
        .from('results')
        .update({ result_snapshot: updatedUsers })
        .eq('id', existingRecord.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('results')
        .insert([{
          event_id: eventId,
          owner_id: event?.owner_id || 'f92acb4e-09b2-4f1c-ae6f-fc4d6e7601e1',
          result_name: 'Allocated Access Credentials',
          operation_type: 'special_event_allocations',
          result_snapshot: updatedUsers
        }]);
      if (error) throw error;
    }

    return res.json({ success: true, newUser, allocatedUsers: updatedUsers });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/ps/allocations/:eventId/:userId
 * Delete an allocated user credential
 */
router.delete('/allocations/:eventId/:userId', async (req, res, next) => {
  try {
    const { eventId, userId } = req.params;
    if (!supabase || !eventId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid arguments' });
    }

    const { data: existingRecord } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_allocations')
      .maybeSingle();

    if (!existingRecord?.id) {
      return res.json({ success: true, allocatedUsers: [] });
    }

    const currentUsers = Array.isArray(existingRecord.result_snapshot) ? existingRecord.result_snapshot : [];
    const updatedUsers = currentUsers.filter(u => u.id !== userId);

    const { error } = await supabase
      .from('results')
      .update({ result_snapshot: updatedUsers })
      .eq('id', existingRecord.id);

    if (error) throw error;

    return res.json({ success: true, allocatedUsers: updatedUsers });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/ps/settings/:eventId
 * Fetch special event settings (rounds, tasks, etc.)
 */
router.get('/settings/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!supabase || !eventId) {
      return res.status(400).json({ success: false, message: 'Invalid eventId' });
    }

    const { data, error } = await supabase
      .from('results')
      .select('id, result_snapshot')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_settings')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (data?.result_snapshot) {
      return res.json({ success: true, settings: data.result_snapshot });
    }

    // Default settings
    const defaultSettings = {
      roundsCount: 1,
      rounds: [
        { roundNumber: 1, task: '' }
      ]
    };

    return res.json({ success: true, settings: defaultSettings });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/ps/settings/:eventId
 * Save special event settings
 */
router.post('/settings/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const settings = req.body;

    if (!supabase || !eventId || !settings) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const { data: event } = await supabase
      .from('events')
      .select('owner_id')
      .eq('id', eventId)
      .maybeSingle();

    const ownerId = event?.owner_id || null;

    const { data: existing } = await supabase
      .from('results')
      .select('id')
      .eq('event_id', eventId)
      .eq('operation_type', 'special_event_settings')
      .maybeSingle();

    const resultName = `Special Event Settings (${settings.roundsCount || settings.rounds?.length || 1} Rounds)`;

    if (existing?.id) {
      const { error } = await supabase
        .from('results')
        .update({
          result_snapshot: settings,
          result_name: resultName
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('results')
        .insert([{
          owner_id: ownerId,
          event_id: eventId,
          operation_type: 'special_event_settings',
          result_name: resultName,
          result_snapshot: settings
        }]);
      if (error) throw error;
    }

    return res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

export default router;

