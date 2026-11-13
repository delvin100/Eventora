import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Radio,
  Search,
  Ban
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { quizService } from '../services/quizService';
import { quizRealtimeService, generateRoomPin } from '../services/quizRealtimeService';
import { slugify } from '../utils/slugUtils';
import { computeStandings, getRankBadge, getRankEmoji } from '../utils/quizRankingUtils';
import MediaViewer from '../components/quiz/MediaViewer';
import ConfirmDialog from '../components/common/ConfirmDialog';
import QRCode from 'qrcode';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const OPTION_COLORS = [
  {
    badge: 'bg-rose-500 text-white',
    card: 'border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/70 dark:bg-rose-950/20 dark:border-rose-500/40 dark:hover:bg-rose-950/30',
    selected: 'bg-rose-600 text-white border-rose-500 ring-4 ring-rose-500/25 shadow-lg shadow-rose-600/20',
    bar: 'bg-rose-500'
  },
  {
    badge: 'bg-sky-500 text-white',
    card: 'border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/70 dark:bg-sky-950/20 dark:border-sky-500/40 dark:hover:bg-sky-950/30',
    selected: 'bg-sky-600 text-white border-sky-500 ring-4 ring-sky-500/25 shadow-lg shadow-sky-600/20',
    bar: 'bg-sky-500'
  },
  {
    badge: 'bg-yellow-400 text-gray-950 font-black',
    card: 'border-yellow-400/45 bg-yellow-400/5 hover:bg-yellow-400/10 hover:border-yellow-400/80 dark:bg-yellow-400/[0.06] dark:border-yellow-400/45 dark:hover:bg-yellow-400/15',
    selected: 'bg-yellow-400 text-gray-950 font-black border-yellow-300 ring-4 ring-yellow-400/30 shadow-lg shadow-yellow-400/25',
    bar: 'bg-yellow-400'
  },
  {
    badge: 'bg-emerald-500 text-white',
    card: 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/70 dark:bg-emerald-950/20 dark:border-emerald-500/40 dark:hover:bg-emerald-950/30',
    selected: 'bg-emerald-600 text-white border-emerald-500 ring-4 ring-emerald-500/25 shadow-lg shadow-emerald-600/20',
    bar: 'bg-emerald-500'
  }
];

function getCorrectOptionIndex(q) {
  if (!q || !Array.isArray(q.options)) return 0;
  const idx = q.options.findIndex((opt) => typeof opt === 'object' && opt?.isCorrect);
  return idx >= 0 ? idx : (Number(q.correct_index) || 0);
}

function checkTextAnswerCorrect(userAns, correctAns, acceptableAnswers = []) {
  if (!userAns) return false;
  const normalize = (str) =>
    String(str)
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');

  const normUser = normalize(userAns);
  if (!normUser) return false;

  const targets = [];
  if (correctAns) {
    String(correctAns)
      .split(/[\/;|,]/)
      .map(normalize)
      .filter(Boolean)
      .forEach(t => targets.push(t));
  }
  if (Array.isArray(acceptableAnswers)) {
    acceptableAnswers.forEach(alt => {
      if (alt) {
        String(alt)
          .split(/[\/;|,]/)
          .map(normalize)
          .filter(Boolean)
          .forEach(t => targets.push(t));
      }
    });
  }

  if (targets.length === 0) {
    return normUser === normalize(correctAns);
  }

  return targets.some((target) => {
    if (normUser === target) return true;
    if (target.length >= 3 && (normUser.includes(target) || target.includes(normUser))) {
      return true;
    }
    return false;
  });
}

