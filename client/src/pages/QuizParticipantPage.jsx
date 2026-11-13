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
  AlertCircle,
  LogOut,
  BarChart3,
  Send,
  Loader2,
  Ban
} from 'lucide-react';
import EventoraLogo from '../components/EventoraLogo';
import { quizRealtimeService } from '../services/quizRealtimeService';
import MediaViewer from '../components/quiz/MediaViewer';
import { computeStandings, getRankBadge, getRankEmoji } from '../utils/quizRankingUtils';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const OPTION_COLORS = [
  {
    badge: 'bg-rose-500 text-white',
    card: 'border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/70 dark:bg-rose-950/20 dark:border-rose-500/40 dark:hover:bg-rose-950/30',
    selected: 'bg-rose-600 text-white border-rose-500 ring-4 ring-rose-500/25 shadow-lg shadow-rose-600/20',
    selectedBadge: 'bg-white/25 text-white',
    bar: 'bg-rose-500'
  },
  {
    badge: 'bg-sky-500 text-white',
    card: 'border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/70 dark:bg-sky-950/20 dark:border-sky-500/40 dark:hover:bg-sky-950/30',
    selected: 'bg-sky-600 text-white border-sky-500 ring-4 ring-sky-500/25 shadow-lg shadow-sky-600/20',
    selectedBadge: 'bg-white/25 text-white',
    bar: 'bg-sky-500'
  },
  {
    badge: 'bg-yellow-400 text-gray-950 font-black',
    card: 'border-yellow-400/45 bg-yellow-400/5 hover:bg-yellow-400/10 hover:border-yellow-400/80 dark:bg-yellow-400/[0.06] dark:border-yellow-400/45 dark:hover:bg-yellow-400/15',
    selected: 'bg-yellow-400 text-gray-950 font-black border-yellow-300 ring-4 ring-yellow-400/30 shadow-lg shadow-yellow-400/25',
    selectedBadge: 'bg-black/20 text-gray-950',
    bar: 'bg-yellow-400'
  },
  {
    badge: 'bg-emerald-500 text-white',
    card: 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/70 dark:bg-emerald-950/20 dark:border-emerald-500/40 dark:hover:bg-emerald-950/30',
    selected: 'bg-emerald-600 text-white border-emerald-500 ring-4 ring-emerald-500/25 shadow-lg shadow-emerald-600/20',
    selectedBadge: 'bg-white/25 text-white',
    bar: 'bg-emerald-500'
  }
];

const PARTICIPANT_SESSION_KEY = 'eventora_live_participant_session';

