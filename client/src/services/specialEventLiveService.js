import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const specialEventLiveService = {
  // 1. Fetch current live evaluation state
  async getLiveState() {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/live-state`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.liveState) {
          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(data.liveState));
          } catch {}
          return data.liveState;
        }
      }
    } catch (err) {
      // Fallback
    }

    // Direct Supabase fallback
    if (supabase) {
      try {
        const { data: event } = await supabase
          .from('events')
          .select('id')
          .ilike('name', '%Prathibha Sangamam%')
          .limit(1)
          .maybeSingle();

        if (event) {
          const { data: record } = await supabase
            .from('results')
            .select('result_snapshot')
            .eq('event_id', event.id)
            .eq('operation_type', 'special_event_live_state')
            .maybeSingle();

          if (record?.result_snapshot) {
            return record.result_snapshot;
          }
        }
      } catch {}
    }

    // Cache fallback
    try {
      const cached = localStorage.getItem('ps_live_state_cache');
      if (cached) return JSON.parse(cached);
    } catch {}

    return {
      status: 'waiting',
      currentRound: 1,
      roundTask: '',
      currentStudent: null,
      submissions: {},
      requiredEvaluators: []
    };
  },

  // 2. Start evaluation for selected student (called by Admin Wheel)
  async startEvaluation({ student, roundNumber, roundTask }) {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/start-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student, roundNumber, roundTask })
      });
      if (res.ok) {
        const data = await res.json();
        return data.liveState;
      }
    } catch (err) {
      console.warn('API start-evaluation error:', err);
    }

    // Fallback: write to Supabase directly
    if (supabase) {
      try {
        const { data: event } = await supabase
          .from('events')
          .select('id')
          .ilike('name', '%Prathibha Sangamam%')
          .limit(1)
          .maybeSingle();

        if (event) {
          const liveState = {
            eventId: event.id,
            status: 'evaluating',
            currentRound: roundNumber || 1,
            roundTask: roundTask || '',
            currentStudent: student,
            submissions: {},
            updatedAt: new Date().toISOString()
          };

          const { data: existing } = await supabase
            .from('results')
            .select('id')
            .eq('event_id', event.id)
            .eq('operation_type', 'special_event_live_state')
            .maybeSingle();

          if (existing?.id) {
            await supabase.from('results').update({ result_snapshot: liveState }).eq('id', existing.id);
          } else {
            await supabase.from('results').insert([{
              event_id: event.id,
              operation_type: 'special_event_live_state',
              result_snapshot: liveState
            }]);
          }
          return liveState;
        }
      } catch (dbErr) {
        console.error('Supabase startEvaluation fallback error:', dbErr);
      }
    }
    return null;
  },

  // 3. Submit score by individual evaluator
  async submitScore({ username, score, grace, grade, studentId, studentName, roundNumber }) {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/submit-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, score, grace, grade, studentId, studentName, roundNumber })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.liveState) {
          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(data.liveState));
          } catch (_) {}
          return data.liveState;
        }
      }
    } catch (err) {
      console.warn('API submit-score error:', err);
    }

    if (supabase) {
      try {
        const { data: event } = await supabase
          .from('events')
          .select('id, owner_id')
          .ilike('name', '%Prathibha Sangamam%')
          .limit(1)
          .maybeSingle();

        if (event) {
          const numScore = Number(score) || 0;
          const numGrace = Number(grace) || 0;
          const totalScore = numScore + numGrace;

          // 1. Update live state
          const { data: liveRecord } = await supabase
            .from('results')
            .select('id, result_snapshot')
            .eq('event_id', event.id)
            .eq('operation_type', 'special_event_live_state')
            .maybeSingle();

          const liveState = liveRecord?.result_snapshot || {
            eventId: event.id,
            status: 'evaluating',
            currentRound: roundNumber || 1,
            submissions: {}
          };

          if (!liveState.submissions) liveState.submissions = {};
          liveState.submissions[username] = {
            score: numScore,
            grace: numGrace,
            totalScore: totalScore,
            submittedAt: new Date().toISOString()
          };
          liveState.updatedAt = new Date().toISOString();

          if (liveRecord?.id) {
            await supabase.from('results').update({ result_snapshot: liveState }).eq('id', liveRecord.id);
          }

          // 2. Update permanent scores log
          const { data: scoreRecord } = await supabase
            .from('results')
            .select('id, result_snapshot')
            .eq('event_id', event.id)
            .eq('operation_type', 'special_event_scores')
            .maybeSingle();

          const currentScores = Array.isArray(scoreRecord?.result_snapshot) ? scoreRecord.result_snapshot : [];
          const newEntry = {
            id: 'score-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            studentId,
            studentName,
            roundNumber: Number(roundNumber) || 1,
            evaluator: username,
            score: numScore,
            grace: numGrace,
            totalScore: totalScore,
            createdAt: new Date().toISOString()
          };

          const existingIdx = currentScores.findIndex(
            s => s.evaluator === username &&
                 ((studentId && s.studentId === studentId) || (studentName && s.studentName === studentName)) &&
                 Number(s.roundNumber) === Number(roundNumber || 1)
          );

          let updatedScores;
          if (existingIdx >= 0) {
            updatedScores = [...currentScores];
            updatedScores[existingIdx] = {
              ...updatedScores[existingIdx],
              score: numScore,
              grace: numGrace,
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
              event_id: event.id,
              owner_id: event.owner_id,
              operation_type: 'special_event_scores',
              result_name: 'Evaluator Score Entries',
              result_snapshot: updatedScores
            }]);
          }

          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(liveState));
          } catch (_) {}

          return liveState;
        }
      } catch (dbErr) {
        console.error('Supabase submitScore fallback error:', dbErr);
      }
    }

    return null;
  },

  // Update round task in live state and broadcast to evaluators
  async updateRoundTask(roundTask, roundNumber) {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/update-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundTask, roundNumber })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.liveState) {
          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(data.liveState));
          } catch (_) {}
          return data.liveState;
        }
      }
    } catch (err) {
      console.warn('API update-task error:', err);
    }
    return null;
  },

  // 4. Finish student evaluation (sets waiting state for evaluators)
  async finishStudent(params = {}) {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/finish-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.liveState) {
          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(data.liveState));
          } catch (_) {}
          return data.liveState;
        }
      }
    } catch (err) {
      console.warn('API finish-student error:', err);
    }

    if (supabase) {
      try {
        const { data: event } = await supabase
          .from('events')
          .select('id')
          .ilike('name', '%Prathibha Sangamam%')
          .limit(1)
          .maybeSingle();

        if (event) {
          const { data: existing } = await supabase
            .from('results')
            .select('id, result_snapshot')
            .eq('event_id', event.id)
            .eq('operation_type', 'special_event_live_state')
            .maybeSingle();

          const current = existing?.result_snapshot || {};
          const updated = {
            ...current,
            status: 'waiting',
            currentStudent: null,
            submissions: {},
            updatedAt: new Date().toISOString()
          };

          if (existing?.id) {
            await supabase.from('results').update({ result_snapshot: updated }).eq('id', existing.id);
          }
          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        }
      } catch (dbErr) {
        console.error('Supabase finishStudent fallback error:', dbErr);
      }
    }

    return null;
  },

  // 5. Change or advance active round
  async setRound(roundNumber, roundTask) {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/set-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNumber, roundTask })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.liveState) {
          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(data.liveState));
          } catch (_) {}
          return data.liveState;
        }
      }
    } catch (err) {
      console.warn('API set-round error:', err);
    }

    // Direct Supabase fallback
    if (supabase) {
      try {
        const { data: event } = await supabase
          .from('events')
          .select('id, owner_id')
          .ilike('name', '%Prathibha Sangamam%')
          .limit(1)
          .maybeSingle();

        if (event) {
          const liveState = {
            eventId: event.id,
            status: 'waiting',
            currentRound: Number(roundNumber) || 1,
            roundTask: roundTask || '',
            currentStudent: null,
            submissions: {},
            updatedAt: new Date().toISOString()
          };

          const { data: existing } = await supabase
            .from('results')
            .select('id')
            .eq('event_id', event.id)
            .eq('operation_type', 'special_event_live_state')
            .maybeSingle();

          if (existing?.id) {
            await supabase.from('results').update({ result_snapshot: liveState }).eq('id', existing.id);
          } else {
            await supabase.from('results').insert([{
              event_id: event.id,
              owner_id: event.owner_id,
              operation_type: 'special_event_live_state',
              result_name: 'Live Evaluation State (waiting)',
              result_snapshot: liveState
            }]);
          }

          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(liveState));
          } catch (_) {}

          return liveState;
        }
      } catch (dbErr) {
        console.error('Supabase setRound fallback error:', dbErr);
      }
    }

    return null;
  },

  // 6. Conclude / End Special Event
  async endEvent(eventId) {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/end-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.liveState) {
          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(data.liveState));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('API end-event error:', err);
    }

    // Direct Supabase fallback
    if (supabase) {
      try {
        let targetEventId = eventId;
        if (!targetEventId) {
          const { data: event } = await supabase
            .from('events')
            .select('id, owner_id')
            .ilike('name', '%Prathibha Sangamam%')
            .limit(1)
            .maybeSingle();
          if (event) targetEventId = event.id;
        }

        if (targetEventId) {
          const { data: existing } = await supabase
            .from('results')
            .select('id, result_snapshot')
            .eq('event_id', targetEventId)
            .eq('operation_type', 'special_event_live_state')
            .maybeSingle();

          const current = existing?.result_snapshot || {};
          const updated = {
            ...current,
            status: 'completed',
            currentStudent: null,
            submissions: {},
            endedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          if (existing?.id) {
            await supabase.from('results').update({ result_snapshot: updated }).eq('id', existing.id);
          } else {
            await supabase.from('results').insert([{
              event_id: targetEventId,
              operation_type: 'special_event_live_state',
              result_name: 'Live Evaluation State (completed)',
              result_snapshot: updated
            }]);
          }

          try {
            localStorage.setItem('ps_live_state_cache', JSON.stringify(updated));
            localStorage.setItem(`eventora_event_ended_${targetEventId}`, 'true');
          } catch (_) {}

          return updated;
        }
      } catch (dbErr) {
        console.error('Supabase endEvent fallback error:', dbErr);
      }
    }

    if (eventId) {
      try {
        localStorage.setItem(`eventora_event_ended_${eventId}`, 'true');
      } catch (_) {}
    }

    return null;
  },

  // 7. Get all scores (with Supabase fallback)
  async getScores(eventId) {
    try {
      const res = await fetch(`${API_BASE_URL}/ps/scores`);
      if (res.ok) {
        const data = await res.json();
        if (data.scores && Array.isArray(data.scores) && data.scores.length > 0) {
          try {
            localStorage.setItem('ps_scores_cache', JSON.stringify(data.scores));
          } catch {}
          return data.scores;
        }
      }
    } catch {}

    // Direct Supabase fallback
    if (supabase) {
      try {
        let query = supabase
          .from('results')
          .select('result_snapshot')
          .eq('operation_type', 'special_event_scores');

        if (eventId) {
          query = query.eq('event_id', eventId);
        }

        const { data: records } = await query;
        if (records && records.length > 0) {
          const all = records.flatMap(r =>
            Array.isArray(r.result_snapshot)
              ? r.result_snapshot
              : (r.result_snapshot ? [r.result_snapshot] : [])
          );
          if (all.length > 0) {
            try {
              localStorage.setItem('ps_scores_cache', JSON.stringify(all));
            } catch {}
            return all;
          }
        }
      } catch (err) {
        console.warn('Supabase getScores fallback error:', err);
      }
    }

    try {
      const cached = localStorage.getItem('ps_scores_cache');
      if (cached) return JSON.parse(cached);
    } catch {}

    return [];
  }
};