export default function QuizLiveHostPage() {
  const { user } = useAuth();
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Host Session Persistence Helper
  const getHostSession = () => {
    try {
      const raw = sessionStorage.getItem(`eventora_live_host_session_${quizId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Session State
  const [roomPin, setRoomPin] = useState(() => {
    const saved = getHostSession();
    if (saved?.roomPin) return saved.roomPin;
    return sessionStorage.getItem(`eventora_live_pin_${quizId}`) || generateRoomPin();
  });
  const [quizState, setQuizState] = useState(() => {
    const saved = getHostSession();
    return saved?.quizState || 'LOBBY';
  });
  const [currentRound, setCurrentRound] = useState(() => {
    const saved = getHostSession();
    return typeof saved?.currentRound === 'number' ? saved.currentRound : 1;
  });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(() => {
    const saved = getHostSession();
    return typeof saved?.currentQuestionIdx === 'number' ? saved.currentQuestionIdx : 0;
  });

  // Participants & Live Answers (persist joined players across page refresh)
  const [participants, setParticipants] = useState(() => {
    const saved = getHostSession();
    if (Array.isArray(saved?.participants) && saved.participants.length > 0) {
      return saved.participants;
    }
    try {
      const pin = saved?.roomPin || sessionStorage.getItem(`eventora_live_pin_${quizId}`);
      if (pin) {
        const local = quizRealtimeService.loadSessionState(pin);
        if (Array.isArray(local?.participants) && local.participants.length > 0) {
          return local.participants;
        }
      }
    } catch (_) {}
    return [];
  });
  const [currentAnswers, setCurrentAnswers] = useState(() => {
    const saved = getHostSession();
    return saved?.currentAnswers || {};
  });

  // Question Timer
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const endTimeRef = useRef(null);
  const lastSeenMapRef = useRef(new Map());
  const removedPlayerIdsRef = useRef(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return Boolean(
      (typeof document !== 'undefined' && document.fullscreenElement) ||
      location.state?.fullscreen ||
      true
    );
  });

  // Keep isFullscreen in perfect sync with the browser's native fullscreen API (F11, Esc, button clicks)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut: Escape exits CSS fullscreen if not using native browser fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Automatically request browser native fullscreen on mount if not already in native fullscreen
  useEffect(() => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Silently handled if browser requires gesture; CSS fullscreen still covers full viewport
      });
    }
  }, []);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [lobbySearch, setLobbySearch] = useState('');

  const filteredLobbyParticipants = useMemo(() => {
    if (!lobbySearch.trim()) return participants;
    const q = lobbySearch.trim().toLowerCase();
    return participants.filter(p => p.name?.toLowerCase().includes(q));
  }, [participants, lobbySearch]);

  const [cancelledQuestionIndices, setCancelledQuestionIndices] = useState(() => new Set());

  // Reset Progress Dialog & Feedback States
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Permission check for reset action (same as QuizPlayPage / QuizHubPage)
  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';
  const isOwner = Boolean(user?.id && (quiz?.owner_id === user.id || quiz?.owner?.id === user.id));
  const canReset = isAdmin || isOwner || !user;

  // Target join URL for participants (dynamically embeds roomPin for instant 1-scan entry)
  const joinUrl = useMemo(() => {
    let origin = 'https://eventoraaa.vercel.app';
    if (typeof window !== 'undefined' && window.location?.origin) {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        origin = window.location.origin;
      }
    }
    return roomPin ? `${origin}/quiz/join?pin=${roomPin}` : `${origin}/quiz/join`;
  }, [roomPin]);

  // Refs for debouncing DB saves to handle 100+ concurrent answer submissions safely
  const pendingSaveTimeoutRef = useRef(null);
  const pendingParticipantsRef = useRef(null);

  const flushSaveToDb = useCallback(async (list, isFinished = false) => {
    if (!quiz?.id) return;
    const targetList = list || pendingParticipantsRef.current;
    if (!Array.isArray(targetList)) return;

    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    pendingParticipantsRef.current = null;

    try {
      const formatted = targetList.map((p) => ({
        id: p.id,
        name: p.name,
        score: Number(p.score) || 0,
        correct: Number(p.correctCount) || 0,
        turns: p.answers?.length || 0,
        answers: p.answers || []
      }));

      await quizService.updateQuiz(quiz.id, {
        participants: formatted,
        ...(isFinished ? { isFinished: true } : {})
      });
    } catch (err) {
      console.warn('Failed to sync live quiz participants to DB:', err);
    }
  }, [quiz?.id]);

  // Save live participants & their current scores to Supabase DB.
  // Debounced (2500ms) to safely batch 100+ concurrent answers/joins into a single write,
  // with immediate flush available on answer reveal or quiz finish.
  const saveParticipantsToDb = useCallback((updatedList, isFinished = false, immediate = false) => {
    if (!quiz?.id || !Array.isArray(updatedList)) return;
    pendingParticipantsRef.current = updatedList;

    if (immediate || isFinished) {
      return flushSaveToDb(updatedList, isFinished);
    }

    if (!pendingSaveTimeoutRef.current) {
      pendingSaveTimeoutRef.current = setTimeout(() => {
        pendingSaveTimeoutRef.current = null;
        if (pendingParticipantsRef.current) {
          flushSaveToDb(pendingParticipantsRef.current, false);
        }
      }, 2500);
    }
  }, [quiz?.id, flushSaveToDb]);

  // Flush pending DB writes on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveTimeoutRef.current && pendingParticipantsRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
        flushSaveToDb(pendingParticipantsRef.current, false);
      }
    };
  }, [flushSaveToDb]);

  // Persist host state into sessionStorage and localStorage on any change
  useEffect(() => {
    if (!quizId || !roomPin) return;
    try {
      const stateObj = {
        roomPin,
        quizState,
        currentRound,
        currentQuestionIdx,
        participants,
        currentAnswers
      };
      sessionStorage.setItem(`eventora_live_host_session_${quizId}`, JSON.stringify(stateObj));
      quizRealtimeService.saveSessionState(roomPin, stateObj);
    } catch (_) {}
  }, [quizId, roomPin, quizState, currentRound, currentQuestionIdx, participants, currentAnswers]);

  // Pre-generate QR code immediately with 0ms delay at high resolution for room scanning
  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      margin: 2,
      width: 720,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate local QR:', err));
  }, [joinUrl]);

  // Load quiz data
  useEffect(() => {
    async function loadQuizData() {
      try {
        setLoading(true);
        const targetId = location.state?.quizId || quizId;
        const data = await quizService.getQuizById(targetId);
        if (!data) throw new Error('Quiz not found');
        setQuiz(data);
        const savedSession = getHostSession();
        if (typeof savedSession?.currentRound === 'number') {
          setCurrentRound(savedSession.currentRound);
        } else if (data.currentRound) {
          setCurrentRound(Number(data.currentRound) || 1);
        } else {
          setCurrentRound(1);
        }
        // Note: Live Arena participants are ONLY populated when live players join with the PIN,
        // we deliberately do NOT preload the static spin-wheel students from data.participants.
      } catch (err) {
        console.error('Failed to load quiz:', err);
        setError(err.message || 'Quiz could not be loaded');
      } finally {
        setLoading(false);
      }
    }
    loadQuizData();
  }, [quizId]);

  // Active rounds & questions
  const roundsList = useMemo(() => {
    if (Array.isArray(quiz?.rounds) && quiz.rounds.length > 0) {
      return [...quiz.rounds].sort((a, b) => (Number(a.roundNumber) || 0) - (Number(b.roundNumber) || 0));
    }
    return [{ roundNumber: 1, name: 'Round 1', title: 'Round 1', questions: quiz?.questions || [] }];
  }, [quiz?.rounds, quiz?.questions]);

  const totalRounds = roundsList.length;
  const currentRoundIndex = Math.max(0, roundsList.findIndex(r => Number(r.roundNumber) === Number(currentRound)));
  const activeRoundObj = roundsList[currentRoundIndex] || roundsList[0];
  const questionsList = Array.isArray(activeRoundObj?.questions) ? activeRoundObj.questions : (quiz?.questions || []);
  const activeQuestion = questionsList[currentQuestionIdx] || null;

  const activeQuizType = activeRoundObj?.quizType || quiz?.quizType;
  const isRoundDirect = activeQuizType === 'answer_to_question';
  const isRoundTwoChances = activeQuizType === 'one_question_two_chances';
  const isDirectQuestion = isRoundDirect || activeQuestion?.format === 'direct' || (!activeQuestion?.options?.length && activeQuestion?.answer !== undefined);
  const isTwoChancesQuestion = isRoundTwoChances || activeQuestion?.format === 'mcq_2' || (activeQuestion?.secondTryMarks !== undefined && Number(activeQuestion?.secondTryMarks) > 0 && !isDirectQuestion);

  const hasNextQuestion = currentQuestionIdx < questionsList.length - 1;
  const hasNextRound = currentRoundIndex < roundsList.length - 1;
  const nextRoundObj = hasNextRound ? roundsList[currentRoundIndex + 1] : null;

  const totalQuizQuestions = useMemo(() => {
    return roundsList.reduce((sum, r) => sum + (Array.isArray(r.questions) ? r.questions.length : 0), 0) || questionsList.length;
  }, [roundsList, questionsList.length]);

  // Stable refs to prevent tearing down realtime channel on state changes
  const broadcastCurrentStateRef = useRef(null);
  const handleParticipantSubmissionRef = useRef(null);

  // Broadcast state helper
  const broadcastCurrentState = useCallback((overrideState = {}) => {
    const targetRound = overrideState.round !== undefined ? overrideState.round : currentRound;
    const targetRoundObj = roundsList.find(r => Number(r.roundNumber) === Number(targetRound)) || activeRoundObj;
    const targetQuestions = overrideState.questionsList || (Array.isArray(targetRoundObj?.questions) ? targetRoundObj.questions : questionsList);
    const qIdx = overrideState.questionNumber !== undefined ? overrideState.questionNumber - 1 : currentQuestionIdx;
    const currentQ = targetQuestions[qIdx] || activeQuestion;
    const activeQuizState = overrideState.status || quizState;
    if (!currentQ && activeQuizState !== 'LOBBY' && activeQuizState !== 'FINISHED' && activeQuizState !== 'ROUND_TRANSITION') return;

    const roundType = targetRoundObj?.quizType || quiz?.quizType;
    const qIsDirect = roundType === 'answer_to_question' || currentQ?.format === 'direct' || (!currentQ?.options?.length && currentQ?.answer !== undefined);
    const qIsTwoChances = roundType === 'one_question_two_chances' || currentQ?.format === 'mcq_2' || (currentQ?.secondTryMarks !== undefined && Number(currentQ?.secondTryMarks) > 0 && !qIsDirect);

    const sanitizedQuestion = currentQ ? {
      text: currentQ.text,
      mediaUrl: currentQ.mediaUrl,
      mediaType: currentQ.mediaType,
      marks: Number(currentQ.marks) || 1,
      secondTryMarks: currentQ.secondTryMarks !== undefined ? Number(currentQ.secondTryMarks) : undefined,
      timeLimit: Number(currentQ.timeLimit) || 20,
      format: qIsDirect ? 'direct' : 'mcq',
      isTwoChances: qIsTwoChances,
      options: qIsDirect ? [] : (currentQ.options || []).map((opt, i) => {
        const text = typeof opt === 'string' ? opt : opt?.text;
        return { text: text || `Option ${OPTION_LETTERS[i]}`, index: i };
      })
    } : null;

    const remainingTime = endTimeRef.current
      ? Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
      : (overrideState.timeLeft !== undefined ? overrideState.timeLeft : timeLeft);

    const activeParticipantsList = overrideState.participants || participants;
    const isAnswerRevealed = overrideState.revealed !== undefined ? overrideState.revealed : (quizState === 'ANSWER_REVEALED' || quizState === 'LEADERBOARD');

    const payload = {
      pin: roomPin,
      quizTitle: quiz?.name || 'Live Quiz',
      status: activeQuizState,
      round: targetRound,
      totalRounds: totalRounds,
      questionNumber: (qIdx >= 0 ? qIdx : 0) + 1,
      totalQuestions: targetQuestions.length,
      question: overrideState.question !== undefined ? overrideState.question : sanitizedQuestion,
      timeLeft: remainingTime,
      endTime: endTimeRef.current,
      // Reveal correct answer if in ANSWER_REVEALED or later
      revealed: isAnswerRevealed,
      correctIndex: (isAnswerRevealed && !qIsDirect)
        ? getCorrectOptionIndex(currentQ)
        : null,
      correctAnswer: isAnswerRevealed
        ? (currentQ?.answer || '')
        : null,
      acceptableAnswers: isAnswerRevealed
        ? (Array.isArray(currentQ?.acceptableAnswers) ? currentQ.acceptableAnswers.filter(Boolean) : [])
        : [],
      penaltyMarks: Number(currentQ?.penaltyMarks ?? activeRoundObj?.penaltyMarks ?? 0) || 0,
      secondTryPenaltyMarks: Number(currentQ?.secondTryPenaltyMarks ?? activeRoundObj?.secondTryPenaltyMarks ?? 0) || 0,
      unansweredPenaltyMarks: Number(currentQ?.unansweredPenaltyMarks ?? activeRoundObj?.unansweredPenaltyMarks ?? 0) || 0,
      leaderboard: computeStandings(
        activeParticipantsList.map((p) => ({
          id: p.id,
          name: p.name,
          score: Number(p.score) || 0,
          correctCount: Number(p.correctCount) || 0
        })),
        'correctCount'
      )
    };

    quizRealtimeService.broadcast('STATE_UPDATE', payload);
  }, [roomPin, quiz?.name, quiz?.quizType, quizState, currentRound, totalRounds, roundsList, activeRoundObj, currentQuestionIdx, questionsList, activeQuestion, timeLeft, participants]);

  broadcastCurrentStateRef.current = broadcastCurrentState;

  // Debounced broadcast helper for rapid participant joins/syncs in lobby
  const broadcastDebounceTimerRef = useRef(null);
  const debouncedBroadcastCurrentState = useCallback(() => {
    if (broadcastDebounceTimerRef.current) return;
    broadcastDebounceTimerRef.current = setTimeout(() => {
      broadcastDebounceTimerRef.current = null;
      broadcastCurrentStateRef.current?.();
    }, 180);
  }, []);

  // Real-time setup - Connect ONCE per roomPin
  useEffect(() => {
    if (!roomPin) return;
    sessionStorage.setItem(`eventora_live_pin_${quizId}`, roomPin);

    // Persist active room PIN locally for instant 0ms check on same browser
    try {
      localStorage.setItem(`eventora_active_pin_${roomPin}`, Date.now().toString());
    } catch (_) {}

    // Join room as Host
    quizRealtimeService.joinRoom(roomPin, 'host');

    // Handle instant room verification probe from participants
    const unsubCheckRoom = quizRealtimeService.on('CHECK_ROOM', (req) => {
      if (!req?.pin || req.pin === roomPin) {
        quizRealtimeService.broadcast('ROOM_VERIFIED', {
          pin: roomPin,
          valid: true,
          quizTitle: quiz?.name || 'Live Quiz',
          status: quizState
        });
      }
    });

    // Handle new player joining
    const unsubJoin = quizRealtimeService.on('PLAYER_JOINED', (player) => {
      if (!player?.id || !player?.name) return;
      removedPlayerIdsRef.current.delete(player.id);
      lastSeenMapRef.current.set(player.id, Date.now());
      setParticipants((prev) => {
        const exists = prev.find((p) => p.id === player.id);
        if (exists) return prev;
        const next = [...prev, { id: player.id, name: player.name, score: 0, correctCount: 0, answers: [] }];
        saveParticipantsToDb(next, false);
        return next;
      });

      // Broadcast current room state back to new players (debounced 180ms to batch concurrent joins)
      debouncedBroadcastCurrentState();
    });

    // Handle player leaving immediately on the spot
    const unsubLeave = quizRealtimeService.on('PLAYER_LEFT', (player) => {
      if (!player?.id) return;
      lastSeenMapRef.current.delete(player.id);
      setParticipants((prev) => {
        const exists = prev.find((p) => p.id === player.id);
        if (!exists) return prev;
        const next = prev.filter((p) => p.id !== player.id);
        saveParticipantsToDb(next, false);
        return next;
      });

      setTimeout(() => {
        broadcastCurrentStateRef.current?.();
      }, 50);
    });

    // Handle player request for synchronization
    const unsubSync = quizRealtimeService.on('REQUEST_SYNC', (req) => {
      quizRealtimeService.broadcast('ROOM_VERIFIED', {
        pin: roomPin,
        valid: true,
        quizTitle: quiz?.name || 'Live Quiz',
        status: quizState
      });

      if (req?.id && req?.name) {
        // If player was kicked/removed, tell them to leave immediately
        if (removedPlayerIdsRef.current.has(req.id)) {
          quizRealtimeService.broadcast('KICK_PARTICIPANT', { id: req.id, participantId: req.id });
          return;
        }

        lastSeenMapRef.current.set(req.id, Date.now());
        setParticipants((prev) => {
          const exists = prev.find((p) => p.id === req.id);
          if (exists) return prev;
          const next = [...prev, { id: req.id, name: req.name, score: 0, correctCount: 0, answers: [] }];
          saveParticipantsToDb(next, false);
          return next;
        });
      }
      debouncedBroadcastCurrentState();
    });

    // Handle player answer submission
    const unsubAnswer = quizRealtimeService.on('SUBMIT_ANSWER', (submission) => {
      handleParticipantSubmissionRef.current?.(submission);
    });

    return () => {
      try {
        localStorage.removeItem(`eventora_active_pin_${roomPin}`);
      } catch (_) {}
      if (broadcastDebounceTimerRef.current) {
        clearTimeout(broadcastDebounceTimerRef.current);
        broadcastDebounceTimerRef.current = null;
      }
      unsubJoin();
      unsubLeave();
      unsubSync();
      unsubAnswer();
      unsubCheckRoom();
    };
  }, [roomPin, saveParticipantsToDb, debouncedBroadcastCurrentState]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    } else if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    }
  };

  // Reset live quiz progress and purge all participant data from DB
  const handleResetLiveQuiz = async () => {
    if (!quiz?.id) return;
    try {
      setResetting(true);
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
        pendingSaveTimeoutRef.current = null;
      }
      pendingParticipantsRef.current = null;
      lastSeenMapRef.current.clear();
      await quizService.resetLiveQuizProgress(quiz.id);

      // Stop any active timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      endTimeRef.current = null;
      setTimeLeft(null);

      // Refresh room PIN and clear storage
      const newPin = generateRoomPin();
      setRoomPin(newPin);
      try {
        sessionStorage.removeItem(`eventora_live_host_session_${quizId}`);
        sessionStorage.setItem(`eventora_live_pin_${quizId}`, newPin);
        quizRealtimeService.clearSessionState(roomPin);
        quizRealtimeService.clearSessionState(newPin);
      } catch (_) {}

      // Reset host state
      setParticipants([]);
      setCurrentAnswers({});
      setCurrentQuestionIdx(0);
      setCurrentRound(1);
      setQuizState('LOBBY');

      // Broadcast reset event & state update to all connected participant devices
      broadcastCurrentState({
        pin: newPin,
        status: 'LOBBY',
        round: 1,
        questionNumber: 1,
        participants: [],
        leaderboard: []
      });
      quizRealtimeService.broadcast('RESET_QUIZ', { pin: newPin, status: 'LOBBY' });
      quizRealtimeService.broadcast('LOBBY_CLEARED', {});

      // Reload fresh quiz data from DB
      const freshQuiz = await quizService.getQuizById(quiz.id);
      if (freshQuiz) {
        setQuiz(freshQuiz);
      }

      setIsResetDialogOpen(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4500);
    } catch (err) {
      console.error('Failed to reset live quiz progress:', err);
      alert('Failed to reset quiz progress: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  // Clear lobby participants and reset live session cache
  const handleResetLobby = async () => {
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    pendingParticipantsRef.current = null;
    lastSeenMapRef.current.clear();
    removedPlayerIdsRef.current.clear();

    // Broadcast LOBBY_CLEARED to instantly remove all participants from their systems
    quizRealtimeService.broadcast('LOBBY_CLEARED', {});

    setParticipants([]);
    setCurrentAnswers({});
    try {
      sessionStorage.removeItem(`eventora_live_host_session_${quizId}`);
      quizRealtimeService.clearSessionState(roomPin);
    } catch (_) {}
    if (quiz?.id) {
      try {
        await quizService.updateQuiz(quiz.id, { participants: [] });
      } catch (_) {}
    }
    broadcastCurrentState({ status: 'LOBBY', leaderboard: [], participants: [] });
  };

  // Remove individual participant from live lobby and their system
  const handleRemoveParticipant = (idToRemove) => {
    lastSeenMapRef.current.delete(idToRemove);
    removedPlayerIdsRef.current.add(idToRemove);

    // Instantly remove participant from their system/device
    quizRealtimeService.broadcast('KICK_PARTICIPANT', { id: idToRemove, participantId: idToRemove });

    setParticipants((prev) => {
      const next = prev.filter((p) => p.id !== idToRemove);
      saveParticipantsToDb(next, false);
      return next;
    });

    setTimeout(() => {
      broadcastCurrentStateRef.current?.();
    }, 50);
  };

  // Answer deduplication guard per question
  const answeredSubmissionsRef = useRef(new Set());

  // Handle participant answer evaluation
  const handleParticipantSubmission = useCallback((submission) => {
    const { participantId, selectedOptionIdx, textAnswer, attempt = 1, timeElapsed } = submission;
    if (!participantId || !activeQuestion) return;
    if (selectedOptionIdx === undefined && (textAnswer === undefined || textAnswer === null)) return;

    const roundType = activeRoundObj?.quizType || quiz?.quizType;
    const qIsDirect = roundType === 'answer_to_question' || activeQuestion.format === 'direct' || (!activeQuestion.options?.length && activeQuestion.answer !== undefined);
    const qIsTwoChances = roundType === 'one_question_two_chances' || activeQuestion.format === 'mcq_2' || (activeQuestion.secondTryMarks !== undefined && Number(activeQuestion.secondTryMarks) > 0 && !qIsDirect);

    // Strict deduplication guard per question attempt
    const submissionKey = `${currentQuestionIdx}_${participantId}_${attempt}`;
    if (answeredSubmissionsRef.current.has(submissionKey)) {
      return;
    }
    answeredSubmissionsRef.current.add(submissionKey);

    const wrongPenalty = Number(activeQuestion.penaltyMarks) || Number(activeRoundObj?.defaultPenaltyMarks) || 0;
    const secondTryWrongPenalty = Number(activeQuestion.secondTryPenaltyMarks) || Number(activeRoundObj?.defaultSecondTryPenaltyMarks) || 0;

    let isCorrect = false;
    let points = 0;
    let isFinal = true;
    let canTryAgain = false;

    if (qIsDirect) {
      isCorrect = checkTextAnswerCorrect(
        textAnswer,
        activeQuestion.answer,
        activeQuestion.acceptableAnswers || activeQuestion.answers
      );
      points = isCorrect ? (Number(activeQuestion.marks) || 1) : (wrongPenalty > 0 ? -wrongPenalty : 0);
      isFinal = true;
    } else if (qIsTwoChances) {
      const correctIdx = getCorrectOptionIndex(activeQuestion);
      const isPickCorrect = Number(selectedOptionIdx) === correctIdx;

      if (attempt === 1) {
        if (isPickCorrect) {
          isCorrect = true;
          points = Number(activeQuestion.marks) || 1;
          isFinal = true;
        } else {
          isCorrect = false;
          points = wrongPenalty > 0 ? -wrongPenalty : 0;
          isFinal = false;
          canTryAgain = true;
        }
      } else {
        // Attempt 2
        isCorrect = isPickCorrect;
        const secondMarks = activeQuestion.secondTryMarks !== undefined ? Number(activeQuestion.secondTryMarks) : Math.max(1, Math.round((Number(activeQuestion.marks) || 1) / 2));
        points = isCorrect ? secondMarks : (secondTryWrongPenalty > 0 ? -secondTryWrongPenalty : 0);
        isFinal = true;
      }
    } else {
      // Standard MCQ (one_question_one_chance)
      const correctIdx = getCorrectOptionIndex(activeQuestion);
      isCorrect = Number(selectedOptionIdx) === correctIdx;
      points = isCorrect ? (Number(activeQuestion.marks) || 1) : (wrongPenalty > 0 ? -wrongPenalty : 0);
      isFinal = true;
    }

    // 1. Update participant score in master list & sync to DB if final or penalized
    let finalScore = points;
    if (isFinal || points !== 0) {
      setParticipants((pList) => {
        const next = pList.map((p) => {
          if (p.id === participantId) {
            finalScore = (Number(p.score) || 0) + points;
            return {
              ...p,
              score: finalScore,
              correctCount: (Number(p.correctCount) || 0) + (isCorrect ? 1 : 0),
              answers: [...(p.answers || []), { questionIdx: currentQuestionIdx, isCorrect, points, timeElapsed, textAnswer, selectedOptionIdx, attempt }]
            };
          }
          return p;
        });
        saveParticipantsToDb(next, false);
        return next;
      });
    }

    // 2. Save answer in currentAnswers for live dashboard
    setCurrentAnswers((prev) => ({
      ...prev,
      [participantId]: {
        participantId,
        participantName: submission.participantName || participants.find(p => p.id === participantId)?.name || 'Participant',
        selectedOptionIdx,
        textAnswer,
        attempt,
        timeElapsed,
        isCorrect,
        points,
        isFinal
      }
    }));

    // 3. Acknowledge back to participant with exact points awarded
    quizRealtimeService.broadcast('ANSWER_ACKNOWLEDGED', {
      participantId,
      isCorrect,
      attempt,
      isFinal,
      canTryAgain,
      secondTryMarks: activeQuestion.secondTryMarks !== undefined ? Number(activeQuestion.secondTryMarks) : 1,
      pointsAwarded: points,
      totalScore: finalScore,
      questionIdx: currentQuestionIdx,
      correctIdx: null
    });
  }, [activeQuestion, activeRoundObj, quiz?.quizType, currentQuestionIdx, participants, saveParticipantsToDb]);

  handleParticipantSubmissionRef.current = handleParticipantSubmission;

  // Toggle Direct Answer (Host Override for text evaluation)
  const handleToggleDirectAnswer = useCallback((participantId, forceCorrect) => {
    const ans = currentAnswers[participantId];
    if (!ans || !activeQuestion) return;

    const wrongPenalty = Number(activeQuestion.penaltyMarks) || Number(activeRoundObj?.defaultPenaltyMarks) || 0;
    const marksVal = Number(activeQuestion.marks) || 1;
    const pointsDiff = forceCorrect ? (marksVal + wrongPenalty) : -(marksVal + wrongPenalty);
    const newPoints = forceCorrect ? marksVal : (wrongPenalty > 0 ? -wrongPenalty : 0);
    if ((ans.isCorrect && forceCorrect) || (!ans.isCorrect && !forceCorrect)) return;

    let newTotalScore = 0;
    setParticipants((prev) => {
      const next = prev.map((p) => {
        if (p.id === participantId) {
          const updatedScore = (Number(p.score) || 0) + pointsDiff;
          const updatedCorrect = Math.max(0, (Number(p.correctCount) || 0) + (forceCorrect ? 1 : -1));
          newTotalScore = updatedScore;
          return {
            ...p,
            score: updatedScore,
            correctCount: updatedCorrect
          };
        }
        return p;
      });
      saveParticipantsToDb(next, false);
      return next;
    });

    setCurrentAnswers((prev) => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        isCorrect: forceCorrect,
        points: newPoints
      }
    }));

    quizRealtimeService.broadcast('ANSWER_ACKNOWLEDGED', {
      participantId,
      isCorrect: forceCorrect,
      isFinal: true,
      pointsAwarded: newPoints,
      totalScore: newTotalScore,
      questionIdx: currentQuestionIdx
    });
  }, [currentAnswers, activeQuestion, activeRoundObj, currentQuestionIdx, saveParticipantsToDb]);

  // Check if all players answered
  useEffect(() => {
    if (quizState === 'QUESTION_ACTIVE' && participants.length > 0) {
      const finishedCount = participants.filter((p) => {
        const ans = currentAnswers[p.id];
        if (!ans) return false;
        if (!isTwoChancesQuestion) return true;
        return ans.isFinal || ans.isCorrect || ans.attempt >= 2;
      }).length;

      if (finishedCount >= participants.length) {
        revealAnswer();
      }
    }
  }, [currentAnswers, participants.length, quizState, isTwoChancesQuestion]);

  // Synchronized Timer loop
  useEffect(() => {
    if (quizState !== 'QUESTION_ACTIVE' || !endTimeRef.current) return;

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      // Broadcast synchronous timer tick to keep all participant devices strictly synchronized
      quizRealtimeService.broadcast('TIME_SYNC', {
        timeLeft: remaining,
        endTime: endTimeRef.current
      });

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        revealAnswer();
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [quizState]);

  // Action: Start Question
  const startQuestion = (qIdx = currentQuestionIdx, targetRound = currentRound) => {
    const targetRoundObj = roundsList.find(r => Number(r.roundNumber) === Number(targetRound)) || activeRoundObj;
    const targetQuestions = Array.isArray(targetRoundObj?.questions) ? targetRoundObj.questions : questionsList;
    const q = targetQuestions[qIdx];
    if (!q) return;

    if (Number(targetRound) !== Number(currentRound)) {
      setCurrentRound(Number(targetRound));
    }
    setCurrentQuestionIdx(qIdx);
    setCurrentAnswers({});
    answeredSubmissionsRef.current.clear();
    const limit = Number(q.timeLimit) > 0 ? Number(q.timeLimit) : 20;
    const targetEndTime = Date.now() + (limit * 1000);
    endTimeRef.current = targetEndTime;
    setTimeLeft(limit);
    setQuizState('QUESTION_ACTIVE');

    const roundType = targetRoundObj?.quizType || quiz?.quizType;
    const qIsDirect = roundType === 'answer_to_question' || q.format === 'direct' || (!q.options?.length && q.answer !== undefined);
    const qIsTwoChances = roundType === 'one_question_two_chances' || q.format === 'mcq_2' || (q.secondTryMarks !== undefined && Number(q.secondTryMarks) > 0 && !qIsDirect);

    const sanitizedQuestion = {
      text: q.text,
      mediaUrl: q.mediaUrl,
      mediaType: q.mediaType,
      marks: Number(q.marks) || 1,
      secondTryMarks: q.secondTryMarks !== undefined ? Number(q.secondTryMarks) : undefined,
      timeLimit: limit,
      format: qIsDirect ? 'direct' : 'mcq',
      isTwoChances: qIsTwoChances,
      options: qIsDirect ? [] : (q.options || []).map((opt, i) => {
        const text = typeof opt === 'string' ? opt : opt?.text;
        return { text: text || `Option ${OPTION_LETTERS[i]}`, index: i };
      })
    };

    broadcastCurrentState({
      status: 'QUESTION_ACTIVE',
      round: Number(targetRound),
      totalRounds: totalRounds,
      questionNumber: qIdx + 1,
      totalQuestions: targetQuestions.length,
      questionsList: targetQuestions,
      question: sanitizedQuestion,
      timeLeft: limit,
      endTime: targetEndTime,
      revealed: false,
      correctIndex: null,
      correctAnswer: null
    });
  };

  // Action: Reveal Answer
  const revealAnswer = () => {
    clearInterval(timerRef.current);
    endTimeRef.current = null;
    setTimeLeft(0);
    setQuizState('ANSWER_REVEALED');

    const correctIdx = getCorrectOptionIndex(activeQuestion);

    // Apply unanswered penalty if configured and participant submitted no answer
    const unansweredPenalty = Number(activeQuestion?.unansweredPenaltyMarks) || Number(activeRoundObj?.defaultUnansweredPenaltyMarks) || 0;
    if (unansweredPenalty > 0) {
      setParticipants((pList) => {
        const next = pList.map((p) => {
          const ans = currentAnswers[p.id];
          if (!ans) {
            const newScore = (Number(p.score) || 0) - unansweredPenalty;
            quizRealtimeService.broadcast('ANSWER_ACKNOWLEDGED', {
              participantId: p.id,
              isCorrect: false,
              isFinal: true,
              canTryAgain: false,
              pointsAwarded: -unansweredPenalty,
              totalScore: newScore,
              questionIdx: currentQuestionIdx,
              unanswered: true
            });
            return {
              ...p,
              score: newScore,
              answers: [...(p.answers || []), { questionIdx: currentQuestionIdx, isCorrect: false, points: -unansweredPenalty, unanswered: true }]
            };
          }
          return p;
        });
        saveParticipantsToDb(next, false, true);
        return next;
      });
    } else {
      saveParticipantsToDb(participants, false, true);
    }

    // Broadcast answer reveal to all devices
    broadcastCurrentState({
      status: 'ANSWER_REVEALED',
      revealed: true,
      correctIndex: isDirectQuestion ? null : correctIdx,
      correctAnswer: activeQuestion?.answer || '',
      acceptableAnswers: Array.isArray(activeQuestion?.acceptableAnswers) ? activeQuestion.acceptableAnswers.filter(Boolean) : [],
      timeLeft: 0,
      endTime: null
    });

    if (soundEnabled) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  // Action: Cancel Question
  const handleCancelQuestion = () => {
    clearInterval(timerRef.current);
    endTimeRef.current = null;
    setTimeLeft(0);

    // Rollback any points awarded or deducted for this question
    setParticipants((prev) => {
      const next = prev.map((p) => {
        const questionAnsList = (p.answers || []).filter(a => a.questionIdx === currentQuestionIdx);
        if (questionAnsList.length === 0) return p;

        const netPointsThisQ = questionAnsList.reduce((sum, a) => sum + (Number(a.points) || 0), 0);
        const correctCountThisQ = questionAnsList.filter(a => a.isCorrect).length;

        return {
          ...p,
          score: (Number(p.score) || 0) - netPointsThisQ,
          correctCount: Math.max(0, (Number(p.correctCount) || 0) - correctCountThisQ),
          answers: (p.answers || []).filter(a => a.questionIdx !== currentQuestionIdx)
        };
      });
      saveParticipantsToDb(next, false);
      return next;
    });

    setCancelledQuestionIndices((prev) => new Set([...prev, currentQuestionIdx]));
    setQuizState('QUESTION_CANCELLED');

    broadcastCurrentState({
      status: 'QUESTION_CANCELLED',
      questionNumber: currentQuestionIdx + 1,
      totalQuestions: questionsList.length,
      timeLeft: 0,
      endTime: null
    });
  };

  // Action: Show Leaderboard
  const showLeaderboard = () => {
    setQuizState('LEADERBOARD');
    broadcastCurrentState({ status: 'LEADERBOARD' });
  };

  // Action: Proceed to Next Round
  const handleProceedToNextRound = async () => {
    if (!hasNextRound || !nextRoundObj) return;

    const nextRoundNum = Number(nextRoundObj.roundNumber) || (currentRound + 1);
    const updatedRounds = roundsList.map(r => {
      if (Number(r.roundNumber) === Number(currentRound)) {
        return { ...r, isCompleted: true };
      }
      return r;
    });

    if (quiz?.id) {
      try {
        await quizService.updateQuiz(quiz.id, {
          currentRound: nextRoundNum,
          rounds: updatedRounds
        });
      } catch (err) {
        console.error('Failed to update round in database:', err);
      }
    }

    setCurrentRound(nextRoundNum);
    setCurrentQuestionIdx(0);
    setCurrentAnswers({});
    answeredSubmissionsRef.current.clear();
    setQuizState('ROUND_TRANSITION');

    const nextQuestions = Array.isArray(nextRoundObj.questions) ? nextRoundObj.questions : [];
    broadcastCurrentState({
      status: 'ROUND_TRANSITION',
      round: nextRoundNum,
      totalRounds: totalRounds,
      questionNumber: 1,
      totalQuestions: nextQuestions.length,
      questionsList: nextQuestions,
      question: null,
      timeLeft: null,
      endTime: null,
      revealed: false
    });
  };

  // Action: Next Question or Next Round or Finish Quiz
  const handleNextQuestion = () => {
    if (hasNextQuestion) {
      startQuestion(currentQuestionIdx + 1, currentRound);
    } else if (hasNextRound) {
      handleProceedToNextRound();
    } else {
      // Quiz finished - only after the last round!
      setQuizState('FINISHED');
      saveParticipantsToDb(participants, true, true);
      broadcastCurrentState({ status: 'FINISHED', participants });
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
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#F7F8FC] dark:bg-[#0F1117] p-6 overflow-y-auto flex flex-col min-h-screen' : 'space-y-6'}`}>
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
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

          {canReset && (
            <button
              type="button"
              onClick={() => setIsResetDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-xs cursor-pointer"
              title="Reset live quiz progress and purge all participant data from database"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

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

      {/* Reset Success Notice */}
      {resetSuccess && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Quiz progress and participants data have been successfully reset and removed from the database! Live Arena is ready for a new session.</span>
          </div>
          <button
            type="button"
            onClick={() => setResetSuccess(false)}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================== STATE 1: LOBBY ===================== */}
      {quizState === 'LOBBY' && (
        <div className={`space-y-8 max-w-4xl mx-auto w-full py-6 animate-in fade-in duration-200 ${
          isFullscreen ? 'flex-1 flex flex-col justify-center my-auto' : ''
        }`}>
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

              {/* Big Room PIN display - Individual Digit Boxes */}
              <div className="pt-2 flex flex-col items-center justify-center gap-2.5">
                <span className="text-xs font-black uppercase tracking-widest text-violet-300">
                  Room Code
                </span>
                <div className="flex items-center justify-center gap-2 sm:gap-3.5">
                  {(roomPin || '').split('').map((char, idx) => (
                    <div
                      key={idx}
                      className="w-11 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 rounded-2xl sm:rounded-3xl bg-black/50 border-2 border-violet-500/50 backdrop-blur-md shadow-2xl shadow-violet-950/70 ring-2 sm:ring-4 ring-violet-500/20 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-violet-400 select-none"
                    >
                      <span className="text-3xl sm:text-5xl md:text-6xl font-black font-mono bg-gradient-to-br from-amber-300 via-white to-violet-200 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]">
                        {char}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-1 flex items-center justify-center gap-4 relative z-10">
              <button
                type="button"
                onClick={() => startQuestion(0, 1)}
                disabled={questionsList.length === 0}
                className={`py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-xl ${
                  questionsList.length === 0
                    ? 'bg-white/10 text-white/40 border border-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/40 hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-white/20'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Live Quiz</span>
              </button>
            </div>
          </div>

          {/* Connected Players Lobby Grid */}
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Players in Lobby ({participants.length})
                </h3>
              </div>

              {/* Search participants */}
              {participants.length > 0 && (
                <div className="relative flex-1 max-w-xs min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={lobbySearch}
                    onChange={(e) => setLobbySearch(e.target.value)}
                    placeholder="Search participants..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-[#12141F] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                  {lobbySearch && (
                    <button
                      type="button"
                      onClick={() => setLobbySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                {participants.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetLobby}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2.5 py-1 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer"
                  >
                    Clear Lobby
                  </button>
                )}
                <span className="text-xs text-gray-400 font-medium">Waiting for players to join...</span>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">No participants connected yet.</p>
              </div>
            ) : filteredLobbyParticipants.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                <Search className="w-6 h-6 text-gray-400 mx-auto" />
                <p className="font-semibold text-gray-700 dark:text-gray-300">No participants matching &quot;{lobbySearch}&quot;</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {filteredLobbyParticipants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="group relative p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/80 text-center space-y-1 animate-in zoom-in-95 duration-150"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(p.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-opacity cursor-pointer shadow-xs"
                      title={`Remove ${p.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
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
        <div className={`space-y-4 sm:space-y-5 max-w-5xl mx-auto w-full animate-in fade-in duration-200 transition-all ${
          isFullscreen ? 'flex-1 flex flex-col justify-center my-auto py-2 sm:py-3' : 'py-2'
        }`}>
          {/* Top Status Bar: Question Progress & Timer */}
          <div className="bg-white dark:bg-[#161925] p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all space-y-3">
            {/* Row 1: Context & Live Status */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {totalRounds > 1 && (
                  <span className="px-3 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black text-xs sm:text-sm">
                    Round {currentRound} of {totalRounds}
                  </span>
                )}
                <span className="px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-extrabold text-xs sm:text-sm">
                  Question {currentQuestionIdx + 1} of {questionsList.length}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                {/* Answered counter */}
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 px-3 py-1 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                  <Users className="w-3.5 h-3.5 text-[#635BFF]" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">{answeredCount}</strong> / {totalPlayers} Answered
                  </span>
                </div>

                {/* Countdown Timer */}
                {quizState === 'QUESTION_ACTIVE' && (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black ${
                      timeLeft !== null && timeLeft <= 5
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                        : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800/60'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Scoring Rules on Left | Actions on Right */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-2.5 border-t border-gray-100 dark:border-gray-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                {isTwoChancesQuestion ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-900/40 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 text-xs sm:text-sm font-extrabold shadow-xs">
                    <span className="text-emerald-600 dark:text-emerald-400">1st Try: +{activeQuestion.marks || 1} pts</span>
                    <span className="text-gray-400 dark:text-gray-600 font-bold">•</span>
                    <span className="text-amber-500 dark:text-yellow-400">
                      2nd Try: +{activeQuestion.secondTryMarks !== undefined ? activeQuestion.secondTryMarks : Math.max(1, Math.round((activeQuestion.marks || 1) / 2))} pts
                    </span>
                  </div>
                ) : (
                  <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs sm:text-sm">
                    +{activeQuestion.marks || 1} pts
                  </span>
                )}

                {/* Penalty indicators if configured */}
                {(() => {
                  const wrongPen = Number(activeQuestion.penaltyMarks) || Number(activeRoundObj?.defaultPenaltyMarks) || 0;
                  const secondPen = Number(activeQuestion.secondTryPenaltyMarks) || Number(activeRoundObj?.defaultSecondTryPenaltyMarks) || 0;
                  const unansPen = Number(activeQuestion.unansweredPenaltyMarks) || Number(activeRoundObj?.defaultUnansweredPenaltyMarks) || 0;
                  if (!wrongPen && !secondPen && !unansPen) return null;
                  return (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold shadow-xs">
                      {wrongPen > 0 && <span>Wrong: -{wrongPen}</span>}
                      {secondPen > 0 && (
                        <>
                          <span className="text-rose-300 dark:text-rose-700">•</span>
                          <span>2nd Wrong: -{secondPen}</span>
                        </>
                      )}
                      {unansPen > 0 && (
                        <>
                          <span className="text-rose-300 dark:text-rose-700">•</span>
                          <span>Unanswered: -{unansPen}</span>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Host Action: Reveal Answer early */}
                {quizState === 'QUESTION_ACTIVE' && (
                  <button
                    type="button"
                    onClick={revealAnswer}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
                    title="Reveal correct answer early"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal</span>
                  </button>
                )}

                {/* Host Action: Cancel Question */}
                <button
                  type="button"
                  onClick={handleCancelQuestion}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="Cancel and discard this question"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Que</span>
                </button>
              </div>
            </div>
          </div>

          {/* Media Attachment if provided */}
          {activeQuestion.mediaUrl && (
            <div className="rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] shadow-sm flex items-center justify-center p-2 max-h-[300px] sm:max-h-[340px]">
              <MediaViewer
                mediaUrl={activeQuestion.mediaUrl}
                mediaType={activeQuestion.mediaType || 'image'}
                className="w-full rounded-2xl max-h-[280px] sm:max-h-[320px]"
              />
            </div>
          )}

          {/* Question Text Card */}
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-sm text-center p-5 sm:p-7 transition-all">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white leading-relaxed transition-all">
              {activeQuestion.text || `Question ${currentQuestionIdx + 1}`}
            </h2>
          </div>

          {/* Question Answers / Options Section */}
          {isDirectQuestion ? (
            /* Direct Q&A Host View */
            <div className="space-y-4">
              {/* Revealed Correct Answer Banner (Only shown once revealed) */}
              {quizState === 'ANSWER_REVEALED' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/20 border-2 border-emerald-500/50 shadow-xl text-center space-y-2 animate-in zoom-in-95 duration-200">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correct Answer</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white leading-relaxed sm:leading-[1.7] break-words py-1">
                    {activeQuestion.answer || '(No answer provided in quiz setup)'}
                  </h3>
                  {Array.isArray(activeQuestion.acceptableAnswers) && activeQuestion.acceptableAnswers.filter(Boolean).length > 0 && (
                    <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Also Accepted:
                      </span>
                      {activeQuestion.acceptableAnswers.filter(Boolean).map((alt, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-black border border-emerald-300 dark:border-emerald-800 shadow-xs"
                        >
                          {alt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Participant Answers & Review List */}
              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                  <span>Participant Answers ({Object.keys(currentAnswers).length} / {totalPlayers})</span>
                  {quizState === 'ANSWER_REVEALED' && (
                    <span className="text-[11px] text-gray-400">Revealed & Graded</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                  {participants.map((p) => {
                    const ans = currentAnswers[p.id];
                    const hasSubmitted = Boolean(ans && ans.textAnswer !== undefined);
                    const isRevealed = quizState === 'ANSWER_REVEALED';

                    let statusBadge = null;
                    if (hasSubmitted) {
                      if (isRevealed) {
                        statusBadge = ans.isCorrect ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Correct (+{ans.points || activeQuestion.marks || 1} pts)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] flex items-center gap-1">
                            <X className="w-3 h-3" />
                            <span>Incorrect (0 pts)</span>
                          </span>
                        );
                      } else {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Answered</span>
                          </span>
                        );
                      }
                    } else {
                      statusBadge = isRevealed ? (
                        <span className="text-[11px] text-gray-400 italic">
                          No Answer (0 pts)
                        </span>
                      ) : null;
                    }

                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          hasSubmitted
                            ? isRevealed && ans.isCorrect
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                              : isRevealed && !ans.isCorrect
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                              : 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                            : 'bg-gray-50/40 dark:bg-gray-900/20 border-dashed border-gray-200 dark:border-gray-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-violet-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                            {isRevealed ? (
                              hasSubmitted ? (
                                <p
                                  className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 truncate cursor-default hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                  title={ans.textAnswer}
                                >
                                  "{ans.textAnswer}"
                                </p>
                              ) : (
                                <p className="text-xs font-mono font-medium text-gray-400 italic truncate">
                                  No answer submitted
                                </p>
                              )
                            ) : (
                              !hasSubmitted && (
                                <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 italic truncate">
                                  Waiting for answer...
                                </p>
                              )
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {statusBadge}
                          {isRevealed && hasSubmitted && (
                            <button
                              type="button"
                              onClick={() => handleToggleDirectAnswer(p.id, !ans.isCorrect)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                ans.isCorrect
                                  ? 'border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                  : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                              }`}
                              title={ans.isCorrect ? 'Mark as Incorrect' : 'Mark as Correct'}
                            >
                              {ans.isCorrect ? 'Mark Wrong' : 'Mark Correct'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {participants.length === 0 && (
                    <p className="text-xs text-gray-400 col-span-2 text-center py-4">No participants joined yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* MCQ Options Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 items-stretch transition-all">
              {(activeQuestion.options || []).map((opt, optIdx) => {
                const optText = typeof opt === 'string' ? opt : (opt?.text || `Option ${OPTION_LETTERS[optIdx]}`);
                const isOptionCorrect = optIdx === correctIdx;
                const style = OPTION_COLORS[optIdx % OPTION_COLORS.length];

                // Calculate response count for this option
                const votersForThisOpt = Object.values(currentAnswers).filter(a => a.selectedOptionIdx === optIdx).length;
                const votePercentage = totalPlayers > 0 ? Math.round((votersForThisOpt / totalPlayers) * 100) : 0;

                const isRevealed = quizState === 'ANSWER_REVEALED';

                let cardStyle = `${style.card} border-2`;
                if (isRevealed) {
                  if (isOptionCorrect) {
                    cardStyle = 'bg-emerald-500/10 dark:bg-emerald-950/40 border-2 border-emerald-500 ring-4 ring-emerald-500/20 shadow-md';
                  } else {
                    cardStyle = 'opacity-50 bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800';
                  }
                }

                return (
                  <div
                    key={optIdx}
                    className={`relative rounded-2xl border-2 transition-all space-y-2.5 h-full flex flex-col justify-center p-4 sm:p-5 min-h-[74px] sm:min-h-[80px] ${cardStyle}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-xs transition-all ${
                          isRevealed && isOptionCorrect ? 'bg-emerald-600 text-white' : style.badge
                        }`}>
                          {OPTION_LETTERS[optIdx]}
                        </span>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white leading-relaxed break-words min-w-0 flex-1 transition-all">
                          {optText}
                        </p>
                      </div>

                      {isRevealed && isOptionCorrect && (
                        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs ml-2 transition-all">
                          <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* Vote percentage bar on reveal */}
                    {isRevealed && (
                      <div className="pt-1.5 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                          <span>{votersForThisOpt} answer{votersForThisOpt === 1 ? '' : 's'}</span>
                          <span>{votePercentage}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isOptionCorrect ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`}
                            style={{ width: `${votePercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Host Controls Bottom Bar (only shown once answer is revealed) */}
          {quizState === 'ANSWER_REVEALED' && (
            <div className="pt-3 flex items-center justify-end gap-3 sm:gap-4 flex-wrap border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={showLeaderboard}
                className="py-2.5 sm:py-3 px-5 sm:px-6 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <BarChart3 className="w-4 h-4 text-violet-500" />
                <span>View Rankings</span>
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="py-2.5 sm:py-3 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-violet-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                <span>{hasNextQuestion ? 'Next Question' : (hasNextRound ? 'Next Round' : 'Finish Quiz')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================== STATE: QUESTION_CANCELLED ===================== */}
      {quizState === 'QUESTION_CANCELLED' && (
        <div className={`space-y-6 max-w-3xl mx-auto w-full py-8 text-center animate-in zoom-in-95 duration-200 ${
          isFullscreen ? 'flex-1 flex flex-col justify-center my-auto' : ''
        }`}>
          <div className="rounded-3xl bg-white dark:bg-[#161925] border-2 border-rose-500/40 p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border-2 border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <Ban className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider">
                Question {currentQuestionIdx + 1} Cancelled
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                This Question Has Been Discarded
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                The question has been cancelled by the quiz master. Any participant answers and scores for this question have been safely rolled back.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
              <button
                type="button"
                onClick={showLeaderboard}
                className="py-2.5 sm:py-3 px-5 sm:px-6 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <BarChart3 className="w-4 h-4 text-violet-500" />
                <span>View Rankings</span>
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="py-2.5 sm:py-3 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-violet-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                <span>{hasNextQuestion ? 'Next Question' : (hasNextRound ? 'Next Round' : 'Finish Quiz')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== STATE 4: LEADERBOARD ===================== */}
      {quizState === 'LEADERBOARD' && (
        <div className={`space-y-6 max-w-4xl mx-auto w-full py-4 animate-in fade-in duration-200 ${
          isFullscreen ? 'flex-1 flex flex-col justify-center my-auto' : ''
        }`}>
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
              <span>{hasNextQuestion ? 'Next Question' : (hasNextRound ? 'Next Round' : 'Finish Quiz')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Standings Table */}
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px] bg-gray-50/50 dark:bg-gray-800/20">
                  <th className="py-3.5 px-4 w-28">Rank</th>
                  <th className="py-3.5 px-4">Participant Name</th>
                  <th className="py-3.5 px-4 text-center">Correct Answers</th>
                  <th className="py-3.5 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {computeStandings(participants, 'correctCount').map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <td className="py-3.5 px-4 font-black">
                      {getRankBadge(p.rank, p.isTied, 'short')}
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

      {/* ===================== STATE: ROUND_TRANSITION ===================== */}
      {quizState === 'ROUND_TRANSITION' && (
        <div className={`space-y-6 max-w-4xl mx-auto w-full py-6 text-center animate-in zoom-in-95 duration-200 ${
          isFullscreen ? 'flex-1 flex flex-col justify-center my-auto' : ''
        }`}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#2A1B6B] to-[#161435] border-2 border-violet-500/40 text-white p-8 sm:p-12 text-center space-y-6 shadow-2xl shadow-indigo-950/60">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-violet-500/20 text-violet-200 border border-violet-400/30">
              Round {currentRound} of {totalRounds}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-black">
                {activeRoundObj?.name || activeRoundObj?.title || `Round ${currentRound}`}
              </h1>
              <p className="text-sm sm:text-base font-semibold opacity-90 max-w-md mx-auto text-violet-200">
                {questionsList.length} Questions in this round. All players are synchronized!
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => startQuestion(0, currentRound)}
                disabled={questionsList.length === 0}
                className="py-4 px-8 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-violet-600/40 hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-white/20 inline-flex items-center gap-2.5 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Round {currentRound}</span>
              </button>
            </div>
          </div>

          {/* Quick Participant Standings Summary */}
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
              <span>{participants.length} Active Participants</span>
              <span>Cumulative Standings</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {computeStandings(participants, 'correctCount')
                .slice(0, 8)
                .map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    <span>{getRankBadge(p.rank, p.isTied, 'short')}</span>
                    <span>{p.name}</span>
                    <span className="text-violet-600 dark:text-violet-400 font-extrabold">{p.score || 0} pts</span>
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== STATE 5: FINISHED ===================== */}
      {quizState === 'FINISHED' && (
        <div className={`space-y-8 max-w-4xl mx-auto w-full py-6 text-center animate-in zoom-in-95 duration-200 ${
          isFullscreen ? 'flex-1 flex flex-col justify-center my-auto' : ''
        }`}>
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white space-y-3 shadow-2xl shadow-orange-500/25">
            <h1 className="text-3xl sm:text-5xl font-black">Quiz Completed!</h1>
            <p className="text-sm font-semibold opacity-90 max-w-md mx-auto">
              All questions have been evaluated. Congratulations to all participants!
            </p>
          </div>

          {/* Final Results Table of All Participants */}
          {(() => {
            const sorted = computeStandings(participants, 'correctCount');
            const winners = sorted.filter(p => p.rank === 1);
            return (
              <div className="space-y-6">
                {/* Grand Winner(s) Card */}
                {winners.length > 0 && (
                  <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-4">
                      {winners.length > 1 ? '👑 Grand Winners (Tied - 1st Place)' : '👑 Grand Winner'}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      {winners.map((winner) => (
                        <div key={winner.id} className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 inline-block space-y-2 min-w-[260px]">
                          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
                            🥇
                          </div>
                          <h4 className="text-2xl font-black text-gray-900 dark:text-white">{winner.name}</h4>
                          <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">{winner.score} pts</p>
                          {winners.length > 1 && (
                            <span className="inline-block text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">
                              Tied 1st
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Complete Final Results Table for All */}
                <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm text-left">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        Final Results ({sorted.length} Participants)
                      </h3>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px] bg-gray-50/50 dark:bg-gray-800/20">
                        <th className="py-3.5 px-4 w-28">Rank</th>
                        <th className="py-3.5 px-4">Participant Name</th>
                        <th className="py-3.5 px-4 text-center">Correct Answers</th>
                        <th className="py-3.5 px-4 text-right">Final Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {sorted.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                          <td className="py-3.5 px-4 font-black">
                            {getRankBadge(p.rank, p.isTied, 'ordinal')}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-gray-900 dark:text-white">
                            {p.name}
                          </td>
                          <td className="py-3.5 px-4 text-center text-gray-500 dark:text-gray-400 font-semibold">
                            {p.correctCount || 0} / {totalQuizQuestions}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-block px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-[#635BFF] dark:text-[#A59EFF] font-black text-xs">
                              {p.score || 0} pts
                            </span>
                          </td>
                        </tr>
                      ))}
                      {sorted.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400">
                            No participants joined this session.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                  {canReset && (
                    <button
                      type="button"
                      onClick={() => setIsResetDialogOpen(true)}
                      className="py-3 px-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
                      title="Reset quiz data in database and play again"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset & Play Again</span>
                    </button>
                  )}
                  <Link
                    to={`/home/quiz/${quiz.id}`}
                    className="py-3 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-indigo-700 transition-all cursor-pointer"
                  >
                    Back to Quiz Hub
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* QR Code Modal - Large Room Scannable Display */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-lg sm:max-w-xl md:max-w-2xl rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-8 md:p-10 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Scan to Join Live Arena</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Scan from your seat anywhere in the room to connect instantly
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 pt-1">
              {/* Extra Large Scannable QR Code Box */}
              <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 mx-auto bg-white p-4 sm:p-6 rounded-3xl border-2 border-violet-100 dark:border-violet-900/40 shadow-2xl flex items-center justify-center transition-all">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan QR code to join live quiz directly"
                    className="w-full h-full object-contain select-none image-rendering-crisp"
                  />
                ) : (
                  <div className="w-12 h-12 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-semibold">
                  Point your phone camera at the QR code — it opens the page with the room PIN already added so you just type your name!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Reset Progress Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        title="Reset Live Quiz Progress"
        message={`Are you sure you want to reset all test data and progress for "${quiz?.name}"? This will permanently remove all live participant data, answers, and scores from the database, and reset the arena back to the lobby. All questions, options, and settings will remain safely intact.`}
        confirmText={resetting ? 'Resetting...' : 'Reset Progress'}
        confirmButtonClass="bg-rose-600 hover:bg-rose-700 text-white"
        isLoading={resetting}
        onConfirm={handleResetLiveQuiz}
        onCancel={() => setIsResetDialogOpen(false)}
        onClose={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}