function getSavedParticipantSession() {
  try {
    const raw = sessionStorage.getItem(PARTICIPANT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveParticipantSession(data) {
  try {
    const prev = getSavedParticipantSession() || {};
    sessionStorage.setItem(PARTICIPANT_SESSION_KEY, JSON.stringify({ ...prev, ...data }));
  } catch (_) {}
}

function clearParticipantSession() {
  try {
    sessionStorage.removeItem(PARTICIPANT_SESSION_KEY);
  } catch (_) {}
}

export default function QuizParticipantPage() {
  const { pin: paramPin } = useParams();
  const [searchParams] = useSearchParams();

  const savedSession = useRef(getSavedParticipantSession()).current;

  // Initial State from URL / Storage
  const urlPin = (paramPin || searchParams.get('pin') || '').replace(/\D/g, '').slice(0, 6);
  const initialPin = urlPin || savedSession?.pin || '';

  // Connection State - restored from session if previously joined, but reset if a new room pin is scanned
  const [hasJoined, setHasJoined] = useState(() => {
    if (urlPin && savedSession?.pin && savedSession.pin !== urlPin) {
      clearParticipantSession();
      return false;
    }
    return Boolean(savedSession?.hasJoined && savedSession?.pin);
  });

  const [digits, setDigits] = useState(() => {
    const arr = ['', '', '', '', '', ''];
    // If not arriving from a fresh dynamic QR/URL pin, restore previous manual digits if any
    if (!urlPin && savedSession?.pin) {
      const clean = savedSession.pin.replace(/\D/g, '').slice(0, 6);
      clean.split('').forEach((char, idx) => {
        arr[idx] = char;
      });
    }
    return arr;
  });
  const pin = digits.join('');
  const [playerName, setPlayerName] = useState(() => savedSession?.playerName || '');
  const [playerId] = useState(() => {
    // Ensure no legacy shared localStorage ID leaks across separate browser tabs
    try {
      localStorage.removeItem('eventora_player_id');
      localStorage.removeItem('eventora_player_name');
    } catch (_) {}

    let id = savedSession?.playerId || sessionStorage.getItem('eventora_player_id');
    if (!id) {
      id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('eventora_player_id', id);
    }
    return id;
  });

  const [joinError, setJoinError] = useState('');
  const [isValidatingPin, setIsValidatingPin] = useState(false);

  const validationTimeoutRef = useRef(null);
  const validationRetryRef = useRef(null);

  // Animation and Input Focus States
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [poppingIndex, setPoppingIndex] = useState(null);
  const inputRefs = useRef([]);
  const nameInputRef = useRef(null);

  const lastTypedPinRef = useRef('');

  // Dynamic QR auto-type animation:
  // When scanned from QR code with a room PIN, automatically types the 6 digits sequentially
  // and smoothly places focus directly in the "Your Name" input field.
  useEffect(() => {
    if (hasJoined) return;
    if (urlPin.length === 6 && lastTypedPinRef.current !== urlPin) {
      lastTypedPinRef.current = urlPin;
      const pinChars = urlPin.split('');
      pinChars.forEach((char, idx) => {
        setTimeout(() => {
          setDigits((prev) => {
            const next = [...prev];
            next[idx] = char;
            return next;
          });
          setPoppingIndex(idx);
          setTimeout(() => setPoppingIndex(null), 180);

          // Once the 6th digit is typed, focus directly into the Name input
          if (idx === 5) {
            setTimeout(() => {
              nameInputRef.current?.focus();
            }, 60);
          }
        }, idx * 50 + 60);
      });
    }
  }, [urlPin, hasJoined]);

  // Clean up any pending validation timers on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
      if (validationRetryRef.current) clearTimeout(validationRetryRef.current);
    };
  }, []);

  // Focus management:
  // If no dynamic QR pin is present, focus the first empty PIN box for manual entry.
  // If PIN is already completely filled, focus the name input field.
  useEffect(() => {
    if (!hasJoined && !urlPin) {
      const firstEmpty = digits.findIndex((d) => !d);
      const timer = setTimeout(() => {
        if (firstEmpty === -1) {
          nameInputRef.current?.focus();
        } else {
          inputRefs.current[firstEmpty]?.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [hasJoined, urlPin]);

  // Live Room State synced from Host
  const [roomState, setRoomState] = useState(() => savedSession?.roomState || {
    status: 'LOBBY', // 'LOBBY' | 'QUESTION_ACTIVE' | 'ANSWER_REVEALED' | 'LEADERBOARD' | 'FINISHED'
    quizTitle: 'Live Quiz',
    round: 1,
    questionNumber: 0,
    totalQuestions: 1,
    question: null,
    timeLeft: null,
    revealed: false,
    correctIndex: null,
    correctAnswer: null,
    acceptableAnswers: [],
    leaderboard: []
  });

  // Local Participant Play State
  const [answersMap, setAnswersMap] = useState(() => savedSession?.answersMap || {});
  const [selectedOption, setSelectedOption] = useState(() => savedSession?.selectedOption ?? null);
  const [textAnswer, setTextAnswer] = useState(() => savedSession?.textAnswer || '');
  const [submittedTextAnswer, setSubmittedTextAnswer] = useState(() => savedSession?.submittedTextAnswer || '');
  const [attemptNumber, setAttemptNumber] = useState(() => savedSession?.attemptNumber || 1);
  const [disabledOptionIndices, setDisabledOptionIndices] = useState(() => savedSession?.disabledOptionIndices || []);
  const [twoChanceNotice, setTwoChanceNotice] = useState('');
  const [isAnswerLocked, setIsAnswerLocked] = useState(() => Boolean(savedSession?.isAnswerLocked));
  const [totalScore, setTotalScore] = useState(() => Number(savedSession?.totalScore) || 0);
  const [lastRoundResult, setLastRoundResult] = useState(() => savedSession?.lastRoundResult || null);
  const [localTimer, setLocalTimer] = useState(null);
  const [showStandingsModal, setShowStandingsModal] = useState(false);
  const endTimeRef = useRef(null);
  const scoredQuestionsRef = useRef(new Set(savedSession?.scoredQuestions || []));

  // Sync state to sessionStorage whenever key participant data changes
  useEffect(() => {
    if (hasJoined && pin) {
      saveParticipantSession({
        hasJoined: true,
        pin,
        playerName,
        playerId,
        totalScore,
        selectedOption,
        textAnswer,
        submittedTextAnswer,
        attemptNumber,
        disabledOptionIndices,
        isAnswerLocked,
        lastRoundResult,
        answersMap,
        roomState,
        scoredQuestions: Array.from(scoredQuestionsRef.current)
      });
    }
  }, [hasJoined, pin, playerName, playerId, totalScore, selectedOption, textAnswer, submittedTextAnswer, attemptNumber, disabledOptionIndices, isAnswerLocked, lastRoundResult, answersMap, roomState]);

  // Handle focusing a box (redirects forward clicks to first empty slot)
  const handleBoxFocus = (idx) => {
    const firstEmpty = digits.findIndex((d) => !d);
    if (firstEmpty !== -1 && idx > firstEmpty) {
      inputRefs.current[firstEmpty]?.focus();
      setFocusedIndex(firstEmpty);
      return;
    }
    setFocusedIndex(idx);
    setTimeout(() => {
      inputRefs.current[idx]?.select();
    }, 0);
  };

  // Handle individual digit input with instant auto-advance
  const handleDigitChange = (idx, e) => {
    if (joinError) setJoinError('');
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/\D/g, '');

    if (!cleanDigits) {
      const newDigits = [...digits];
      newDigits[idx] = '';
      setDigits(newDigits);
      return;
    }

    const digit = cleanDigits.slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = digit;
    setDigits(newDigits);

    // Trigger bouncy pop animation
    setPoppingIndex(idx);
    setTimeout(() => {
      setPoppingIndex((prev) => (prev === idx ? null : prev));
    }, 250);

    // Instant auto-advance to next box without delay
    if (idx < 5) {
      setTimeout(() => {
        const nextInput = inputRefs.current[idx + 1];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }, 0);
    } else {
      if (!playerName.trim()) {
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 0);
      }
    }
  };

  // Handle Backspace & Arrow Navigation across boxes
  const handleDigitKeyDown = (idx, e) => {
    if (joinError) setJoinError('');
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[idx - 1] = '';
        setDigits(newDigits);
        setTimeout(() => {
          inputRefs.current[idx - 1]?.focus();
        }, 0);
      } else if (digits[idx]) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[idx] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    }
  };

  // Handle pasting full PIN code
  const handleDigitPaste = (e) => {
    e.preventDefault();
    if (joinError) setJoinError('');
    const pastedText = e.clipboardData.getData('text') || '';
    const cleanPasted = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!cleanPasted) return;

    const newDigits = [...digits];
    cleanPasted.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setDigits(newDigits);

    const lastFilledIdx = Math.min(cleanPasted.length - 1, 5);
    setPoppingIndex(lastFilledIdx);
    setTimeout(() => setPoppingIndex(null), 250);

    if (cleanPasted.length >= 6) {
      if (!playerName.trim()) {
        nameInputRef.current?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    } else {
      inputRefs.current[cleanPasted.length]?.focus();
    }
  };

  // Join Room Handler with Live Verification
  const handleJoin = (e) => {
    if (e) e.preventDefault();
    if (isValidatingPin) return;

    const cleanPin = digits.join('').trim();
    const cleanName = playerName.trim();

    if (!cleanPin) {
      setJoinError('Please enter the Room PIN.');
      const firstEmpty = digits.findIndex((d) => !d);
      inputRefs.current[firstEmpty === -1 ? 0 : firstEmpty]?.focus();
      return;
    }
    if (cleanPin.length !== 6) {
      setJoinError('Please enter all 6 digits of the Room PIN.');
      const firstEmpty = digits.findIndex((d) => !d);
      inputRefs.current[firstEmpty === -1 ? 0 : firstEmpty]?.focus();
      return;
    }
    if (!cleanName) {
      setJoinError('Please enter your name.');
      nameInputRef.current?.focus();
      return;
    }

    setJoinError('');
    setIsValidatingPin(true);

    const completeJoin = (incomingState = null) => {
      setIsValidatingPin(false);
      sessionStorage.setItem('eventora_player_name', cleanName);

      saveParticipantSession({
        hasJoined: true,
        pin: cleanPin,
        playerName: cleanName,
        playerId
      });

      if (incomingState && incomingState.status) {
        setRoomState((prev) => ({ ...prev, ...incomingState }));
      }

      setHasJoined(true);
    };

    // Fast path: if host was started locally in same browser/device
    try {
      const localActive = localStorage.getItem(`eventora_active_pin_${cleanPin}`);
      if (localActive && Date.now() - Number(localActive) < 2 * 60 * 60 * 1000) {
        completeJoin();
        return;
      }
    } catch (_) {}

    // Realtime Verification Path:
    // Connect to room channel and ping host
    quizRealtimeService.joinRoom(cleanPin, 'participant', { id: playerId, name: cleanName });

    let verified = false;

    const cleanup = () => {
      if (unsubVerify) unsubVerify();
      if (unsubState) unsubState();
      if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
      if (validationRetryRef.current) clearTimeout(validationRetryRef.current);
    };

    const confirmJoin = (data = null) => {
      if (verified) return;
      verified = true;
      cleanup();
      completeJoin(data);
    };

    const unsubVerify = quizRealtimeService.on('ROOM_VERIFIED', (data) => {
      if (data?.pin === cleanPin || data?.valid) {
        confirmJoin(data);
      }
    });

    const unsubState = quizRealtimeService.on('STATE_UPDATE', (data) => {
      if (data?.pin === cleanPin || data?.status) {
        confirmJoin(data);
      }
    });

    // Send verify probe
    quizRealtimeService.broadcast('CHECK_ROOM', { pin: cleanPin, id: playerId, name: cleanName });
    quizRealtimeService.broadcast('REQUEST_SYNC', { pin: cleanPin, id: playerId, name: cleanName });

    // Send retry probe at 1.2s in case WebSocket was still handshaking
    validationRetryRef.current = setTimeout(() => {
      if (!verified) {
        quizRealtimeService.broadcast('CHECK_ROOM', { pin: cleanPin, id: playerId, name: cleanName });
        quizRealtimeService.broadcast('REQUEST_SYNC', { pin: cleanPin, id: playerId, name: cleanName });
      }
    }, 1200);

    // Timeout after 3.2s: If no host answers, PIN is invalid!
    validationTimeoutRef.current = setTimeout(() => {
      if (!verified) {
        verified = true;
        cleanup();
        try {
          quizRealtimeService.leaveRoom();
        } catch (_) {}
        setIsValidatingPin(false);
        setJoinError(`Invalid Room PIN (${cleanPin}). No active quiz was found with this code. Please check the screen and try again.`);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
          inputRefs.current[0]?.select();
        }, 50);
      }
    }, 3200);
  };

  // Leave Room / Exit Handler
  const handleLeaveArena = () => {
    try {
      quizRealtimeService.broadcast('PLAYER_LEFT', { id: playerId, name: playerName });
      quizRealtimeService.leaveRoom({ id: playerId, name: playerName });
    } catch (_) {}
    clearParticipantSession();
    setHasJoined(false);
    setSelectedOption(null);
    setTextAnswer('');
    setSubmittedTextAnswer('');
    setAttemptNumber(1);
    setDisabledOptionIndices([]);
    setTwoChanceNotice('');
    setIsAnswerLocked(false);
    setTotalScore(0);
    setAnswersMap({});
    setRoomState({
      status: 'LOBBY',
      quizTitle: 'Live Quiz',
      round: 1,
      questionNumber: 0,
      totalQuestions: 1,
      question: null,
      timeLeft: null,
      revealed: false,
      correctIndex: null,
      correctAnswer: null,
      acceptableAnswers: [],
      leaderboard: []
    });
  };

  // Immediate disconnect handler when closing tab or navigating away
  useEffect(() => {
    if (!hasJoined || !pin || !playerId) return;

    const handleExit = () => {
      try {
        quizRealtimeService.broadcast('PLAYER_LEFT', { id: playerId, name: playerName });
        quizRealtimeService.leaveRoom({ id: playerId, name: playerName });
      } catch (_) {}
    };

    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);

    return () => {
      window.removeEventListener('beforeunload', handleExit);
      window.removeEventListener('pagehide', handleExit);
    };
  }, [hasJoined, pin, playerId, playerName]);

  // Listen to Host Broadcasts
  useEffect(() => {
    if (!hasJoined || !pin) return;

    // Connect to realtime channel
    quizRealtimeService.joinRoom(pin, 'participant', { id: playerId, name: playerName });

    // Announce to Host that player joined and request state
    quizRealtimeService.broadcast('PLAYER_JOINED', {
      id: playerId,
      name: playerName
    });
    quizRealtimeService.broadcast('REQUEST_SYNC', {
      id: playerId,
      name: playerName
    });

    // Reconnection & visibility recovery listener: if user resumes app or regains network, sync once
    const handleSyncOnResume = () => {
      if (document.visibilityState === 'visible') {
        quizRealtimeService.broadcast('REQUEST_SYNC', {
          id: playerId,
          name: playerName
        });
      }
    };
    window.addEventListener('visibilitychange', handleSyncOnResume);
    window.addEventListener('online', handleSyncOnResume);

    // One-time fallback check: if no state received after 4s, request sync once
    const initialSyncTimer = setTimeout(() => {
      quizRealtimeService.broadcast('REQUEST_SYNC', {
        id: playerId,
        name: playerName
      });
    }, 4000);

    // Listen for room state changes from the Quiz Master
    const unsubState = quizRealtimeService.on('STATE_UPDATE', (data) => {
      if (!data) return;

      setRoomState((prev) => {
        const isNewQuestion = data.questionNumber !== prev.questionNumber || data.round !== prev.round;
        const becameActive = data.status === 'QUESTION_ACTIVE' && prev.status !== 'QUESTION_ACTIVE';

        if (data.status === 'QUESTION_ACTIVE' && (isNewQuestion || becameActive)) {
          clearTimeout(initialSyncTimer);

          // Restore existing answer if already saved for this question (e.g. across refresh)
          const answerKey = `${data.round || 1}_${data.questionNumber}`;
          const savedAnswer = answersMap[answerKey] || answersMap[data.questionNumber];
          if (savedAnswer) {
            setSelectedOption(savedAnswer.selectedOption ?? null);
            setTextAnswer(savedAnswer.textAnswer || '');
            setSubmittedTextAnswer(savedAnswer.submittedTextAnswer || savedAnswer.textAnswer || '');
            setIsAnswerLocked(Boolean(savedAnswer.isAnswerLocked));
            setLastRoundResult(savedAnswer.lastRoundResult || null);
            setAttemptNumber(savedAnswer.attemptNumber || 1);
            setDisabledOptionIndices(savedAnswer.disabledOptionIndices || []);
            setTwoChanceNotice('');
          } else {
            setSelectedOption(null);
            setTextAnswer('');
            setSubmittedTextAnswer('');
            setIsAnswerLocked(false);
            setLastRoundResult(null);
            setAttemptNumber(1);
            setDisabledOptionIndices([]);
            setTwoChanceNotice('');
          }
        }

        if (data.status === 'QUESTION_ACTIVE') {
          if (data.endTime) {
            endTimeRef.current = data.endTime;
            const remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
            setLocalTimer(remaining);
          } else if (data.timeLeft !== undefined) {
            setLocalTimer(data.timeLeft);
          }
        }

        if (data.status === 'ANSWER_REVEALED' && data.revealed) {
          endTimeRef.current = null;
          setLocalTimer(0);
        }

        // Synchronize our personal score if host provided leaderboard
        if (Array.isArray(data.leaderboard)) {
          const myEntry = data.leaderboard.find((p) => p.id === playerId);
          if (myEntry && myEntry.score !== undefined) {
            setTotalScore(Number(myEntry.score) || 0);
          }
        }

        return { ...prev, ...data };
      });
    });

    // Listen for synchronous timer ticks from the Host
    const unsubTimeSync = quizRealtimeService.on('TIME_SYNC', (data) => {
      if (data?.timeLeft !== undefined) {
        setLocalTimer(data.timeLeft);
        if (data.endTime) {
          endTimeRef.current = data.endTime;
        }
      }
    });

    // Listen for host answer acknowledgment
    const unsubAck = quizRealtimeService.on('ANSWER_ACKNOWLEDGED', (data) => {
      if (data?.participantId === playerId) {
        if (data.totalScore !== undefined) {
          setTotalScore(Number(data.totalScore) || 0);
        } else {
          const qKey = data.questionIdx !== undefined ? data.questionIdx : `q_${Date.now()}`;
          if (!scoredQuestionsRef.current.has(qKey)) {
            scoredQuestionsRef.current.add(qKey);
            setTotalScore((prev) => prev + (Number(data.pointsAwarded) || 0));
          }
        }

        if (data.canTryAgain) {
          setTwoChanceNotice(`❌ 1st try incorrect! You have 1 second chance (+${data.secondTryMarks || 1} pts). Pick another option!`);
          setAttemptNumber(2);
          setIsAnswerLocked(false);
          return;
        }

        setTwoChanceNotice('');
        setIsAnswerLocked(true);

        const result = {
          isCorrect: Boolean(data.isCorrect),
          points: Number(data.pointsAwarded) || 0
        };
        setLastRoundResult(result);

        // Record in answers map
        const answerKey = `${roomState.round || 1}_${roomState.questionNumber}`;
        setAnswersMap((prev) => ({
          ...prev,
          [answerKey]: {
            ...(prev[answerKey] || {}),
            lastRoundResult: result,
            isAnswerLocked: true
          }
        }));
      }
    });

    // Listen for host kicking this specific participant
    const unsubKick = quizRealtimeService.on('KICK_PARTICIPANT', (data) => {
      if (data?.id === playerId || data?.participantId === playerId) {
        clearTimeout(initialSyncTimer);
        clearParticipantSession();
        try {
          quizRealtimeService.leaveRoom();
        } catch (_) {}
        setHasJoined(false);
        setSelectedOption(null);
        setTextAnswer('');
        setSubmittedTextAnswer('');
        setAttemptNumber(1);
        setDisabledOptionIndices([]);
        setTwoChanceNotice('');
        setIsAnswerLocked(false);
        setTotalScore(0);
        setAnswersMap({});
        setJoinError('You were removed from the lobby by the host.');
      }
    });

    // Listen for host clearing the lobby
    const unsubLobbyCleared = quizRealtimeService.on('LOBBY_CLEARED', () => {
      clearTimeout(initialSyncTimer);
      clearParticipantSession();
      try {
        quizRealtimeService.leaveRoom();
      } catch (_) {}
      setHasJoined(false);
      setSelectedOption(null);
      setTextAnswer('');
      setSubmittedTextAnswer('');
      setAttemptNumber(1);
      setDisabledOptionIndices([]);
      setTwoChanceNotice('');
      setIsAnswerLocked(false);
      setTotalScore(0);
      setAnswersMap({});
      setJoinError('The lobby was cleared by the host. Please join again.');
    });

    // Listen for host resetting the quiz
    const unsubReset = quizRealtimeService.on('RESET_QUIZ', () => {
      clearTimeout(initialSyncTimer);
      clearParticipantSession();
      try {
        quizRealtimeService.leaveRoom();
      } catch (_) {}
      setHasJoined(false);
      setSelectedOption(null);
      setTextAnswer('');
      setSubmittedTextAnswer('');
      setAttemptNumber(1);
      setDisabledOptionIndices([]);
      setTwoChanceNotice('');
      setIsAnswerLocked(false);
      setTotalScore(0);
      setAnswersMap({});
      setJoinError('The quiz was reset by the host. Please rejoin.');
    });

    return () => {
      clearTimeout(initialSyncTimer);
      window.removeEventListener('visibilitychange', handleSyncOnResume);
      window.removeEventListener('online', handleSyncOnResume);
      unsubState();
      unsubTimeSync();
      unsubAck();
      unsubKick();
      unsubLobbyCleared();
      unsubReset();
    };
  }, [hasJoined, pin, playerId, playerName, answersMap, roomState.questionNumber, roomState.round]);

  // Synchronized countdown fallback between host ticks
  useEffect(() => {
    if (roomState.status !== 'QUESTION_ACTIVE' || !endTimeRef.current) return;

    const timer = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setLocalTimer(remaining);
    }, 500);

    return () => clearInterval(timer);
  }, [roomState.status]);

  // Submit MCQ Answer
  const handleSelectOption = (optIdx) => {
    if (isAnswerLocked || roomState.status !== 'QUESTION_ACTIVE' || localTimer === 0) return;
    if (disabledOptionIndices.includes(optIdx)) return;

    setSelectedOption(optIdx);

    const isTwoChances = Boolean(roomState.question?.isTwoChances);
    if (isTwoChances && attemptNumber === 1) {
      setDisabledOptionIndices((prev) => [...prev, optIdx]);
      setIsAnswerLocked(true); // Wait for host ACK
    } else {
      setIsAnswerLocked(true);
    }

    const qKey = `${roomState.round || 1}_${roomState.questionNumber}`;
    setAnswersMap((prev) => ({
      ...prev,
      [qKey]: {
        selectedOption: optIdx,
        attemptNumber,
        disabledOptionIndices: isTwoChances ? [...disabledOptionIndices, optIdx] : [],
        isAnswerLocked: true
      }
    }));

    // Broadcast submission to Host
    quizRealtimeService.broadcast('SUBMIT_ANSWER', {
      participantId: playerId,
      participantName: playerName,
      selectedOptionIdx: optIdx,
      attempt: attemptNumber,
      timeElapsed: (roomState.question?.timeLimit || 20) - (localTimer || 0)
    });
  };

  // Submit Direct Text Answer
  const handleSubmitTextAnswer = (e) => {
    if (e) e.preventDefault();
    if (isAnswerLocked || roomState.status !== 'QUESTION_ACTIVE' || localTimer === 0 || !textAnswer.trim()) return;

    const trimmed = textAnswer.trim();
    setSubmittedTextAnswer(trimmed);
    setIsAnswerLocked(true);

    const qKey = `${roomState.round || 1}_${roomState.questionNumber}`;
    setAnswersMap((prev) => ({
      ...prev,
      [qKey]: {
        textAnswer: trimmed,
        submittedTextAnswer: trimmed,
        isAnswerLocked: true
      }
    }));

    quizRealtimeService.broadcast('SUBMIT_ANSWER', {
      participantId: playerId,
      participantName: playerName,
      textAnswer: trimmed,
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {urlPin ? 'Room PIN detected from QR code. Enter your name below!' : 'Enter the Room PIN shown on the main screen.'}
            </p>
          </div>

          {joinError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2.5 text-left shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5 text-left">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Room PIN (6 Digits)
                </label>
                <span className="text-[11px] font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800/60">
                  {digits.filter(Boolean).length}/6
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                {digits.map((digit, idx) => {
                  const firstEmpty = digits.findIndex((d) => !d);
                  const isAhead = firstEmpty !== -1 && idx > firstEmpty;
                  const isFocused = focusedIndex === idx;
                  const isFilled = Boolean(digit);
                  const isPopping = poppingIndex === idx;
                  const hasPinError = Boolean(
                    joinError && (joinError.toLowerCase().includes('pin') || joinError.toLowerCase().includes('code'))
                  );

                  let stateClasses = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141F] text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-600';

                  if (isAhead) {
                    stateClasses = 'opacity-40 border-gray-200 dark:border-gray-800/70 bg-gray-50/50 dark:bg-gray-900/30 text-gray-400 dark:text-gray-600 cursor-not-allowed';
                  } else if (isFocused) {
                    stateClasses = 'border-[#635BFF] dark:border-[#7C75FF] bg-white dark:bg-[#161925] text-gray-900 dark:text-white ring-4 ring-[#635BFF]/20 dark:ring-[#7C75FF]/30 scale-105 -translate-y-0.5 shadow-lg shadow-[#635BFF]/20 z-10';
                  } else if (hasPinError) {
                    stateClasses = 'border-rose-400 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-black shadow-xs ring-2 ring-rose-400/20';
                  } else if (isFilled) {
                    stateClasses = 'border-[#635BFF]/50 dark:border-[#7C75FF]/50 bg-violet-500/10 dark:bg-violet-500/15 text-[#635BFF] dark:text-[#A59EFF] font-black shadow-xs';
                  }

                  return (
                    <div key={idx} className="relative aspect-square">
                      <input
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        readOnly={isAhead || isValidatingPin}
                        onChange={(e) => handleDigitChange(idx, e)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        onPaste={handleDigitPaste}
                        onFocus={() => handleBoxFocus(idx)}
                        onBlur={() => setFocusedIndex(null)}
                        className={`w-full h-full text-center text-xl sm:text-2xl font-black font-mono rounded-xl sm:rounded-2xl border transition-all duration-200 ease-out outline-none select-none ${stateClasses} ${
                          isPopping ? 'animate-pin-pop' : ''
                        }`}
                        aria-label={`Digit ${idx + 1} of Room PIN`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Your Name
              </label>
              <input
                ref={nameInputRef}
                type="text"
                maxLength={30}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                disabled={isValidatingPin}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141F] text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#635BFF] focus:ring-4 focus:ring-violet-500/20 transition-all disabled:opacity-60"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isValidatingPin}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-75 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isValidatingPin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Connecting to Room...</span>
                </>
              ) : (
                <>
                  <span>Join Arena</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
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
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Connected</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-gray-400">PIN: {pin}</span>
            <button
              type="button"
              onClick={handleLeaveArena}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Center Welcome Card */}
        <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-8 text-center space-y-4 shadow-sm my-auto">
          <div className="w-16 h-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto font-black text-2xl shadow-inner">
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">You're in, {playerName}!</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The quiz will start shortly!
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
          Powered by Eventora
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3.5: ROUND TRANSITION
  // =========================================================================
  if (roomState.status === 'ROUND_TRANSITION') {
    return (
      <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] flex flex-col justify-between p-4 max-w-md w-full mx-auto space-y-6">
        {/* Top bar with pin and status */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Round Transition</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-gray-400">PIN: {pin}</span>
            <button
              type="button"
              onClick={handleLeaveArena}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Center Round Card */}
        <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-8 text-center space-y-4 shadow-sm my-auto animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto font-black text-2xl shadow-inner">
            ⚡
          </div>
          <div className="space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Round {roomState.round || 2} of {roomState.totalRounds || 2}
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              Get Ready for Round {roomState.round || 2}!
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Previous round completed. Current score: <strong className="text-violet-600 dark:text-violet-400">{totalScore} pts</strong>
            </p>
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-bold animate-pulse">
              <Radio className="w-4 h-4 text-violet-500" />
              <span>Waiting for Quiz Master to start Round {roomState.round || 2}...</span>
            </div>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center py-4 text-[11px] text-gray-400">
          Powered by Eventora
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: LEADERBOARD & FINAL RESULTS (All Participants)
  // =========================================================================
  if (roomState.status === 'LEADERBOARD' || roomState.status === 'FINISHED') {
    const isFinished = roomState.status === 'FINISHED';
    const participantsList = Array.isArray(roomState.leaderboard) ? roomState.leaderboard : [];
    const sorted = computeStandings(participantsList, 'correctCount');
    const myStats = sorted.find((p) => p.id === playerId);
    const myRank = myStats?.rank ?? null;
    const myIsTied = myStats?.isTied ?? false;

    return (
      <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] flex flex-col justify-between p-4 max-w-2xl w-full mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
              {isFinished ? 'Final Results' : 'Round Standings'}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleLeaveArena}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isFinished ? 'Exit Arena' : 'Leave'}</span>
          </button>
        </div>

        {/* Hero: Player's Personal Placement */}
        <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-lg shadow-violet-500/25">
            {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🏆'}
          </div>
          <div className="space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              {isFinished ? 'Your Final Standing' : 'Your Current Position'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {myRank ? (
                <>
                  {myRank === 1 && `🎉 1st Place${myIsTied ? ' (Tied)' : ''}! Champion!`}
                  {myRank === 2 && `🥈 2nd Place${myIsTied ? ' (Tied)' : ''}! Outstanding!`}
                  {myRank === 3 && `🥉 3rd Place${myIsTied ? ' (Tied)' : ''}! Great job!`}
                  {myRank > 3 && `Rank #${myRank}${myIsTied ? ' (Tied)' : ''} of ${sorted.length}`}
                </>
              ) : (
                playerName
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              You scored <span className="font-extrabold text-violet-600 dark:text-violet-400">{totalScore} pts</span>
              {myStats?.correctCount !== undefined ? ` with ${myStats.correctCount} correct answers` : ''}
            </p>
          </div>
        </div>

        {/* Complete Results Table for All Participants */}
        <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex-1">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
              All Participants ({sorted.length})
            </h3>
            {!isFinished && (
              <span className="text-[11px] font-bold text-gray-400">
                Updating Live
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-100 dark:border-gray-800 max-h-[420px] overflow-y-auto">
            {sorted.map((p, idx) => {
              const isMe = p.id === playerId;

              return (
                <div
                  key={p.id || idx}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    isMe
                      ? 'bg-violet-500/10 dark:bg-violet-500/15 border-l-4 border-violet-600'
                      : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-16 text-center font-black text-xs sm:text-sm">
                      {getRankBadge(p.rank, p.isTied, 'short')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                          {p.name}
                        </span>
                        {isMe && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-semibold">
                        {p.correctCount || 0} correct
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-[#635BFF] dark:text-[#A59EFF] font-black text-xs sm:text-sm">
                      {p.score || 0} pts
                    </span>
                  </div>
                </div>
              );
            })}

            {sorted.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400 font-medium">
                No participant scores recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer info / next question notice */}
        <div className="pt-2 text-center">
          {isFinished ? (
            <button
              type="button"
              onClick={handleLeaveArena}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 cursor-pointer transition-all"
            >
              Exit Arena
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-bold animate-pulse">
              <Radio className="w-4 h-4 text-violet-500" />
              <span>Waiting for Quiz Master to start next question...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: QUESTION CANCELLED
  // =========================================================================
  if (roomState.status === 'QUESTION_CANCELLED') {
    return (
      <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] flex flex-col justify-between p-4 max-w-xl w-full mx-auto text-center space-y-6">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{playerName}</span>
          </div>
          <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black text-xs">
            Score: {totalScore} pts
          </span>
        </div>

        <div className="my-auto p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#161925] border-2 border-rose-500/30 text-center space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border-2 border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
            <Ban className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider">
              Question {roomState.questionNumber || ''} Voided
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              Question Cancelled
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              This question was cancelled by the quiz master. No points were awarded or deducted.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400">
            <Clock className="w-4 h-4 animate-spin text-violet-500" />
            <span>Waiting for the next question...</span>
          </div>
        </div>

        <div className="text-center py-4 text-[11px] text-gray-400">
          Powered by Eventora
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

  const isDirect = roomState.question?.format === 'direct' || (!roomState.question?.options?.length && (roomState.question?.answer !== undefined || roomState.correctAnswer !== undefined || roomState.isDirect));
  const isTwoChances = Boolean(roomState.question?.isTwoChances);

  const sortedLeaderboard = Array.isArray(roomState.leaderboard)
    ? computeStandings(roomState.leaderboard, 'correctCount')
    : [];

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] flex flex-col justify-between p-4 max-w-4xl w-full mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        {/* Row 1: Round / Question on Left | Player Name & Timer on Right */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {roomState.totalRounds > 1 && (
              <span className="px-3 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black text-xs">
                Round {roomState.round || 1} of {roomState.totalRounds}
              </span>
            )}
            <span className="px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-extrabold text-xs">
              Question {questionNumber} of {totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Player badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="truncate max-w-[140px]">{playerName}</span>
            </div>

            {/* Live countdown badge */}
            {isQuestionActive && localTimer !== null && (
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${
                  localTimer <= 5
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{localTimer}s</span>
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Marks & Penalties on Left | Standings & Score on Right */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2.5 border-t border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            {isTwoChances ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-900/40 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 text-xs shadow-xs">
                <span
                  className={`font-black ${
                    attemptNumber === 1
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-400 dark:text-gray-500 line-through'
                  }`}
                  title="Points awarded if correct on 1st attempt"
                >
                  1st Try: +{question?.marks || 1} pts
                </span>
                <span className="text-gray-400 dark:text-gray-600 font-bold">•</span>
                <span
                  className="font-black text-amber-500 dark:text-yellow-400"
                  title="Points awarded if correct on 2nd attempt"
                >
                  2nd Try: +{question?.secondTryMarks !== undefined ? question.secondTryMarks : Math.max(1, Math.round((question?.marks || 1) / 2))} pts
                </span>
              </div>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                +{question?.marks || 1} pts
              </span>
            )}

            {/* Penalty indicators if configured */}
            {(() => {
              const wrongPen = Number(question?.penaltyMarks) || Number(roomState.penaltyMarks) || 0;
              const secondPen = Number(question?.secondTryPenaltyMarks) || Number(roomState.secondTryPenaltyMarks) || 0;
              const unansPen = Number(question?.unansweredPenaltyMarks) || Number(roomState.unansweredPenaltyMarks) || 0;
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
            {/* Standings Modal Button */}
            {sortedLeaderboard.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStandingsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold text-xs transition-colors cursor-pointer border border-violet-200 dark:border-violet-800/60"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Standings</span>
              </button>
            )}

            {/* Current Score Badge */}
            <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black text-xs">
              Your Score: {totalScore} pts
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6 flex-1 flex flex-col justify-center">
        {/* Question Header & Media */}
        {question && (
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm text-center space-y-3">
            {question.mediaUrl && (
              <div className="rounded-2xl overflow-hidden mb-3">
                <MediaViewer
                  mediaUrl={question.mediaUrl}
                  mediaType={question.mediaType || 'image'}
                  className="w-full max-h-[260px]"
                />
              </div>
            )}
            <h2 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-relaxed">
              {question.text}
            </h2>
          </div>
        )}

        {/* FEEDBACK BANNER (If Answer Revealed by Host) */}
        {isRevealed && (
          <div className="animate-in zoom-in-95 duration-200">
            {(() => {
              const didAnswer = isDirect ? Boolean(submittedTextAnswer || textAnswer) : selectedOption !== null;
              const isCorrect = Boolean(lastRoundResult?.isCorrect ?? (isDirect ? false : (didAnswer && selectedOption === correctIndex)));

              if (isCorrect) {
                return (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-center space-y-1">
                    <div className="flex items-center justify-center gap-2 font-black text-base sm:text-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span>Correct Answer!</span>
                    </div>
                    <p className="text-xs font-bold opacity-90">
                      +{lastRoundResult?.points ?? (question?.marks || 1)} points awarded
                    </p>
                  </div>
                );
              }

              if (didAnswer && !isCorrect) {
                const penaltyPts = typeof lastRoundResult?.points === 'number' ? lastRoundResult.points : 0;
                return (
                  <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-center space-y-1">
                    <div className="flex items-center justify-center gap-2 font-black text-base sm:text-lg">
                      <XCircle className="w-5 h-5 text-rose-500" />
                      <span>Wrong Answer</span>
                    </div>
                    <p className="text-xs font-bold opacity-90">
                      {penaltyPts < 0 ? `${penaltyPts} points penalty` : '0 points'} {isDirect ? (roomState.correctAnswer ? `(Answer was: ${roomState.correctAnswer})` : '') : (correctIndex !== null ? `(Correct was Option ${OPTION_LETTERS[correctIndex]})` : '')}
                    </p>
                  </div>
                );
              }

              // Timeout / Did not answer
              const unansPenalty = typeof lastRoundResult?.points === 'number' ? lastRoundResult.points : 0;
              return (
                <div className="p-4 rounded-2xl bg-gray-500/15 border border-gray-500/30 text-gray-600 dark:text-gray-400 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 font-black text-base sm:text-lg">
                    <Clock className="w-5 h-5" />
                    <span>Time's Up!</span>
                  </div>
                  <p className="text-xs font-bold opacity-90">
                    {unansPenalty < 0 ? `No answer submitted (${unansPenalty} penalty points)` : 'No answer submitted (0 points)'}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Answer Input or Options Grid */}
        {isDirect ? (
          /* Direct Q&A Participant UI */
          <div className="space-y-4">
            {/* Correct Answer Banner on reveal */}
            {isRevealed && (
              <div className="p-4 sm:p-5 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-center space-y-1 animate-in zoom-in-95 duration-200">
                <span className="text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Correct Answer
                </span>
                <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-relaxed sm:leading-[1.7] break-words py-1">
                  {roomState.correctAnswer || question?.answer || 'Revealed'}
                </p>
                {Array.isArray(roomState.acceptableAnswers) && roomState.acceptableAnswers.length > 0 && (
                  <div className="pt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Also accepted:</span>
                    {roomState.acceptableAnswers.map((alt, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-white dark:bg-[#161925] text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-800 shadow-xs"
                      >
                        {alt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input Form while question is active and not locked */}
            {isQuestionActive && !isAnswerLocked && (
              <form onSubmit={handleSubmitTextAnswer} className="space-y-3.5">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Type Your Answer
                  </label>
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    disabled={localTimer === 0}
                    placeholder="Enter your answer here..."
                    autoFocus
                    className="w-full px-5 py-4 rounded-2xl border-2 border-violet-500/30 bg-white dark:bg-[#161925] text-base sm:text-lg font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-500/20 shadow-sm transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!textAnswer.trim() || localTimer === 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Submit Answer</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Answer Locked Notice */}
            {isAnswerLocked && !isRevealed && (
              <div className="p-5 rounded-2xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-violet-700 dark:text-violet-300 font-bold text-xs sm:text-sm">
                  <Check className="w-4 h-4 text-violet-600" />
                  <span>Answer locked in! Waiting for results...</span>
                </div>
                <div className="py-2.5 px-5 rounded-xl bg-white dark:bg-[#161925] border border-violet-200 dark:border-violet-800/80 inline-block max-w-full shadow-xs">
                  <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white font-mono break-words">
                    "{submittedTextAnswer || textAnswer}"
                  </span>
                </div>
              </div>
            )}

            {/* Submitted Answer Recap on reveal */}
            {isRevealed && (
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 text-center space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Your Answer
                </span>
                <p className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200">
                  {submittedTextAnswer || textAnswer ? `"${submittedTextAnswer || textAnswer}"` : '(No answer submitted)'}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* MCQ Options Buttons Grid */
          <div className="space-y-3">
            {twoChanceNotice && isQuestionActive && !isAnswerLocked && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-center text-xs font-bold animate-pulse flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{twoChanceNotice}</span>
              </div>
            )}

            {isAnswerLocked && isQuestionActive && (
              <div className="p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-center text-xs font-bold animate-pulse flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-violet-600" />
                <span>Answer locked in! Waiting for timer / results...</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {(question?.options || []).map((opt, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrect = isRevealed && optIdx === correctIndex;
                const isWrongPick = isRevealed && isSelected && optIdx !== correctIndex;
                const isDisabledPick = disabledOptionIndices.includes(optIdx);
                const color = OPTION_COLORS[optIdx % OPTION_COLORS.length];

                let cardClasses = `border-2 ${color.card} text-gray-900 dark:text-white`;
                let badgeClasses = color.badge;

                if (isDisabledPick && !isRevealed) {
                  cardClasses = 'opacity-40 border-rose-300 dark:border-rose-900/60 bg-rose-500/5 text-rose-500 cursor-not-allowed';
                  badgeClasses = 'bg-rose-500/20 text-rose-500';
                } else if (isAnswerLocked && !isRevealed) {
                  if (isSelected) {
                    cardClasses = `${color.selected} scale-[1.01]`;
                    badgeClasses = color.selectedBadge;
                  } else {
                    cardClasses = 'opacity-45 scale-[0.98] border-gray-200 dark:border-gray-800 bg-white/5 dark:bg-white/[0.03] text-gray-400 cursor-not-allowed';
                    badgeClasses = 'bg-gray-200 dark:bg-gray-800 text-gray-500';
                  }
                }

                if (isRevealed) {
                  if (isCorrect) {
                    cardClasses = 'bg-emerald-600 text-white border-2 border-emerald-400 ring-4 ring-emerald-500/25 shadow-lg shadow-emerald-600/20 font-black scale-[1.01]';
                    badgeClasses = 'bg-white/20 text-white';
                  } else if (isWrongPick) {
                    cardClasses = 'bg-rose-600 text-white border-2 border-rose-500 ring-4 ring-rose-500/25 opacity-90';
                    badgeClasses = 'bg-white/20 text-white';
                  } else {
                    cardClasses = 'opacity-50 border-gray-200 dark:border-gray-800 bg-white/5 dark:bg-white/[0.03] text-gray-400 cursor-not-allowed';
                    badgeClasses = 'bg-gray-200 dark:bg-gray-800 text-gray-400';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={isAnswerLocked || !isQuestionActive || localTimer === 0 || isDisabledPick}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full h-full min-h-[72px] p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left flex flex-col justify-center ${cardClasses}`}
                  >
                    <div className="w-full flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs transition-colors ${badgeClasses}`}>
                          {OPTION_LETTERS[optIdx]}
                        </span>
                        <span className="font-bold text-base sm:text-lg leading-relaxed break-words min-w-0 flex-1">
                          {opt.text}
                        </span>
                      </div>

                      {isSelected && !isRevealed && !isDisabledPick && (
                        <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-4 h-4 text-white stroke-[2.5]" />
                        </span>
                      )}
                      {isDisabledPick && !isRevealed && (
                        <span className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 shadow-xs">
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      )}
                      {isRevealed && isCorrect && (
                        <span className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0 text-white shadow-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                      )}
                      {isRevealed && isWrongPick && (
                        <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white shadow-xs">
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="text-center py-2 text-[11px] text-gray-400">
        Score updates live after every question
      </div>

      {/* Standings / Leaderboard Slide Modal */}
      {showStandingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowStandingsModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  Live Standings ({sortedLeaderboard.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStandingsModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
              {sortedLeaderboard.map((p, idx) => {
                const isMe = p.id === playerId;
                return (
                  <div
                    key={p.id || idx}
                    className={`py-3 px-2 flex items-center justify-between gap-3 rounded-xl transition-colors ${
                      isMe ? 'bg-violet-500/10 dark:bg-violet-500/15' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-14 text-center font-black text-xs">
                        {getRankBadge(p.rank, p.isTied, 'short')}
                      </span>
                      <span className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {p.name} {isMe && <span className="text-[10px] text-violet-600 font-bold">(You)</span>}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-950/70 text-[#635BFF] dark:text-[#A59EFF] font-black text-xs">
                      {p.score || 0} pts
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowStandingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
