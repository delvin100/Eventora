import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  LogOut,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  Award,
  Radio,
  UserCheck,
  ChevronRight,
  AlertCircle,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { prathibhaSangamamAuthService } from '../../services/prathibhaSangamamAuthService';
import { specialEventLiveService } from '../../services/specialEventLiveService';
import { specialEventService } from '../../services/specialEventService';

function getOrdinalWord(n) {
  const ordinals = [
    '', 'first', 'second', 'third', 'fourth', 'fifth',
    'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
    'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
    'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'
  ];
  if (n >= 1 && n < ordinals.length) {
    return ordinals[n];
  }
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function PrathibhaDashboardPage({ session: propSession, onLogout }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(propSession || prathibhaSangamamAuthService.getCurrentSession());
  const [settings, setSettings] = useState(null);

  const [liveState, setLiveState] = useState({
    status: 'waiting',
    currentRound: 1,
    roundTask: '',
    currentStudent: null,
    submissions: {},
    requiredEvaluators: [],
    evaluatedCount: 0
  });

  const [score, setScore] = useState('');
  const [grace, setGrace] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastStudentId, setLastStudentId] = useState(null);

  useEffect(() => {
    if (propSession) {
      setSession(propSession);
      return;
    }
    const current = prathibhaSangamamAuthService.getCurrentSession();
    if (!current) {
      navigate('/ps/login', { replace: true });
    } else {
      setSession(current);
    }
  }, [navigate, propSession]);

  // Load Special Event Settings on mount to immediately have round tasks
  useEffect(() => {
    const eventId = session?.event_id || 'cd396f58-15bc-4c68-bb44-70e0f9d86a9c';
    specialEventService.getSpecialEventSettings(eventId).then(data => {
      if (data) setSettings(data);
    }).catch(() => {});
  }, [session?.event_id]);

  // Polling loop for live state synchronization (every 1.5 seconds)
  useEffect(() => {
    let isMounted = true;

    async function poll() {
      try {
        const state = await specialEventLiveService.getLiveState();
        if (isMounted && state) {
          setLiveState(state);

          // Reset score and grace input or restore saved drafts when a new student arrives
          if (state.currentStudent?.id && state.currentStudent.id !== lastStudentId) {
            setLastStudentId(state.currentStudent.id);
            try {
              const draft = localStorage.getItem(`ps_draft_${state.currentStudent.id}_${session?.username}`);
              const draftGrace = localStorage.getItem(`ps_draft_grace_${state.currentStudent.id}_${session?.username}`);
              setScore(draft || '');
              setGrace(draftGrace !== null && draftGrace !== undefined ? draftGrace : '0');
            } catch (_) {
              setScore('');
              setGrace('0');
            }
            setErrorMsg(null);
          }
        }
      } catch (err) {
        console.warn('Live state poll error:', err);
      }
    }

    poll();
    const interval = setInterval(poll, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lastStudentId]);

  const handleLogout = () => {
    prathibhaSangamamAuthService.logout();
    if (onLogout) {
      onLogout();
    }
    navigate('/ps/login', { replace: true });
  };

  const handleScoreUpdate = (val) => {
    setScore(val);
    if (liveState?.currentStudent?.id && session?.username) {
      try {
        localStorage.setItem(`ps_draft_${liveState.currentStudent.id}_${session.username}`, val);
      } catch (_) {}
    }
  };

  const handleGraceUpdate = (val) => {
    setGrace(val);
    if (liveState?.currentStudent?.id && session?.username) {
      try {
        localStorage.setItem(`ps_draft_grace_${liveState.currentStudent.id}_${session.username}`, val);
      } catch (_) {}
    }
  };

  const handleSubmitScore = async (e) => {
    if (e) e.preventDefault();
    if (score === '' || isNaN(Number(score))) {
      setErrorMsg('Please enter a valid numeric score.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const numScore = Number(score);
      const numGrace = (grace === '' || isNaN(Number(grace))) ? 0 : Math.max(0, Number(grace));

      await specialEventLiveService.submitScore({
        username: session.username,
        score: numScore,
        grace: numGrace,
        studentId: liveState.currentStudent?.id,
        studentName: liveState.currentStudent?.name,
        roundNumber: liveState.currentRound
      });

      try {
        localStorage.removeItem(`ps_draft_${liveState.currentStudent?.id}_${session?.username}`);
        localStorage.removeItem(`ps_draft_grace_${liveState.currentStudent?.id}_${session?.username}`);
      } catch (_) {}

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#10B981', '#635BFF']
      });

      // Refetch state immediately
      const updated = await specialEventLiveService.getLiveState();
      if (updated) setLiveState(updated);
    } catch (err) {
      console.error('Submit score error:', err);
      setErrorMsg('Failed to submit score. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) return null;

  const role = session.access_level === 'Judge' ? 'Evaluator' : (session.access_level || 'Evaluator');
  const mySubmission = liveState.submissions?.[session.username];
  const hasSubmitted = Boolean(mySubmission);
  const isEvaluating = liveState.status === 'evaluating' && Boolean(liveState.currentStudent);

  const activeRoundNum = Number(liveState.currentRound) || 1;
  const configuredRoundObj = settings?.rounds?.find(r => Number(r.roundNumber) === Number(activeRoundNum));
  const currentTaskName = liveState.roundTask || configuredRoundObj?.task || '';

  const evaluatedCount = Number(liveState.evaluatedCount) || 0;
  const nextParticipantNumber = evaluatedCount + 1;
  const participantOrdinal = getOrdinalWord(nextParticipantNumber);

  const parsedScore = Number(score) || 0;
  const parsedGrace = (grace === '' || isNaN(Number(grace))) ? 0 : Number(grace);
  const totalMarks = score !== '' ? parsedScore + parsedGrace : 0;

  return (
    <div className="min-h-screen bg-[#0E1017] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-gray-800 bg-[#141622] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-600/30">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              <span>Prathibha Sangamam</span>
            </h1>
            <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">
              Evaluator Portal
            </p>
          </div>
        </div>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#1A1D2D] border border-gray-800">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 font-bold text-xs flex items-center justify-center border border-violet-500/30">
              {session.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-tight">
                {session.username}
              </p>
              <p className="text-[10px] text-violet-400 font-medium">
                {role}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/40 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Evaluator Body */}
      <main className="flex-1 p-4 sm:p-8 max-w-3xl w-full mx-auto space-y-6">
        
        {/* Top Round & Task Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-violet-950/70 via-[#1B1633] to-[#141622] border border-violet-800/40 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" />
                <span>Round {liveState.currentRound || 1}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white">
              <span>Round {activeRoundNum}: </span>
              {currentTaskName ? (
                <span className="text-violet-200 font-medium">{currentTaskName}</span>
              ) : (
                <span className="text-violet-200 font-medium">Task {activeRoundNum}</span>
              )}
            </h2>
          </div>
        </div>

        {/* SCREEN CASE 0: EVENT CONCLUDED SCREEN */}
        {liveState.status === 'completed' && (
          <div className="p-8 sm:p-14 rounded-3xl bg-[#161824] border border-amber-500/30 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Event Concluded
              </span>
              <h3 className="text-2xl font-black text-white">
                All Rounds Successfully Finished!
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                Thank you for your valuable assessments. The organizer has concluded all rounds for this event and all final scores have been compiled.
              </p>
            </div>

            <div className="pt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1F2333] border border-gray-700/60 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Evaluations Recorded & Finalized</span>
            </div>
          </div>
        )}

        {/* SCREEN CASE 1: WAITING SCREEN (Before first spin or in-between spins) */}
        {!isEvaluating && liveState.status !== 'completed' && (
          <div className="p-8 sm:p-14 rounded-3xl bg-[#161824] border border-gray-800 text-center space-y-5 shadow-2xl animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-3xl bg-violet-600/15 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto shadow-inner relative">
              <Radio className="w-10 h-10 text-violet-400 animate-pulse" />
              <div className="absolute inset-0 rounded-3xl bg-violet-500/10 animate-ping pointer-events-none" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Waiting for the {participantOrdinal} one to participate...
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                The organizer is spinning the wheel. As soon as a participant is selected and activated, this screen will automatically load the scoring panel.
              </p>
              {currentTaskName && (
                <div className="pt-1">
                  <span className="text-xs text-violet-300 bg-violet-500/15 border border-violet-500/30 px-3 py-1 rounded-xl inline-flex items-center gap-1.5 font-medium">
                    <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Round {activeRoundNum} Task: <strong>{currentTaskName}</strong></span>
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1F2333] border border-gray-700/60 text-xs text-gray-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Ready & listening for the {participantOrdinal} participant</span>
            </div>
          </div>
        )}

        {/* SCREEN CASE 2: ACTIVE EVALUATION (Student selected & pushed by wheel) */}
        {isEvaluating && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Student Card */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-[#1C1F2E] to-[#151722] border border-violet-500/30 shadow-2xl text-center space-y-3 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-[10px] font-extrabold uppercase tracking-widest text-violet-300 border border-violet-500/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Participant Under Evaluation</span>
              </div>

              {/* Participant Avatar & Name */}
              <div className="pt-1">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-violet-600/30">
                  {liveState.currentStudent?.name?.charAt(0).toUpperCase()}
                </div>

                <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-3">
                  {liveState.currentStudent?.name}
                </h3>

                {/* Prominent Task Name Display */}
                {currentTaskName && (
                  <div className="pt-2 flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-200 text-xs sm:text-sm font-semibold max-w-full">
                      <Award className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-violet-300 font-bold">Assigned Task:</span>
                      <span className="text-white font-extrabold truncate">{currentTaskName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* If Already Submitted by this Evaluator */}
            {hasSubmitted ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-[#161824] border border-emerald-500/30 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-xl font-extrabold text-white">
                    Score Submitted!
                  </h4>
                  <div className="inline-flex flex-wrap items-center justify-center gap-2 pt-1">
                    <span className="px-3 py-1 rounded-xl bg-[#1F2333] border border-gray-700 text-xs text-gray-300">
                      Base Score: <strong className="text-white font-bold">{mySubmission?.score}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
                      Grace: <strong className="font-bold">+{mySubmission?.grace || 0}</strong>
                    </span>
                    <span className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xs text-white font-black shadow-sm">
                      Total: {mySubmission?.totalScore ?? ((Number(mySubmission?.score) || 0) + (Number(mySubmission?.grace) || 0))} pts
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto pt-1">
                    Your assessment has been securely logged for <strong className="text-white">{liveState.currentStudent?.name}</strong>.
                  </p>
                </div>

                <div className="pt-3">
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1F2333] border border-gray-700/60 text-xs text-violet-300 font-semibold">
                    <Clock className="w-4 h-4 animate-spin text-violet-400" />
                    <span>Waiting for the next participant to be spun...</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 pt-1">
                  Your score is independent and confidential.
                </p>
              </div>
            ) : (
              /* If NOT Submitted Yet: Show Score Input, Grace Input & Submit Button */
              <div className="p-6 sm:p-8 rounded-3xl bg-[#161824] border border-gray-800 shadow-xl space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-violet-400" />
                    <span>Enter Evaluator Score</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Assign your score for {liveState.currentStudent?.name} {currentTaskName ? `on "${currentTaskName}"` : `in Round ${liveState.currentRound}`}.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitScore} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                      Score / Points
                    </label>

                    <div className="flex items-center rounded-2xl border border-gray-700 bg-[#1A1D2D] focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/25 p-2 transition-all">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={score}
                        onChange={(e) => handleScoreUpdate(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Enter score (e.g. 85)..."
                        autoFocus
                        className="w-full px-3 py-2 text-lg font-black text-white bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* Grace (Optional, Default: 0) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                        Grace Marks
                      </label>
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Optional
                      </span>
                    </div>

                    <div className="flex items-center rounded-2xl border border-gray-700 bg-[#1A1D2D] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/25 p-2 transition-all">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="1"
                        value={grace}
                        onChange={(e) => handleGraceUpdate(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
                        className="w-full px-3 py-2 text-base font-bold text-white bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* Live Total Marks Summary (Score + Grace) */}
                  {score !== '' && !isNaN(Number(score)) && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-600/15 via-indigo-600/15 to-emerald-600/15 border border-violet-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-violet-300 block">
                          Total Marks (Score + Grace)
                        </span>
                        <div className="text-xs text-gray-400 mt-0.5">
                          <span>Base: <strong className="text-white">{parsedScore}</strong></span>
                          {parsedGrace > 0 && (
                            <span className="text-emerald-400"> + Grace: <strong>{parsedGrace}</strong></span>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl font-black text-emerald-400 drop-shadow-sm">
                        {totalMarks} pts
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || score === ''}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
                  >
                    {submitting ? (
                      <span>Saving Score...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Score</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
