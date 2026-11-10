import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Play,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Award,
  Sparkles,
  QrCode,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Check,
  X,
  HelpCircle,
  Eye,
  BarChart3,
  Flame,
  Radio
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { quizService } from '../services/quizService';
import { quizRealtimeService, generateRoomPin } from '../services/quizRealtimeService';
import { slugify } from '../utils/slugUtils';
import MediaViewer from '../components/quiz/MediaViewer';
import QRCode from 'qrcode';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const OPTION_COLORS = [
  { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-300 dark:border-rose-800', badge: 'bg-rose-600 text-white', bar: 'bg-rose-500' },
  { bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-300 dark:border-sky-800', badge: 'bg-sky-600 text-white', bar: 'bg-sky-500' },
  { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-800', badge: 'bg-amber-600 text-white', bar: 'bg-amber-500' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-800', badge: 'bg-emerald-600 text-white', bar: 'bg-emerald-500' }
];

export default function QuizLiveHostPage() {
  const { user } = useAuth();
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Session State
  const [roomPin, setRoomPin] = useState(() => {
    return sessionStorage.getItem(`eventora_live_pin_${quizId}`) || generateRoomPin();
  });
  const [quizState, setQuizState] = useState('LOBBY'); // 'LOBBY' | 'QUESTION_ACTIVE' | 'ANSWER_REVEALED' | 'LEADERBOARD' | 'FINISHED'
  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Participants & Live Answers
  const [participants, setParticipants] = useState([]); // [{ id, name, score, correctCount, answers: [] }]
  const [currentAnswers, setCurrentAnswers] = useState({}); // { [participantId]: { optionIdx, timeElapsed, isCorrect, points } }

  // Question Timer
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Target join URL for participants
  const joinUrl = `https://eventoraaa.vercel.app/quiz/join?pin=${roomPin}`;

  // Pre-generate QR code immediately with 0ms delay
  useEffect(() => {
    if (roomPin) {
      QRCode.toDataURL(joinUrl, {
        margin: 1,
        width: 240,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate local QR:', err));
    }
  }, [roomPin, joinUrl]);

  // Load quiz data
  useEffect(() => {
    async function loadQuizData() {
      try {
        setLoading(true);
        const targetId = location.state?.quizId || quizId;
        const data = await quizService.getQuizById(targetId);
        if (!data) throw new Error('Quiz not found');
        setQuiz(data);
        setCurrentRound(data.currentRound || 1);
      } catch (err) {
        console.error('Failed to load quiz:', err);
        setError(err.message || 'Quiz could not be loaded');
      } finally {
        setLoading(false);
      }
    }
    loadQuizData();
  }, [quizId]);

  // Active round & questions
  const activeRoundObj = quiz?.rounds?.find(r => r.roundNumber === currentRound) || quiz?.rounds?.[0];
  const questionsList = Array.isArray(activeRoundObj?.questions) ? activeRoundObj.questions : (quiz?.questions || []);
  const activeQuestion = questionsList[currentQuestionIdx] || null;

  // Real-time setup
  useEffect(() => {
    if (!roomPin) return;
    sessionStorage.setItem(`eventora_live_pin_${quizId}`, roomPin);

    // Join room as Host
    quizRealtimeService.joinRoom(roomPin, 'host');

    // Handle new player joining
    const unsubJoin = quizRealtimeService.on('PLAYER_JOINED', (player) => {
      if (!player?.id || !player?.name) return;
      setParticipants((prev) => {
        const exists = prev.find((p) => p.id === player.id);
        if (exists) return prev;
        return [...prev, { id: player.id, name: player.name, score: 0, correctCount: 0, answers: [] }];
      });

      // Broadcast current room state back to the new player
      broadcastCurrentState();
    });

    // Handle player answer submission
    const unsubAnswer = quizRealtimeService.on('SUBMIT_ANSWER', (submission) => {
      handleParticipantSubmission(submission);
    });

    return () => {
      unsubJoin();
      unsubAnswer();
    };
  }, [roomPin, quizState, currentQuestionIdx, currentRound, activeQuestion]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Broadcast state helper
  const broadcastCurrentState = useCallback((overrideState = {}) => {
    if (!activeQuestion && quizState !== 'LOBBY' && quizState !== 'FINISHED') return;

    const sanitizedQuestion = activeQuestion ? {
      text: activeQuestion.text,
      mediaUrl: activeQuestion.mediaUrl,
      mediaType: activeQuestion.mediaType,
      marks: Number(activeQuestion.marks) || 1,
      timeLimit: Number(activeQuestion.timeLimit) || 20,
      options: (activeQuestion.options || []).map((opt, i) => {
        const text = typeof opt === 'string' ? opt : opt?.text;
        return { text: text || `Option ${OPTION_LETTERS[i]}`, index: i };
      })
    } : null;

    const payload = {
      pin: roomPin,
      quizTitle: quiz?.name || 'Live Quiz',
      status: overrideState.status || quizState,
      round: currentRound,
      questionNumber: currentQuestionIdx + 1,
      totalQuestions: questionsList.length,
      question: sanitizedQuestion,
      timeLeft: overrideState.timeLeft !== undefined ? overrideState.timeLeft : timeLeft,
      // Only reveal correct answer if in ANSWER_REVEALED or later
      revealed: overrideState.revealed !== undefined ? overrideState.revealed : (quizState === 'ANSWER_REVEALED' || quizState === 'LEADERBOARD'),
      correctIndex: (quizState === 'ANSWER_REVEALED' || quizState === 'LEADERBOARD' || overrideState.revealed)
        ? getCorrectOptionIndex(activeQuestion)
        : null
    };

    quizRealtimeService.broadcast('STATE_UPDATE', payload);
  }, [roomPin, quiz?.name, quizState, currentRound, currentQuestionIdx, questionsList.length, activeQuestion, timeLeft]);

  // Helper to determine the correct option index
  function getCorrectOptionIndex(q) {
    if (!q || !Array.isArray(q.options)) return 0;
    const idx = q.options.findIndex((opt) => typeof opt === 'object' && opt?.isCorrect);
    return idx >= 0 ? idx : (Number(q.correct_index) || 0);
  }

  // Handle participant answer evaluation
  const handleParticipantSubmission = useCallback((submission) => {
    const { participantId, selectedOptionIdx, timeElapsed } = submission;
    if (!participantId || selectedOptionIdx === undefined || !activeQuestion) return;

    setCurrentAnswers((prev) => {
      if (prev[participantId]) return prev; // Already submitted

      const correctIdx = getCorrectOptionIndex(activeQuestion);
      const isCorrect = Number(selectedOptionIdx) === correctIdx;
      // SCORING RULE: Correct = question marks (default 1 or set marks), Wrong = 0 points
      const points = isCorrect ? (Number(activeQuestion.marks) || 1) : 0;

      // Update participant score in master list
      setParticipants((pList) =>
        pList.map((p) => {
          if (p.id === participantId) {
            return {
              ...p,
              score: p.score + points,
              correctCount: p.correctCount + (isCorrect ? 1 : 0),
              answers: [...p.answers, { questionIdx: currentQuestionIdx, isCorrect, points, timeElapsed }]
            };
          }
          return p;
        })
      );

      // Acknowledge back to participant with their live result
      quizRealtimeService.broadcast('ANSWER_ACKNOWLEDGED', {
        participantId,
        isCorrect,
        pointsAwarded: points,
        correctIdx: null // Kept hidden until host reveals
      });

      return {
        ...prev,
        [participantId]: { selectedOptionIdx, timeElapsed, isCorrect, points }
      };
    });
  }, [activeQuestion, currentQuestionIdx]);

  // Check if all players answered
  useEffect(() => {
    if (quizState === 'QUESTION_ACTIVE' && participants.length > 0) {
      const answeredCount = Object.keys(currentAnswers).length;
      if (answeredCount >= participants.length) {
        // Everyone has answered! Auto-reveal
        revealAnswer();
      }
    }
  }, [currentAnswers, participants.length, quizState]);

  // Timer loop
  useEffect(() => {
    if (quizState !== 'QUESTION_ACTIVE' || timeLeft === null) return;

    if (timeLeft <= 0) {
      revealAnswer();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          revealAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [quizState, timeLeft]);

  // Action: Start Question
  const startQuestion = (qIdx = currentQuestionIdx) => {
    const q = questionsList[qIdx];
    if (!q) return;

    setCurrentQuestionIdx(qIdx);
    setCurrentAnswers({});
    const limit = Number(q.timeLimit) > 0 ? Number(q.timeLimit) : 20;
    setTimeLeft(limit);
    setQuizState('QUESTION_ACTIVE');

    broadcastCurrentState({
      status: 'QUESTION_ACTIVE',
      timeLeft: limit,
      revealed: false
    });
  };

  // Action: Reveal Answer
  const revealAnswer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(0);
    setQuizState('ANSWER_REVEALED');

    const correctIdx = getCorrectOptionIndex(activeQuestion);

    // Broadcast answer reveal to all devices
    quizRealtimeService.broadcast('STATE_UPDATE', {
      pin: roomPin,
      status: 'ANSWER_REVEALED',
      revealed: true,
      correctIndex: correctIdx
    });

    if (soundEnabled) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  // Action: Show Leaderboard
  const showLeaderboard = () => {
    setQuizState('LEADERBOARD');
    broadcastCurrentState({ status: 'LEADERBOARD' });
  };

  // Action: Next Question
  const handleNextQuestion = () => {
    if (currentQuestionIdx < questionsList.length - 1) {
      startQuestion(currentQuestionIdx + 1);
    } else {
      // Quiz finished
      setQuizState('FINISHED');
      broadcastCurrentState({ status: 'FINISHED' });
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 }
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Loading Live Arena...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 text-center space-y-4">
        <p className="text-sm text-red-500 font-bold">{error || 'Quiz not found'}</p>
        <Link to="/home/quiz" className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold inline-block">
          Return to Quizzes
        </Link>
      </div>
    );
  }

  const correctIdx = getCorrectOptionIndex(activeQuestion);
  const answeredCount = Object.keys(currentAnswers).length;
  const totalPlayers = participants.length;

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#F7F8FC] dark:bg-[#0F1117] p-6 overflow-y-auto' : ''}`}>
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-gray-200 dark:border-gray-800">
        {/* Breadcrumb Navigation as shown in image */}
        <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Link
            to={location.state?.fromAdminAllQuizzes ? "/home/admin/quizzes" : "/home/quiz"}
            className="hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {location.state?.fromAdminAllQuizzes ? "All User Quizzes" : "All Quizzes"}
          </Link>
          <span>/</span>
          <Link
            to={`/home/quiz/${slugify(quiz.name)}`}
            state={{ quizId: quiz.id, fromAdminAllQuizzes: location.state?.fromAdminAllQuizzes }}
            className="hover:text-[#635BFF] transition-colors truncate max-w-[200px]"
          >
            {quiz.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-bold">Live Arena</span>
        </nav>

        {/* Room PIN Pill & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-black shadow-xs">
            <span className="text-gray-400 uppercase text-[10px]">PIN</span>
            <span className="text-base tracking-widest font-mono text-[#635BFF] dark:text-[#A59EFF]">{roomPin}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="p-2 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Show Join Link & QR"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ===================== STATE 1: LOBBY ===================== */}
      {quizState === 'LOBBY' && (
        <div className="space-y-8 max-w-4xl mx-auto py-6 animate-in fade-in duration-200">
          {/* Big Join Hero Banner (Stylish Modern Glassmorphism) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#2A1B6B] to-[#161435] border-2 border-violet-500/40 text-white p-8 sm:p-12 text-center space-y-7 shadow-2xl shadow-indigo-950/60">
            {/* Ambient background glow orbs */}
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-violet-500/20 text-violet-200 border border-violet-400/30 backdrop-blur-md shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Participants Join on Devices</span>
              </div>

              {/* Headline & Link */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-violet-300/80">
                  Join The Arena At
                </p>
                <div className="inline-block px-5 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
                  <span className="text-xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight bg-gradient-to-r from-white via-violet-100 to-indigo-200 bg-clip-text text-transparent">
                    eventoraaa.vercel.app/quiz/join
                  </span>
                </div>
              </div>

              {/* Big Room PIN display */}
              <div className="pt-2 flex flex-col items-center justify-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-violet-300">
                  Room Code
                </span>
                <div className="px-8 py-3.5 rounded-2xl bg-black/40 border-2 border-violet-500/50 backdrop-blur-md shadow-2xl shadow-violet-950/60 ring-4 ring-violet-500/10">
                  <span className="text-4xl sm:text-6xl font-black font-mono tracking-[0.2em] bg-gradient-to-r from-amber-300 via-white to-violet-200 bg-clip-text text-transparent">
                    {roomPin}
                  </span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-1 flex items-center justify-center gap-4 relative z-10">
              <button
                type="button"
                onClick={() => startQuestion(0)}
                disabled={questionsList.length === 0}
                className={`py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-xl ${
                  questionsList.length === 0
                    ? 'bg-white/10 text-white/40 border border-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/40 hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-white/20'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Live Quiz ({questionsList.length} Questions)</span>
              </button>
            </div>
          </div>

          {/* Connected Players Lobby Grid */}
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Players in Lobby ({participants.length})
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">Waiting for players to join...</span>
            </div>

            {participants.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="font-semibold">No participants connected yet.</p>
                <p>Have players scan the QR code or enter the Room PIN on their phones.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {participants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/80 text-center space-y-1 animate-in zoom-in-95 duration-150"
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-600 text-white font-black text-xs flex items-center justify-center mx-auto shadow-xs">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== STATE 2 & 3: QUESTION & REVEAL ===================== */}
      {(quizState === 'QUESTION_ACTIVE' || quizState === 'ANSWER_REVEALED') && activeQuestion && (
        <div className="space-y-6 max-w-5xl mx-auto py-2 animate-in fade-in duration-200">
          {/* Top Status Bar: Question Progress & Timer */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-[#161925] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-extrabold text-xs">
                Question {currentQuestionIdx + 1} of {questionsList.length}
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                +{activeQuestion.marks || 1} pts
              </span>
            </div>

            {/* Answered counter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4 text-[#635BFF]" />
                <span>
                  <strong className="text-base text-gray-900 dark:text-white">{answeredCount}</strong> / {totalPlayers} Answered
                </span>
              </div>

              {/* Countdown Timer */}
              {quizState === 'QUESTION_ACTIVE' && (
                <div
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-black ${
                    timeLeft !== null && timeLeft <= 5
                      ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                      : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{timeLeft}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Media Attachment if provided */}
          {activeQuestion.mediaUrl && (
            <div className="rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] shadow-sm max-h-[360px] flex items-center justify-center p-2">
              <MediaViewer
                mediaUrl={activeQuestion.mediaUrl}
                mediaType={activeQuestion.mediaType || 'image'}
                className="w-full max-h-[340px] rounded-2xl"
              />
            </div>
          )}

          {/* Question Text Card */}
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm text-center space-y-3">
            <h2 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white leading-relaxed">
              {activeQuestion.text || `Question ${currentQuestionIdx + 1}`}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(activeQuestion.options || []).map((opt, optIdx) => {
              const optText = typeof opt === 'string' ? opt : (opt?.text || `Option ${OPTION_LETTERS[optIdx]}`);
              const isOptionCorrect = optIdx === correctIdx;
              const style = OPTION_COLORS[optIdx % OPTION_COLORS.length];

              // Calculate response count for this option
              const votersForThisOpt = Object.values(currentAnswers).filter(a => a.selectedOptionIdx === optIdx).length;
              const votePercentage = totalPlayers > 0 ? Math.round((votersForThisOpt / totalPlayers) * 100) : 0;

              const isRevealed = quizState === 'ANSWER_REVEALED';

              let cardStyle = `${style.bg} ${style.border}`;
              if (isRevealed) {
                if (isOptionCorrect) {
                  cardStyle = 'bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 ring-4 ring-emerald-500/20';
                } else {
                  cardStyle = 'opacity-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
                }
              }

              return (
                <div
                  key={optIdx}
                  className={`relative p-5 rounded-3xl border transition-all space-y-3 ${cardStyle}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${
                        isRevealed && isOptionCorrect ? 'bg-emerald-600 text-white' : style.badge
                      }`}>
                        {OPTION_LETTERS[optIdx]}
                      </span>
                      <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
                        {optText}
                      </p>
                    </div>

                    {isRevealed && isOptionCorrect && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xs shrink-0">
                        <Check className="w-4 h-4" />
                        <span>CORRECT</span>
                      </span>
                    )}
                  </div>

                  {/* Vote percentage bar on reveal */}
                  {isRevealed && (
                    <div className="pt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                        <span>{votersForThisOpt} answer{votersForThisOpt === 1 ? '' : 's'}</span>
                        <span>{votePercentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isOptionCorrect ? 'bg-emerald-500' : 'bg-gray-400'}`}
                          style={{ width: `${votePercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Host Controls Bottom Bar */}
          <div className="pt-4 flex items-center justify-between gap-4 flex-wrap border-t border-gray-200 dark:border-gray-800">
            <div>
              {quizState === 'QUESTION_ACTIVE' && (
                <button
                  type="button"
                  onClick={revealAnswer}
                  className="py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Reveal Answer Early</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {quizState === 'ANSWER_REVEALED' && (
                <>
                  <button
                    type="button"
                    onClick={showLeaderboard}
                    className="py-3 px-6 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <BarChart3 className="w-4 h-4 text-violet-500" />
                    <span>View Rankings</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="py-3 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-violet-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <span>{currentQuestionIdx < questionsList.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== STATE 4: LEADERBOARD ===================== */}
      {quizState === 'LEADERBOARD' && (
        <div className="space-y-6 max-w-4xl mx-auto py-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-black">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Live Leaderboard</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Current standings after Question {currentQuestionIdx + 1}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextQuestion}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-violet-500/25 cursor-pointer"
            >
              <span>{currentQuestionIdx < questionsList.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Standings Table */}
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px] bg-gray-50/50 dark:bg-gray-800/20">
                  <th className="py-3.5 px-4 w-16">Rank</th>
                  <th className="py-3.5 px-4">Participant Name</th>
                  <th className="py-3.5 px-4 text-center">Correct Answers</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...participants]
                  .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.correctCount || 0) - (a.correctCount || 0))
                  .map((p, idx) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="py-3.5 px-4 font-black">
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-gray-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-center text-gray-500 dark:text-gray-400 font-semibold">
                        {p.correctCount} / {currentQuestionIdx + 1}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-block px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-[#635BFF] dark:text-[#A59EFF] font-black text-xs">
                          {p.score || 0} pts
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== STATE 5: FINISHED ===================== */}
      {quizState === 'FINISHED' && (
        <div className="space-y-8 max-w-4xl mx-auto py-6 text-center animate-in zoom-in-95 duration-200">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white space-y-4 shadow-2xl shadow-orange-500/25">
            <Trophy className="w-16 h-16 mx-auto animate-bounce text-amber-200" />
            <h1 className="text-3xl sm:text-5xl font-black">Quiz Completed!</h1>
            <p className="text-sm font-semibold opacity-90 max-w-md mx-auto">
              All questions have been evaluated. Congratulations to all participants!
            </p>
          </div>

          {/* Final Top 3 Podium */}
          {(() => {
            const sorted = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));
            const winner = sorted[0];
            return (
              <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  👑 Grand Winner
                </h3>
                {winner ? (
                  <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 inline-block space-y-2 min-w-[280px]">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
                      🥇
                    </div>
                    <h4 className="text-xl font-black text-gray-900 dark:text-white">{winner.name}</h4>
                    <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{winner.score} pts</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No participants played.</p>
                )}

                <div className="pt-4 flex items-center justify-center gap-3">
                  <Link
                    to={`/home/quiz/${quiz.id}`}
                    className="py-3 px-6 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs uppercase tracking-wider"
                  >
                    Back to Quiz Hub
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">Join via QR or Code</h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Scan this QR code to join directly:</p>
              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl border border-gray-200 shadow-inner flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Join QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-mono text-sm font-black">
              PIN: {roomPin}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

