import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Users, RotateCw, Trophy, Sparkles, Award, Radio, Send, CheckCircle2, ChevronRight, Layers, Flag, FileText } from 'lucide-react';

import WheelCanvas from '../components/wheel/WheelCanvas';
import WheelControls from '../components/wheel/WheelControls';
import WinnerDialog from '../components/wheel/WinnerDialog';
import WheelHistoryDrawer from '../components/wheel/WheelHistoryDrawer';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SpecialEventDetailedReportModal from '../components/specialEvents/SpecialEventDetailedReportModal';
import { playVictorySound } from '../components/wheel/audio/wheelAudio';
import { participantService } from '../services/participantService';
import { resultService } from '../services/resultService';
import { specialEventService } from '../services/specialEventService';
import { specialEventLiveService } from '../services/specialEventLiveService';
import { TASK_PACKS } from '../utils/taskBank';
import { formatDate } from '../utils/dateUtils';

export default function WheelWorkspacePage() {
  const { eventId: paramId } = useParams();
  const outletCtx = useOutletContext();
  const eventId = outletCtx?.eventId || outletCtx?.event?.id || paramId;
  const wheelRef = useRef(null);

  const [allParticipants, setAllParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);

  // Wheel configuration (Persisted across refreshes)
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(`eventora_wheel_sound_${eventId}`) ?? localStorage.getItem('eventora_wheel_sound');
      if (saved !== null) return saved === 'true';
    } catch (_) {}
    return true;
  });
  const [celebrationEnabled, setCelebrationEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(`eventora_wheel_celebration_${eventId}`) ?? localStorage.getItem('eventora_wheel_celebration');
      if (saved !== null) return saved === 'true';
    } catch (_) {}
    return true;
  });
  const [removeWinnerOnDraw, setRemoveWinnerOnDraw] = useState(() => {
    try {
      const saved = localStorage.getItem(`eventora_wheel_fair_turn_${eventId}`) ?? localStorage.getItem('eventora_wheel_fair_turn');
      if (saved !== null) return saved === 'true';
    } catch (_) {}
    return false;
  });
  const [duration, setDuration] = useState(() => {
    try {
      const saved = localStorage.getItem(`eventora_wheel_duration_${eventId}`) ?? localStorage.getItem('eventora_wheel_duration');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (_) {}
    return 5;
  });

  // Student Task Assignment mode (Persisted across refreshes)
  const [assignTaskMode, setAssignTaskMode] = useState(() => {
    try {
      const saved = localStorage.getItem(`eventora_wheel_assign_task_${eventId}`);
      if (saved !== null) return saved === 'true';
    } catch (_) {}
    return false;
  });
  const [selectedTaskPack, setSelectedTaskPack] = useState(() => {
    try {
      const saved = localStorage.getItem(`eventora_wheel_task_pack_${eventId}`);
      if (saved) return saved;
    } catch (_) {}
    return 'catechism_faith';
  });
  const [assignedTask, setAssignedTask] = useState(null);

  // Winner dialog & history
  const [currentWinner, setCurrentWinner] = useState(null);
  const [isWinnerDialogOpen, setIsWinnerDialogOpen] = useState(false);
  const [history, setHistory] = useState([]);

  // Special Event Live Evaluation State & Settings
  const isSpecialEvent = outletCtx?.event?.category === 'Special Event' || outletCtx?.event?.name?.toLowerCase().includes('prathibha');
  const [specialSettings, setSpecialSettings] = useState(null);

  // Current Round (Persisted across refreshes)
  const [currentRoundNumber, setCurrentRoundNumber] = useState(() => {
    try {
      const saved = localStorage.getItem(`eventora_round_${eventId}`);
      if (saved) return parseInt(saved, 10);
    } catch (_) {}
    return 1;
  });

  // Removed participants for the active round (Persisted across refreshes)
  const [removedIds, setRemovedIds] = useState(() => {
    try {
      const activeRound = localStorage.getItem(`eventora_round_${eventId}`) || '1';
      const saved = localStorage.getItem(`eventora_removed_${eventId}_r${activeRound}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch (_) {}
    return new Set();
  });

  const [liveState, setLiveState] = useState(null);

  // Event Conclusion & Report States
  const [isEventFinished, setIsEventFinished] = useState(() => {
    try {
      return localStorage.getItem(`eventora_event_ended_${eventId}`) === 'true';
    } catch {
      return false;
    }
  });
  const [isFinishedPopupOpen, setIsFinishedPopupOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportScores, setReportScores] = useState([]);
  const [endingEvent, setEndingEvent] = useState(false);

  // Persist current round number to localStorage
  useEffect(() => {
    if (eventId && currentRoundNumber) {
      try {
        localStorage.setItem(`eventora_round_${eventId}`, currentRoundNumber.toString());
      } catch (_) {}
    }
  }, [currentRoundNumber, eventId]);

  // Persist removed participants whenever changed
  useEffect(() => {
    if (eventId && currentRoundNumber) {
      try {
        localStorage.setItem(
          `eventora_removed_${eventId}_r${currentRoundNumber}`,
          JSON.stringify([...removedIds])
        );
      } catch (_) {}
    }
  }, [removedIds, eventId, currentRoundNumber]);

  // Restore pending winner or dialog state if page refreshed while student selected
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`eventora_current_winner_${eventId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.winner) {
          setCurrentWinner(parsed.winner);
          if (parsed.assignedTask) setAssignedTask(parsed.assignedTask);
          setIsWinnerDialogOpen(true);
        }
      }
    } catch (_) {}
  }, [eventId]);

  const clearPendingWinner = () => {
    try {
      localStorage.removeItem(`eventora_current_winner_${eventId}`);
    } catch (_) {}
  };

  // Persist Wheel Settings (Fair Turn, Ticker Sound, Celebration, Duration) across refreshes
  useEffect(() => {
    try {
      localStorage.setItem('eventora_wheel_sound', soundEnabled.toString());
      if (eventId) localStorage.setItem(`eventora_wheel_sound_${eventId}`, soundEnabled.toString());
    } catch (_) {}
  }, [soundEnabled, eventId]);

  useEffect(() => {
    try {
      localStorage.setItem('eventora_wheel_celebration', celebrationEnabled.toString());
      if (eventId) localStorage.setItem(`eventora_wheel_celebration_${eventId}`, celebrationEnabled.toString());
    } catch (_) {}
  }, [celebrationEnabled, eventId]);

  useEffect(() => {
    try {
      localStorage.setItem('eventora_wheel_fair_turn', removeWinnerOnDraw.toString());
      if (eventId) localStorage.setItem(`eventora_wheel_fair_turn_${eventId}`, removeWinnerOnDraw.toString());
    } catch (_) {}
  }, [removeWinnerOnDraw, eventId]);

  useEffect(() => {
    try {
      localStorage.setItem('eventora_wheel_duration', duration.toString());
      if (eventId) localStorage.setItem(`eventora_wheel_duration_${eventId}`, duration.toString());
    } catch (_) {}
  }, [duration, eventId]);

  useEffect(() => {
    if (eventId) {
      try {
        localStorage.setItem(`eventora_wheel_assign_task_${eventId}`, assignTaskMode.toString());
        localStorage.setItem(`eventora_wheel_task_pack_${eventId}`, selectedTaskPack);
      } catch (_) {}
    }
  }, [assignTaskMode, selectedTaskPack, eventId]);

  // Synchronize persisted settings when eventId loads or updates
  useEffect(() => {
    if (!eventId) return;
    try {
      const savedSound = localStorage.getItem(`eventora_wheel_sound_${eventId}`) ?? localStorage.getItem('eventora_wheel_sound');
      if (savedSound !== null) setSoundEnabled(savedSound === 'true');

      const savedCelebration = localStorage.getItem(`eventora_wheel_celebration_${eventId}`) ?? localStorage.getItem('eventora_wheel_celebration');
      if (savedCelebration !== null) setCelebrationEnabled(savedCelebration === 'true');

      const savedFairTurn = localStorage.getItem(`eventora_wheel_fair_turn_${eventId}`) ?? localStorage.getItem('eventora_wheel_fair_turn');
      if (savedFairTurn !== null) setRemoveWinnerOnDraw(savedFairTurn === 'true');

      const savedDuration = localStorage.getItem(`eventora_wheel_duration_${eventId}`) ?? localStorage.getItem('eventora_wheel_duration');
      if (savedDuration !== null) {
        const d = parseInt(savedDuration, 10);
        if (!isNaN(d) && d > 0) setDuration(d);
      }

      const savedTaskMode = localStorage.getItem(`eventora_wheel_assign_task_${eventId}`);
      if (savedTaskMode !== null) setAssignTaskMode(savedTaskMode === 'true');

      const savedPack = localStorage.getItem(`eventora_wheel_task_pack_${eventId}`);
      if (savedPack) setSelectedTaskPack(savedPack);
    } catch (_) {}
  }, [eventId]);

  // Load Special Event Settings on mount without overwriting active round
  useEffect(() => {
    if (isSpecialEvent && eventId) {
      specialEventService.getSpecialEventSettings(eventId).then(async (settings) => {
        if (settings) {
          setSpecialSettings(settings);
          // Only initialize live state round if none is active on backend yet
          const existingLive = await specialEventLiveService.getLiveState().catch(() => null);
          if (!existingLive || !existingLive.currentRound) {
            const savedRound = parseInt(localStorage.getItem(`eventora_round_${eventId}`) || '1', 10);
            const targetRoundObj = settings.rounds?.find(r => r.roundNumber === savedRound) || settings.rounds?.[0];
            if (targetRoundObj) {
              specialEventLiveService.setRound(targetRoundObj.roundNumber, targetRoundObj.task || '');
            }
          }
        }
      });
    }
  }, [eventId, isSpecialEvent]);

  // Polling loop for live evaluation state sync when on Special Event
  useEffect(() => {
    if (!isSpecialEvent) return;
    let mounted = true;
    const poll = async () => {
      try {
        const state = await specialEventLiveService.getLiveState();
        if (mounted && state) {
          setLiveState(state);
          if (state.currentRound && state.currentRound !== currentRoundNumber) {
            setCurrentRoundNumber(state.currentRound);
            try {
              const saved = localStorage.getItem(`eventora_removed_${eventId}_r${state.currentRound}`);
              setRemovedIds(saved ? new Set(JSON.parse(saved)) : new Set());
            } catch (_) {}
          }

          // If a student is currently being evaluated live, keep the dialog open with that student!
          if (state.status === 'evaluating' && state.currentStudent) {
            setCurrentWinner(state.currentStudent);
            setIsWinnerDialogOpen(true);
          }

          if (state.status === 'completed') {
            setIsEventFinished(true);
            try {
              localStorage.setItem(`eventora_event_ended_${eventId}`, 'true');
            } catch (_) {}
          }
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isSpecialEvent, currentRoundNumber, eventId]);

  const configuredRounds = specialSettings?.rounds || [];
  const totalRoundsCount = configuredRounds.length || 2;
  const isFinalRound = currentRoundNumber >= totalRoundsCount;

  const requiredEvaluators = liveState?.requiredEvaluators || [];
  const submissions = liveState?.submissions || {};
  const submittedCount = requiredEvaluators.filter(u => Boolean(submissions[u])).length;
  const isEvalActive = liveState?.status === 'evaluating';
  const allCurrentEvaluatorsSubmitted = requiredEvaluators.length === 0 || submittedCount >= requiredEvaluators.length;

  // Finish Event button should ONLY appear when:
  // 1. It is the final round (isFinalRound)
  // 2. All participants on the wheel in this final round have been evaluated (eligibleParticipants.length === 0)
  // 3. Both evaluators have completed their submissions for the final evaluation
  const canShowFinishEventButton =
    isFinalRound &&
    allParticipants.length > 0 &&
    eligibleParticipants.length === 0 &&
    (!isEvalActive || allCurrentEvaluatorsSubmitted);

  const currentRoundObj = configuredRounds.find(r => r.roundNumber === currentRoundNumber) || {
    roundNumber: currentRoundNumber,
    task: liveState?.roundTask || ''
  };
  const currentRoundTask = currentRoundObj.task || '';

  const handleOpenDetailedReport = async () => {
    try {
      const scores = await specialEventLiveService.getScores(eventId);
      setReportScores(scores || []);
    } catch (e) {
      console.warn('Failed to fetch scores for report:', e);
    }
    setIsReportOpen(true);
  };

  const handleFinishEventClick = async () => {
    try {
      setEndingEvent(true);
      await specialEventLiveService.endEvent(eventId);
      setIsEventFinished(true);
      try {
        localStorage.setItem(`eventora_event_ended_${eventId}`, 'true');
      } catch (_) {}
      setIsFinishedPopupOpen(true);
    } catch (err) {
      console.error('Error ending event:', err);
      alert('Failed to end event: ' + (err.message || 'Unknown error'));
    } finally {
      setEndingEvent(false);
    }
  };

  const handleSwitchRound = async (newRoundNum, resetWheel = false) => {
    const nextRoundObj = configuredRounds.find(r => r.roundNumber === newRoundNum) || {
      roundNumber: newRoundNum,
      task: ''
    };
    setCurrentRoundNumber(newRoundNum);
    try {
      localStorage.setItem(`eventora_round_${eventId}`, newRoundNum.toString());
    } catch (_) {}

    // Reset exclusions so all participants are eligible for the new round
    if (resetWheel) {
      setRemovedIds(new Set());
      try {
        localStorage.removeItem(`eventora_removed_${eventId}_r${newRoundNum}`);
      } catch (_) {}
    } else {
      try {
        const saved = localStorage.getItem(`eventora_removed_${eventId}_r${newRoundNum}`);
        setRemovedIds(saved ? new Set(JSON.parse(saved)) : new Set());
      } catch (_) {
        setRemovedIds(new Set());
      }
    }

    clearPendingWinner();

    // Immediately update local liveState so polling doesn't overwrite it
    setLiveState(prev => prev ? {
      ...prev,
      currentRound: newRoundNum,
      roundTask: nextRoundObj.task || '',
      status: 'waiting',
      currentStudent: null,
      submissions: {}
    } : {
      eventId,
      status: 'waiting',
      currentRound: newRoundNum,
      roundTask: nextRoundObj.task || '',
      currentStudent: null,
      submissions: {},
      requiredEvaluators: []
    });

    try {
      const cached = localStorage.getItem('ps_live_state_cache');
      const parsed = cached ? JSON.parse(cached) : {};
      parsed.currentRound = newRoundNum;
      parsed.roundTask = nextRoundObj.task || '';
      parsed.status = 'waiting';
      parsed.currentStudent = null;
      parsed.submissions = {};
      localStorage.setItem('ps_live_state_cache', JSON.stringify(parsed));
    } catch (_) {}

    try {
      await specialEventLiveService.setRound(newRoundNum, nextRoundObj.task || '');
    } catch (err) {
      console.warn('setRound error:', err);
    }
  };

  const handleStartEvaluation = async (winner) => {
    const updated = await specialEventLiveService.startEvaluation({
      student: winner,
      roundNumber: currentRoundNumber,
      roundTask: currentRoundTask
    });
    if (updated) setLiveState(updated);
  };

  // Load participants
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await participantService.getParticipants(eventId);
        setAllParticipants(data);
      } catch (err) {
        console.error('Failed to load participants for wheel:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  // Eligible participants (excluding temporary removals)
  const eligibleParticipants = allParticipants.filter(p => !removedIds.has(p.id));

  // Spin trigger
  const handleTriggerSpin = () => {
    if (isSpinning || eligibleParticipants.length === 0) return;
    if (eligibleParticipants.length === 1) {
      // If only one person left in the wheel, don't spin it, immediately show the things for it!
      handleSpinEnd(eligibleParticipants[0]);
      return;
    }
    if (wheelRef.current) {
      wheelRef.current.spin();
    }
  };

  const handleSpinStart = () => {
    setIsSpinning(true);
    setCurrentWinner(null);
  };

  const pickTaskFromPack = (packId) => {
    const pack = TASK_PACKS.find(p => p.id === packId) || TASK_PACKS[0];
    if (!pack || !pack.tasks || pack.tasks.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * pack.tasks.length);
    return pack.tasks[randomIndex];
  };

  const handleDrawAnotherTask = () => {
    const newTask = pickTaskFromPack(selectedTaskPack);
    setAssignedTask(newTask);
  };

  const handleSpinEnd = (winner) => {
    setIsSpinning(false);
    setCurrentWinner(winner);

    let currentTask = null;
    if (assignTaskMode) {
      currentTask = pickTaskFromPack(selectedTaskPack);
      setAssignedTask(currentTask);
    } else {
      setAssignedTask(null);
    }

    setIsWinnerDialogOpen(true);
    try {
      localStorage.setItem(`eventora_current_winner_${eventId}`, JSON.stringify({
        winner,
        assignedTask: currentTask,
        round: currentRoundNumber
      }));
    } catch (_) {}

    // Audio victory chime
    if (soundEnabled) {
      playVictorySound();
    }

    // Confetti explosion
    if (celebrationEnabled) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#635BFF', '#159A72', '#F59E0B', '#EC4899', '#3B82F6']
      });
    }

    // Save result to local history drawer
    const entry = {
      id: 'spin-' + Date.now(),
      winner,
      assignedTask: currentTask,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: formatDate(new Date())
    };
    const updated = [entry, ...history];
    setHistory(updated);

    // Save snapshot record directly into Supabase results table
    resultService.saveResult({
      event_id: eventId,
      result_name: currentTask ? `Task Spotlight: ${winner.name} (${currentTask.title})` : `Wheel Winner: ${winner.name}`,
      operation_type: 'wheel',
      settings: { duration, removeWinnerOnDraw, soundEnabled, assignTaskMode, selectedTaskPack },
      result_snapshot: {
        winner: winner.name,
        winner_id: winner.id,
        participant_count: eligibleParticipants.length,
        task: currentTask
      }
    }).catch(err => {
      console.error('Failed to log wheel result to Supabase:', err);
    });

    // Auto-remove is deferred to user action in WinnerDialog (Next Spin removes, Spin With Winner keeps)
  };

  const handleNextSpinWithRemoval = async (winner) => {
    clearPendingWinner();
    if (isSpecialEvent) {
      await specialEventLiveService.finishStudent();
    }
    const newRemoved = winner?.id ? new Set([...removedIds, winner.id]) : removedIds;
    setRemovedIds(newRemoved);
    setIsWinnerDialogOpen(false);

    const remaining = allParticipants.filter(p => !newRemoved.has(p.id));
    if (remaining.length === 1) {
      // ONLY ONE PERSON LEFT IN THE WHEEL: Don't spin it, just show the things for it!
      setTimeout(() => {
        handleSpinEnd(remaining[0]);
      }, 300);
    } else if (remaining.length > 1) {
      setTimeout(() => {
        if (wheelRef.current) {
          wheelRef.current.spin();
        }
      }, 120);
    }
  };

  const handleNextSpinKeepWinner = async () => {
    clearPendingWinner();
    if (isSpecialEvent) {
      await specialEventLiveService.finishStudent();
    }
    setIsWinnerDialogOpen(false);
    if (eligibleParticipants.length === 1) {
      setTimeout(() => {
        handleSpinEnd(eligibleParticipants[0]);
      }, 300);
    } else {
      setTimeout(() => {
        if (wheelRef.current && eligibleParticipants.length > 0) {
          wheelRef.current.spin();
        }
      }, 120);
    }
  };

  const handleRemoveWinner = (winner) => {
    clearPendingWinner();
    setRemovedIds(prev => new Set([...prev, winner.id]));
  };

  const handleResetExclusions = () => {
    setRemovedIds(new Set());
    try {
      localStorage.removeItem(`eventora_removed_${eventId}_r${currentRoundNumber}`);
    } catch (_) {}
  };

  const handleClearHistory = () => {
    setIsClearHistoryConfirmOpen(true);
  };

  const confirmClearHistory = () => {
    setHistory([]);
    setIsClearHistoryConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Special Event Active Round & Task Bar */}
      {isSpecialEvent && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-violet-950/70 via-[#1B1633] to-[#141622] border border-violet-800/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-violet-600/20 border border-violet-500/40 text-violet-300 font-extrabold text-sm flex items-center justify-center shrink-0">
              R{currentRoundNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">
                  Round {currentRoundNumber} {configuredRounds.length > 0 ? `of ${configuredRounds.length}` : ''}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-violet-200/90 mt-0.5">
                {currentRoundTask ? (
                  <span><strong>Task:</strong> {currentRoundTask}</span>
                ) : (
                  <span className="text-gray-400">Configure round tasks in Settings tab</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Current Round Badge - Shows Current Round Only */}
            <div className="flex items-center bg-[#1A1D2D] p-1 rounded-xl border border-gray-800">
              <span className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white shadow-xs">
                Round {currentRoundNumber}
              </span>
            </div>

            {/* Advance to next round if round has ended and not the final round */}
            {!isEventFinished && eligibleParticipants.length === 0 && !isFinalRound && (
              <button
                type="button"
                onClick={() => handleSwitchRound(currentRoundNumber + 1, true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Advance to Round {currentRoundNumber + 1} & Reset Wheel</span>
              </button>
            )}

            {/* When not finished and on the final round: Finish Event button ONLY when final evaluations are done */}
            {!isEventFinished ? (
              canShowFinishEventButton && (
                <button
                  type="button"
                  onClick={handleFinishEventClick}
                  disabled={endingEvent}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Flag className="w-4 h-4" />
                  <span>{endingEvent ? 'Finishing...' : 'Finish Event'}</span>
                </button>
              )
            ) : (
              /* Once finished: remove finish button and show report button! */
              <button
                type="button"
                onClick={handleOpenDetailedReport}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Report</span>
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400">Loading wheel workspace...</div>
      ) : allParticipants.length === 0 ? (
        <div className="py-20 px-4 text-center bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">No participants in this event</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            The wheel needs at least one participant. Add names or import a spreadsheet to start spinning!
          </p>
          <div className="pt-2">
            <Link
              to={`/app/events/${eventId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25"
            >
              <Users className="w-4 h-4" />
              <span>Go to Participants Tab</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Wheel Stage (Left / Main) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 sm:p-10 bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-sm relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-violet-500/5 to-transparent rounded-3xl pointer-events-none" />

            <WheelCanvas
              ref={wheelRef}
              participants={eligibleParticipants}
              duration={duration}
              soundEnabled={soundEnabled}
              isPaused={isWinnerDialogOpen}
              onSpinStart={handleSpinStart}
              onSpinEnd={handleSpinEnd}
            />

            {/* Quick Status Subtitle */}
            <div className="mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
              {eligibleParticipants.length} of {allParticipants.length} participants eligible
            </div>
          </div>

          {/* Controls & History (Right Sidebar) */}
          <div className="lg:col-span-5 space-y-5">
            <WheelControls
              isSpinning={isSpinning}
              onSpin={handleTriggerSpin}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              celebrationEnabled={celebrationEnabled}
              onToggleCelebration={() => setCelebrationEnabled(!celebrationEnabled)}
              removeWinner={removeWinnerOnDraw}
              onToggleRemoveWinner={setRemoveWinnerOnDraw}
              duration={duration}
              onChangeDuration={setDuration}
              onResetParticipants={handleResetExclusions}
              removedCount={removedIds.size}
              eligibleCount={eligibleParticipants.length}
              assignTaskMode={assignTaskMode}
              onToggleAssignTaskMode={setAssignTaskMode}
              selectedTaskPack={selectedTaskPack}
              onSelectTaskPack={setSelectedTaskPack}
              isSpecialEvent={isSpecialEvent}
            />

            <WheelHistoryDrawer
              history={history}
              onClearHistory={handleClearHistory}
            />
          </div>

        </div>
      )}

      {/* Winner Reveal Modal */}
      <WinnerDialog
        isOpen={isWinnerDialogOpen}
        winner={currentWinner}
        onClose={() => {
          clearPendingWinner();
          setIsWinnerDialogOpen(false);
        }}
        onRemoveWinner={handleRemoveWinner}
        onSpinAgain={handleTriggerSpin}
        onNextSpinRemove={handleNextSpinWithRemoval}
        onSpinAgainKeep={handleNextSpinKeepWinner}
        isFairTurn={removeWinnerOnDraw}
        canRemove={!removedIds.has(currentWinner?.id)}
        assignedTask={assignedTask}
        onDrawAnotherTask={handleDrawAnotherTask}
        eligibleCount={eligibleParticipants.length}
        isSpecialEvent={isSpecialEvent}
        currentRound={currentRoundNumber}
        currentRoundTask={currentRoundTask}
        liveState={liveState}
        onStartEvaluation={handleStartEvaluation}
      />

      <ConfirmDialog
        isOpen={isClearHistoryConfirmOpen}
        title="Clear Spin History?"
        message="Clear all recorded spin results for this session? This will reset the wheel draw history."
        confirmText="Clear History"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmClearHistory}
        onCancel={() => setIsClearHistoryConfirmOpen(false)}
      />

      {/* Popup: The Event Has Finished */}
      {isFinishedPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#181B28] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 text-center space-y-4 animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Event Concluded
              </span>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                The Event Has Finished!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                All rounds and evaluations have concluded successfully. You can now view the detailed final report with rankings and marks.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsFinishedPopupOpen(false);
                  handleOpenDetailedReport();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Show Report</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFinishedPopupOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Special Event Detailed Report Modal */}
      <SpecialEventDetailedReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        eventId={eventId}
        eventName={outletCtx?.event?.name || 'Special Event'}
        eventCategory={outletCtx?.event?.category || 'Special Event'}
        participants={allParticipants}
        specialSettings={specialSettings}
        scores={reportScores}
      />
    </div>
  );
}
