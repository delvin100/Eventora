import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  Users,
  Check,
  X,
  Clock,
  Trophy,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Radio,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import EventoraLogo from '../components/EventoraLogo';
import { quizRealtimeService } from '../services/quizRealtimeService';
import MediaViewer from '../components/quiz/MediaViewer';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const OPTION_COLORS = [
  { bg: 'bg-rose-500 hover:bg-rose-600', text: 'text-white', badge: 'bg-rose-700' },
  { bg: 'bg-sky-500 hover:bg-sky-600', text: 'text-white', badge: 'bg-sky-700' },
  { bg: 'bg-amber-500 hover:bg-amber-600', text: 'text-white', badge: 'bg-amber-700' },
  { bg: 'bg-emerald-500 hover:bg-emerald-600', text: 'text-white', badge: 'bg-emerald-700' }
];

export default function QuizParticipantPage() {
  const { pin: paramPin } = useParams();
  const [searchParams] = useSearchParams();

  // Initial State from URL / Storage
  const initialPin = paramPin || searchParams.get('pin') || '';
  const [pin, setPin] = useState(initialPin);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('eventora_player_name') || '');
  const [playerId] = useState(() => {
    let id = localStorage.getItem('eventora_player_id');
    if (!id) {
      id = 'p_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('eventora_player_id', id);
    }
    return id;
  });

  // Connection State
  const [hasJoined, setHasJoined] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Live Room State synced from Host
  const [roomState, setRoomState] = useState({
    status: 'LOBBY', // 'LOBBY' | 'QUESTION_ACTIVE' | 'ANSWER_REVEALED' | 'LEADERBOARD' | 'FINISHED'
    quizTitle: 'Live Quiz',
    round: 1,
    questionNumber: 1,
    totalQuestions: 1,
    question: null,
    timeLeft: null,
    revealed: false,
    correctIndex: null
  });

  // Local Participant Play State
  const [selectedOption, setSelectedOption] = useState(null); // opt index picked
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [lastRoundResult, setLastRoundResult] = useState(null); // { isCorrect, points }
  const [localTimer, setLocalTimer] = useState(null);

  // Join Room Handler
  const handleJoin = (e) => {
    if (e) e.preventDefault();
    if (!pin.trim() || pin.trim().length < 4) {
      setJoinError('Please enter a valid 6-digit Room PIN.');
      return;
    }
    if (!playerName.trim()) {
      setJoinError('Please enter your name.');
      return;
    }

    setJoinError('');
    localStorage.setItem('eventora_player_name', playerName.trim());

    // Connect to realtime channel
    quizRealtimeService.joinRoom(pin.trim(), 'participant', { id: playerId, name: playerName.trim() });

    // Announce to Host that player joined
    quizRealtimeService.broadcast('PLAYER_JOINED', {
      id: playerId,
      name: playerName.trim()
    });

    setHasJoined(true);
  };

  // Auto-join if PIN is already present and name is stored
  useEffect(() => {
    if (initialPin && playerName) {
      handleJoin();
    }
  }, []);

  // Listen to Host Broadcasts
  useEffect(() => {
    if (!hasJoined) return;

    // Listen for room state changes from the Quiz Master
    const unsubState = quizRealtimeService.on('STATE_UPDATE', (data) => {
      if (!data) return;

      setRoomState((prev) => {
        const isNewQuestion = data.questionNumber !== prev.questionNumber || data.status === 'QUESTION_ACTIVE';
        if (data.status === 'QUESTION_ACTIVE' && isNewQuestion && prev.status !== 'QUESTION_ACTIVE') {
          // Reset local selection for the new question
          setSelectedOption(null);
          setIsAnswerLocked(false);
          setLastRoundResult(null);
          setLocalTimer(data.timeLeft || 20);
        }

        if (data.status === 'ANSWER_REVEALED' && data.revealed) {
          // Timer reached 0 or host revealed
          setLocalTimer(0);
        }

        return { ...prev, ...data };
      });
    });

    // Listen for host answer acknowledgment
    const unsubAck = quizRealtimeService.on('ANSWER_ACKNOWLEDGED', (data) => {
      if (data?.participantId === playerId) {
        setTotalScore((prev) => prev + (Number(data.pointsAwarded) || 0));
        setLastRoundResult({
          isCorrect: Boolean(data.isCorrect),
          points: Number(data.pointsAwarded) || 0
        });
      }
    });

    return () => {
      unsubState();
      unsubAck();
    };
  }, [hasJoined, playerId]);

  // Local Countdown Timer
  useEffect(() => {
    if (roomState.status !== 'QUESTION_ACTIVE' || localTimer === null || localTimer <= 0) return;

    const timer = setInterval(() => {
      setLocalTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roomState.status, localTimer]);

  // Submit Answer
  const handleSelectOption = (optIdx) => {
    if (isAnswerLocked || roomState.status !== 'QUESTION_ACTIVE' || localTimer === 0) return;

    setSelectedOption(optIdx);
    setIsAnswerLocked(true);

    // Broadcast submission to Host
    quizRealtimeService.broadcast('SUBMIT_ANSWER', {
      participantId: playerId,
      participantName: playerName,
      selectedOptionIdx: optIdx,
      timeElapsed: (roomState.question?.timeLimit || 20) - (localTimer || 0)
    });
  };

  // Celebration on correct answer reveal
  useEffect(() => {
    if (roomState.status === 'ANSWER_REVEALED' && lastRoundResult?.isCorrect) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    }
  }, [roomState.status, lastRoundResult]);

  // =========================================================================
  // VIEW 1: JOIN FORM (if not yet in room)
  // =========================================================================
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-8 space-y-6 shadow-xl text-center">
          <div className="flex justify-center">
            <EventoraLogo size="md" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Join Live Quiz</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter the Room PIN shown on the main screen.</p>
          </div>

          {joinError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Room PIN (6 Digits)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 482910"
                className="w-full px-4 py-3 text-center text-2xl font-black font-mono tracking-widest rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141F] text-gray-900 dark:text-white focus:outline-none focus:border-[#635BFF]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Your Nickname
              </label>
              <input
                type="text"
                maxLength={30}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141F] text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#635BFF]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Join Arena</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOBBY (waiting for host to start)
  // =========================================================================
  if (roomState.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] flex flex-col justify-between p-4 max-w-md mx-auto">
        {/* Top Player Status */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Connected</span>
          </div>
          <span className="text-xs font-mono font-bold text-gray-400">PIN: {pin}</span>
        </div>

        {/* Center Welcome Card */}
        <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-8 text-center space-y-4 shadow-sm my-auto">
          <div className="w-16 h-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto font-black text-2xl shadow-inner">
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">You're in, {playerName}!</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Look up at the host screen. The quiz will start shortly!
            </p>
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-bold animate-pulse">
              <Radio className="w-4 h-4 text-violet-500" />
              <span>Waiting for Quiz Master to start...</span>
            </div>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center py-4 text-[11px] text-gray-400">
          Powered by Eventora Live Arena
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: QUESTION ACTIVE & ANSWER SUBMITTED
  // =========================================================================
  const { question, questionNumber, totalQuestions, status, revealed, correctIndex } = roomState;
  const isQuestionActive = status === 'QUESTION_ACTIVE';
  const isRevealed = status === 'ANSWER_REVEALED';

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] flex flex-col justify-between p-4 max-w-lg mx-auto space-y-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-black text-xs">
            Q {questionNumber} / {totalQuestions}
          </span>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
            {playerName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Live countdown badge */}
          {isQuestionActive && (
            <span className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black ${
              localTimer !== null && localTimer <= 5
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{localTimer !== null ? `${localTimer}s` : ''}</span>
            </span>
          )}

          {/* Current Score Badge */}
          <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black text-xs">
            {totalScore} pts
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 flex-1 flex flex-col justify-center">
        {/* Question Header & Media */}
        {question && (
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-5 shadow-sm text-center space-y-2">
            {question.mediaUrl && (
              <div className="rounded-2xl overflow-hidden mb-3">
                <MediaViewer
                  mediaUrl={question.mediaUrl}
                  mediaType={question.mediaType || 'image'}
                  className="w-full max-h-[200px]"
                />
              </div>
            )}
            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-snug">
              {question.text}
            </h3>
          </div>
        )}

        {/* FEEDBACK BANNER (If Answer Revealed by Host) */}
        {isRevealed && (
          <div className="animate-in zoom-in-95 duration-200">
            {(() => {
              const didAnswer = selectedOption !== null;
              const isCorrect = didAnswer && selectedOption === correctIndex;

              if (isCorrect) {
                return (
                  <div className="p-4 rounded-3xl bg-emerald-500 text-white text-center space-y-1 shadow-lg shadow-emerald-500/25">
                    <div className="flex items-center justify-center gap-2 font-black text-lg">
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Correct Answer!</span>
                    </div>
                    <p className="text-xs font-bold opacity-90">
                      +{question?.marks || 1} points awarded
                    </p>
                  </div>
                );
              }

              if (didAnswer && !isCorrect) {
                return (
                  <div className="p-4 rounded-3xl bg-rose-500 text-white text-center space-y-1 shadow-lg shadow-rose-500/25">
                    <div className="flex items-center justify-center gap-2 font-black text-lg">
                      <XCircle className="w-6 h-6" />
                      <span>Wrong Answer</span>
                    </div>
                    <p className="text-xs font-bold opacity-90">
                      0 points (Correct was: Option {OPTION_LETTERS[correctIndex]})
                    </p>
                  </div>
                );
              }

              // Timeout / Did not answer
              return (
                <div className="p-4 rounded-3xl bg-gray-600 text-white text-center space-y-1 shadow-lg">
                  <div className="flex items-center justify-center gap-2 font-black text-lg">
                    <Clock className="w-6 h-6" />
                    <span>Time's Up!</span>
                  </div>
                  <p className="text-xs font-bold opacity-90">
                    No answer submitted (0 points)
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Lock Notice if answer is submitted and waiting */}
        {isAnswerLocked && isQuestionActive && (
          <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-center text-xs font-bold animate-pulse flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-violet-600" />
            <span>Answer locked in! Waiting for timer / results...</span>
          </div>
        )}

        {/* Mobile-Friendly Options Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(question?.options || []).map((opt, optIdx) => {
            const isSelected = selectedOption === optIdx;
            const isCorrect = isRevealed && optIdx === correctIndex;
            const isWrongPick = isRevealed && isSelected && optIdx !== correctIndex;
            const color = OPTION_COLORS[optIdx % OPTION_COLORS.length];

            let buttonClass = `${color.bg} text-white shadow-md active:scale-98`;

            if (isAnswerLocked && !isRevealed) {
              buttonClass = isSelected
                ? 'bg-violet-600 text-white ring-4 ring-violet-300 dark:ring-violet-800 shadow-lg scale-102 font-black'
                : 'opacity-40 bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed';
            }

            if (isRevealed) {
              if (isCorrect) {
                buttonClass = 'bg-emerald-600 text-white ring-4 ring-emerald-300 dark:ring-emerald-800 font-black shadow-lg';
              } else if (isWrongPick) {
                buttonClass = 'bg-rose-600 text-white opacity-70 line-through';
              } else {
                buttonClass = 'opacity-30 bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed';
              }
            }

            return (
              <button
                key={optIdx}
                type="button"
                disabled={isAnswerLocked || !isQuestionActive || localTimer === 0}
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full min-h-[64px] p-4 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${buttonClass}`}
              >
                <span className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center font-black text-sm shrink-0">
                  {OPTION_LETTERS[optIdx]}
                </span>
                <span className="text-left font-bold text-sm sm:text-base leading-snug flex-1">
                  {opt.text}
                </span>
                {isSelected && (
                  <Check className="w-5 h-5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Status */}
      <div className="text-center py-2 text-[11px] text-gray-400">
        Score updates live after every question
      </div>
    </div>
  );
}

