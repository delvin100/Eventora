import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Users,
  RotateCw,
  Plus,
  Trash2,
  Edit2,
  Search,
  Download,
  FileSpreadsheet,
  AlignLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Check,
  X,
  Clock,
  Shuffle,
  ChevronRight,
  ChevronDown,
  Trophy,
  Lock,
  Eye,
  XCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';

import WheelCanvas from '../components/wheel/WheelCanvas';
import EventParticipantsView from '../components/participants/EventParticipantsView';
import { playVictorySound } from '../components/wheel/audio/wheelAudio';
import { quizService, QUIZ_TYPES } from '../services/quizService';
import { slugify } from '../utils/slugUtils';
import MediaViewer from '../components/quiz/MediaViewer';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const getQuizSessionKey = (id, round = 1) => `eventora_quiz_session_${id}_r${round}`;

const loadSavedQuizSession = (id, round = 1) => {
  if (!id) return { usedQuestionIds: [], removedIds: [] };
  try {
    let raw = localStorage.getItem(getQuizSessionKey(id, round));
    if (!raw && Number(round) === 1) {
      raw = localStorage.getItem(`eventora_quiz_session_${id}`);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        usedQuestionIds: Array.isArray(parsed.usedQuestionIds) ? parsed.usedQuestionIds : [],
        removedIds: Array.isArray(parsed.removedIds) ? parsed.removedIds : []
      };
    }
  } catch (_) {}
  return { usedQuestionIds: [], removedIds: [] };
};

const saveQuizSession = (id, round = 1, usedQIds = new Set(), remIds = new Set()) => {
  if (!id) return;
  try {
    localStorage.setItem(getQuizSessionKey(id, round), JSON.stringify({
      usedQuestionIds: Array.from(usedQIds),
      removedIds: Array.from(remIds)
    }));
  } catch (_) {}
};

const clearQuizSession = (id) => {
  if (!id) return;
  try {
    localStorage.removeItem(getQuizSessionKey(id));
  } catch (_) {}
};

function formatTimeSeconds(totalSec) {
  if (totalSec === null || totalSec === undefined) return '';
  const s = Number(totalSec);
  if (isNaN(s)) return '';
  if (s >= 60) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${s}s`;
}

function StylishDurationDropdown({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const DURATION_OPTIONS = [
    { value: 3, label: '3s fast' },
    { value: 5, label: '5s standard' },
    { value: 8, label: '8s suspense' },
    { value: 10, label: '10s dramatic' }
  ];

  const current = DURATION_OPTIONS.find(o => o.value === value) || DURATION_OPTIONS[1];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
      >
        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span>{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#635BFF]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 w-36 rounded-xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-gray-700 shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
          {DURATION_OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-violet-50 dark:bg-violet-950/60 text-[#635BFF] dark:text-[#8881FF] font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#635BFF] dark:text-[#8881FF] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

class QuizPlayErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('QuizPlay caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-[#161925] border border-red-200 dark:border-red-900/50 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center font-bold text-lg">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Something went wrong on the quiz arena</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected error occurred while rendering the quiz stage.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-bold hover:bg-[#5145E5] transition-all cursor-pointer shadow-md shadow-[#635BFF]/25"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function QuizPlayPageContent() {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  // Master Participants State (all enrolled students with cumulative marks)
  const [allParticipants, setAllParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'participants'); // 'participants' | 'wheel' | 'scoreboard'
  const [showingIntro, setShowingIntro] = useState(null); // 'quiz' | 'round' | null
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return Boolean(
      location.state?.startQuiz ||
      location.state?.fullscreen ||
      location.pathname.endsWith('/wheel') ||
      location.state?.tab === 'wheel'
    );
  });

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // If there are no participants yet and we finished loading, keep user on participants tab
  useEffect(() => {
    if (!loading && allParticipants.length === 0 && activeTab !== 'participants') {
      setActiveTab('participants');
    }
  }, [loading, allParticipants.length, activeTab]);

  const [removedIds, setRemovedIds] = useState(new Set()); // IDs of students who have completed turn (Fair Turn)
  const [scoreboardSearch, setScoreboardSearch] = useState('');
  const [quickName, setQuickName] = useState('');

  // Wheel State
  const wheelRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [celebrationEnabled, setCelebrationEnabled] = useState(true);
  const [fairTurn, setFairTurn] = useState(true);
  const [duration, setDuration] = useState(5);

  // Quiz Game Arena / Turn State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState(new Set());
  const [currentWinner, setCurrentWinner] = useState(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [turnHistory, setTurnHistory] = useState([]);

  // One Question - 2 Chances state
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [firstAttemptWrongIdx, setFirstAttemptWrongIdx] = useState(null);
  const [secondAttemptIdx, setSecondAttemptIdx] = useState(null);

  // Answer to Question (Direct Q&A) state
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [directResult, setDirectResult] = useState(null); // 'correct' | 'wrong' | null

  // Round Information
  const [currentRound, setCurrentRound] = useState(
    (location.state?.round ? Number(location.state.round) : null) || 1
  );

  const roundsList = Array.isArray(quiz?.rounds) && quiz.rounds.length > 0
    ? quiz.rounds
    : [{ roundNumber: 1, questions: quiz?.questions || [], quizType: quiz?.quizType }];
  const totalRounds = roundsList.length;
  const isLastRound = currentRound >= totalRounds;

  const activeRoundObj = (Array.isArray(quiz?.rounds) ? quiz.rounds.find(r => r.roundNumber === currentRound) : null) || roundsList[0] || { questions: quiz?.questions || [], quizType: quiz?.quizType };
  const currentRoundType = activeRoundObj?.quizType || quiz?.quizType || 'one_question_one_chance';
  const typeDef = QUIZ_TYPES.find(t => t.id === currentRoundType) || QUIZ_TYPES[0];

  const isTwoChances = currentRoundType === 'one_question_two_chances';
  const isDirect = currentRoundType === 'answer_to_question';
  const isQuestionDirect = isDirect || (currentRoundType === 'media_based' && activeQuestion?.format === 'direct');

  // Questions and pool
  const questionsList = Array.isArray(activeRoundObj?.questions) ? activeRoundObj.questions : (Array.isArray(quiz?.questions) ? quiz.questions : []);
  const availableQuestions = questionsList.filter(q => q && !usedQuestionIds.has(q.id));
  const currentQuestionToAsk = availableQuestions.length > 0 ? availableQuestions[0] : (questionsList.length > 0 ? questionsList[0] : null);

  // Eligible participants currently on the wheel
  const eligibleParticipants = Array.isArray(allParticipants)
    ? (fairTurn ? allParticipants.filter(p => p && !removedIds.has(p.id)) : allParticipants.filter(Boolean))
    : [];

  // Complete Round check: true if all questions are used, or eligible participants is 0 (all turns in round complete)
  const isQuizCompleted = allParticipants.length > 0 && questionsList.length > 0 && (
    eligibleParticipants.length === 0 ||
    availableQuestions.length === 0 ||
    usedQuestionIds.size >= questionsList.length
  );

  // Prevent background page scrolling when the Question Turn modal is open
  useEffect(() => {
    if (isQuestionModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isQuestionModalOpen]);

  // Load quiz details
  useEffect(() => {
    let isCancelled = false;

    async function loadQuiz() {
      try {
        setLoading(true);
        const targetLookup = location.state?.quizId || quizId;
        const data = await quizService.getQuizById(targetLookup);
        if (isCancelled) return;

        if (!data) {
          setLoading(false);
          return;
        }

        const activeRoundNum = (location.state?.round ? Number(location.state.round) : null) || data.currentRound || 1;
        setCurrentRound(activeRoundNum);
        setQuiz(data);
        const list = Array.isArray(data.participants) ? data.participants : [];
        const initialized = list.map(p => ({
          ...p,
          score: Number(p.score) || 0,
          turns: Number(p.turns) || 0,
          correct: Number(p.correct) || 0
        }));
        setAllParticipants(initialized);

        // Restore saved quiz session state for this round
        const savedSession = loadSavedQuizSession(data.id, activeRoundNum);
        const restoredRemovedIds = new Set(savedSession.removedIds);

        const currentRoundObj = (Array.isArray(data.rounds) ? data.rounds.find(r => r.roundNumber === activeRoundNum) : null) || { questions: data.questions || [] };
        const qList = Array.isArray(currentRoundObj.questions) ? currentRoundObj.questions : (Array.isArray(data.questions) ? data.questions : []);
        let restoredUsedQIds = new Set(savedSession.usedQuestionIds);

        if (qList.length > 0 && restoredUsedQIds.size >= qList.length) {
          restoredUsedQIds = new Set(qList.map(q => q.id));
        }

        setRemovedIds(restoredRemovedIds);
        setUsedQuestionIds(restoredUsedQIds);
        saveQuizSession(data.id, activeRoundNum, restoredUsedQIds, restoredRemovedIds);

        // Check if starting quiz from hub with intro
        if (location.state?.startQuiz) {
          if (data.introMediaUrl) {
            setShowingIntro('quiz');
          } else if (currentRoundObj?.introMediaUrl) {
            setShowingIntro('round');
            setActiveTab('wheel');
          } else {
            setShowingIntro(null);
            setActiveTab('wheel');
          }
        }

        if (data.name) {
          document.title = `${data.name} (Round ${activeRoundNum}) - Play | Eventora`;
        }
      } catch (err) {
        console.error('Failed to load quiz for play:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadQuiz();
    return () => { isCancelled = true; };
  }, [quizId]);

  // Proceed to Next Round handler: advances seamlessly right here on the play page
  const handleProceedToNextRound = async () => {
    if (!quiz?.id) return;
    const nextRoundNum = currentRound + 1;
    const existingRounds = Array.isArray(quiz.rounds) ? [...quiz.rounds] : [];

    // Mark current round as completed
    const updatedRounds = existingRounds.map(r => {
      if (r.roundNumber === currentRound) {
        return { ...r, isCompleted: true };
      }
      return r;
    });

    if (!updatedRounds.some(r => r.roundNumber === nextRoundNum)) {
      updatedRounds.push({
        roundNumber: nextRoundNum,
        quizType: quiz?.quizType || 'one_question_one_chance',
        isTypeConfirmed: true,
        questions: [],
        isCompleted: false
      });
    }

    try {
      localStorage.removeItem(getQuizSessionKey(quiz.id, nextRoundNum));
    } catch (_) {}

    const nextRoundObj = updatedRounds.find(r => r.roundNumber === nextRoundNum);
    const nextQuestions = nextRoundObj?.questions || [];

    // Reset round session state for all participants to have their turns in the new round
    setUsedQuestionIds(new Set());
    setRemovedIds(new Set());
    setCurrentWinner(null);
    setActiveQuestion(null);
    setIsQuestionModalOpen(false);
    saveQuizSession(quiz.id, nextRoundNum, new Set(), new Set());

    // Update in backend / cache
    await quizService.updateQuiz(quiz.id, {
      currentRound: nextRoundNum,
      rounds: updatedRounds,
      questions: nextQuestions,
      participants: allParticipants
    });

    // Update local state
    setCurrentRound(nextRoundNum);
    setQuiz(prev => ({
      ...prev,
      currentRound: nextRoundNum,
      rounds: updatedRounds,
      questions: nextQuestions
    }));

    if (quiz.name) {
      document.title = `${quiz.name} (Round ${nextRoundNum}) - Play | Eventora`;
    }

    // Switch to wheel tab or show round intro if configured, entering fullscreen by default
    setIsFullscreen(true);
    if (nextRoundObj?.introMediaUrl) {
      setShowingIntro('round');
      setActiveTab('wheel');
    } else {
      setShowingIntro(null);
      setActiveTab('wheel');
    }
  };

  // Finish Quiz handler
  const handleFinishQuiz = async () => {
    if (!quiz?.id) return;
    try {
      const existingRounds = Array.isArray(quiz.rounds) ? [...quiz.rounds] : [];
      const updatedRounds = existingRounds.map(r => {
        if (r.roundNumber === currentRound) {
          return { ...r, isCompleted: true };
        }
        return r;
      });

      await quizService.updateQuiz(quiz.id, {
        isFinished: true,
        rounds: updatedRounds,
        participants: allParticipants
      });
      setQuiz(prev => ({ ...prev, isFinished: true, rounds: updatedRounds }));
      confetti({
        particleCount: 130,
        spread: 100,
        origin: { y: 0.6 }
      });
      playVictorySound();
    } catch (err) {
      console.error('Failed to finish quiz:', err);
    }
  };

  // Save participants updates helper
  const persistParticipants = useCallback(async (updated) => {
    setAllParticipants(updated);
    if (quiz?.id) {
      try {
        await quizService.saveQuizParticipants(quiz.id, updated);
      } catch (err) {
        console.error('Failed to save participants:', err);
      }
    }
  }, [quiz?.id]);

  // Add single participant
  const handleAddParticipant = (pData) => {
    const newP = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: pData.name,
      external_identifier: pData.external_identifier || '',
      score: 0,
      turns: 0,
      correct: 0,
      metadata: pData.metadata || {},
      created_at: new Date().toISOString()
    };
    const nextList = [...allParticipants, newP];
    persistParticipants(nextList);
  };

  // Edit participant
  const handleEditParticipant = (id, pData) => {
    const nextList = allParticipants.map(p => {
      if (p.id === id) {
        return {
          ...p,
          name: pData.name,
          external_identifier: pData.external_identifier || p.external_identifier,
          score: pData.score !== undefined ? Number(pData.score) : (p.score || 0),
          metadata: pData.metadata || p.metadata
        };
      }
      return p;
    });
    persistParticipants(nextList);
  };

  // Bulk add participants
  const handleBulkAdd = (items) => {
    const formatted = items.map((item, idx) => ({
      id: 'p_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 6),
      name: item.name,
      external_identifier: item.external_identifier || '',
      score: 0,
      turns: 0,
      correct: 0,
      metadata: item.metadata || {},
      created_at: new Date().toISOString()
    }));
    const nextList = [...allParticipants, ...formatted];
    persistParticipants(nextList);
  };

  // Quick single add from Wheel page
  const handleQuickAdd = (e) => {
    if (e) e.preventDefault();
    if (!quickName.trim()) return;
    handleAddParticipant({ name: quickName.trim() });
    setQuickName('');
  };

  // Seed 3 demo students from Wheel page
  const handleAddSampleParticipants = () => {
    const samples = [
      { name: 'Student 1' },
      { name: 'Student 2' },
      { name: 'Student 3' },
      { name: 'Student 4' }
    ];
    handleBulkAdd(samples);
  };

  // Delete participant
  const handleDeleteParticipant = (pId) => {
    const nextList = allParticipants.filter(p => p.id !== pId);
    persistParticipants(nextList);
    setRemovedIds(prev => {
      const next = new Set(prev);
      next.delete(pId);
      return next;
    });
  };

  // Bulk delete selected
  const handleBulkDelete = (ids) => {
    const idSet = new Set(ids);
    const nextList = allParticipants.filter(p => !idSet.has(p.id));
    persistParticipants(nextList);
    setRemovedIds(prev => new Set([...prev].filter(id => !idSet.has(id))));
  };

  // Reset turns for wheel and restore question pool
  const handleResetTurns = () => {
    setRemovedIds(new Set());
    setUsedQuestionIds(new Set());
  };

  // Reset all student scores to 0 and restore question pool
  const handleResetAllScores = () => {
    if (!window.confirm('Reset all student scores to 0, clear questions history, and reset the wheel?')) return;
    const reset = allParticipants.map(p => ({
      ...p,
      score: 0,
      turns: 0,
      correct: 0
    }));
    persistParticipants(reset);
    setTurnHistory([]);
    setRemovedIds(new Set());
    setUsedQuestionIds(new Set());
    clearQuizSession(quiz?.id);
  };

  // Export Scoreboard / Total Marks to CSV
  const handleExportCSV = () => {
    if (allParticipants.length === 0) return;
    const sorted = [...allParticipants].sort((a, b) => (b.score || 0) - (a.score || 0) || (b.correct || 0) - (a.correct || 0));
    const header = ['Rank', 'Student Name', 'Total Marks', 'Questions Taken', 'Correct Answers'];
    const rows = sorted.map((p, idx) => [
      idx + 1,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.score || 0,
      p.turns || 0,
      p.correct || 0
    ]);
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${slugify(quiz?.name || 'quiz')}-total-marks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Wheel Spin Trigger
  const handleSpinWheel = () => {
    if (isSpinning || eligibleParticipants.length === 0) return;
    if (wheelRef.current) {
      wheelRef.current.spin();
    }
  };

  // When Wheel Ends on a Participant
  const handleWheelEnd = (winner) => {
    setIsSpinning(false);
    setCurrentWinner(winner);
    setSelectedOptionIdx(null);
    setHasAnswered(false);
    setIsTimedOut(false);
    setTimeLeft(null);
    setAttemptNumber(1);
    setFirstAttemptWrongIdx(null);
    setSecondAttemptIdx(null);
    setIsAnswerRevealed(false);
    setDirectResult(null);

    // Pick a random unasked question from remaining questions!
    const available = questionsList.filter(q => !usedQuestionIds.has(q.id));
    let pickedQ = null;
    let pickedIdx = 0;

    if (available.length > 0) {
      pickedQ = available[Math.floor(Math.random() * available.length)];
      pickedIdx = questionsList.findIndex(q => q.id === pickedQ.id);
      if (pickedIdx < 0) pickedIdx = 0;
    }

    setCurrentQuestionIdx(pickedIdx);
    setActiveQuestion(pickedQ);

    if (celebrationEnabled) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    if (soundEnabled) {
      playVictorySound();
    }

    setIsQuestionModalOpen(true);
  };

  // Helper to persist turn and question completion
  const recordCompletedTurn = useCallback((currentQ, isCorrect, marksEarned, selectedText) => {
    const updatedAll = allParticipants.map(p => {
      if (p.id === currentWinner?.id) {
        return {
          ...p,
          score: (Number(p.score) || 0) + marksEarned,
          turns: (Number(p.turns) || 0) + 1,
          correct: (Number(p.correct) || 0) + (isCorrect ? 1 : 0)
        };
      }
      return p;
    });

    persistParticipants(updatedAll);

    let nextUsed = usedQuestionIds;
    if (currentQ?.id) {
      nextUsed = new Set([...usedQuestionIds, currentQ.id]);
      setUsedQuestionIds(nextUsed);
    }

    let nextRemoved = removedIds;
    if (currentWinner?.id) {
      nextRemoved = new Set([...removedIds, currentWinner.id]);
      setRemovedIds(nextRemoved);
    }

    saveQuizSession(quiz?.id, currentRound, nextUsed, nextRemoved);

    setTurnHistory(prev => [
      {
        id: 'turn_' + Date.now(),
        questionId: currentQ?.id,
        participantId: currentWinner?.id,
        participantName: currentWinner?.name || 'Participant',
        questionNumber: usedQuestionIds.size + 1,
        questionText: currentQ?.text || `Question ${usedQuestionIds.size + 1}`,
        selectedOptionText: selectedText,
        isCorrect,
        marksEarned,
        maxMarks: Number(currentQ?.marks) || 1,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);
  }, [allParticipants, currentWinner?.id, currentWinner?.name, persistParticipants, usedQuestionIds, removedIds, quiz?.id, currentRound]);

  // Handle question timeout when optional timeLimit runs out
  const handleTimeout = useCallback(() => {
    setHasAnswered(true);
    setIsTimedOut(true);
    setSelectedOptionIdx(null);

    if (isQuestionDirect) {
      setIsAnswerRevealed(true);
      setDirectResult('wrong');
    }
    if (isTwoChances) {
      setAttemptNumber(2);
    }

    const currentQ = activeQuestion || questionsList[currentQuestionIdx];

    // Award 0 points, increment turns completed
    const updatedAll = allParticipants.map(p => {
      if (p.id === currentWinner?.id) {
        return {
          ...p,
          turns: (Number(p.turns) || 0) + 1
        };
      }
      return p;
    });

    persistParticipants(updatedAll);

    // 1. Remove that question so it is not repeated
    let nextUsed = usedQuestionIds;
    if (currentQ?.id) {
      nextUsed = new Set([...usedQuestionIds, currentQ.id]);
      setUsedQuestionIds(nextUsed);
    }

    // 2. Remove the student who attended the question from upcoming wheel spins
    let nextRemoved = removedIds;
    if (currentWinner?.id) {
      nextRemoved = new Set([...removedIds, currentWinner.id]);
      setRemovedIds(nextRemoved);
    }

    saveQuizSession(quiz?.id, currentRound, nextUsed, nextRemoved);

    // Record in history
    setTurnHistory(prev => [
      {
        id: 'turn_' + Date.now(),
        questionId: currentQ?.id,
        participantId: currentWinner?.id,
        participantName: currentWinner?.name || 'Participant',
        questionNumber: usedQuestionIds.size + 1,
        questionText: currentQ?.text || `Question ${usedQuestionIds.size + 1}`,
        selectedOptionText: 'Time Expired (0 pts)',
        isCorrect: false,
        marksEarned: 0,
        maxMarks: Number(currentQ?.marks) || 1,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);
  }, [activeQuestion, questionsList, currentQuestionIdx, allParticipants, currentWinner, persistParticipants, usedQuestionIds, removedIds, quiz?.id, currentRound, isDirect, isQuestionDirect, isTwoChances]);

  // Active question countdown timer effect
  useEffect(() => {
    if (!isQuestionModalOpen || !activeQuestion || hasAnswered) return;
    const limit = Number(activeQuestion.timeLimit);
    if (!limit || limit <= 0) {
      setTimeLeft(null);
      return;
    }

    if (timeLeft === null) {
      setTimeLeft(limit);
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return limit - 1;
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isQuestionModalOpen, activeQuestion, hasAnswered, timeLeft, handleTimeout]);

  // Check Answer for Question (One Question - One Chance & Two Chances)
  const handleSelectOption = (optIdx) => {
    if (hasAnswered) return;
    const currentQ = activeQuestion || questionsList[currentQuestionIdx];
    if (!currentQ) return;

    const optText = currentQ?.options?.[optIdx]?.text || `Option ${OPTION_LETTERS[optIdx] || optIdx + 1}`;

    if (isTwoChances) {
      if (attemptNumber === 1) {
        const isCorrect = Boolean(currentQ?.options?.[optIdx]?.isCorrect);
        if (isCorrect) {
          // Participant answered correctly on 1st try!
          setSelectedOptionIdx(optIdx);
          setHasAnswered(true);
          const marksEarned = Number(currentQ?.marks) || 1;

          if (celebrationEnabled) {
            confetti({ particleCount: 90, spread: 80, origin: { y: 0.65 } });
          }
          if (soundEnabled) {
            playVictorySound();
          }

          recordCompletedTurn(currentQ, true, marksEarned, `${optText} (1st Try)`);
        } else {
          // Participant answered wrong on 1st try:
          // Just show that it was wrong, give 2nd chance, DO NOT REVEAL correct answer!
          setFirstAttemptWrongIdx(optIdx);
          setSelectedOptionIdx(optIdx);
          setAttemptNumber(2);
          if (Number(currentQ?.timeLimit) > 0) {
            setTimeLeft(Number(currentQ.timeLimit));
          }
        }
      } else if (attemptNumber === 2) {
        if (optIdx === firstAttemptWrongIdx) return;

        setSecondAttemptIdx(optIdx);
        setSelectedOptionIdx(optIdx);
        setHasAnswered(true);

        const isCorrect = Boolean(currentQ?.options?.[optIdx]?.isCorrect);
        const secondMarks = currentQ?.secondTryMarks !== undefined && !isNaN(Number(currentQ?.secondTryMarks))
          ? Number(currentQ.secondTryMarks)
          : Math.max(1, Math.round((Number(currentQ?.marks) || 1) / 2));
        const marksEarned = isCorrect ? secondMarks : 0;

        if (isCorrect) {
          if (celebrationEnabled) {
            confetti({ particleCount: 90, spread: 80, origin: { y: 0.65 } });
          }
          if (soundEnabled) {
            playVictorySound();
          }
        }

        recordCompletedTurn(currentQ, isCorrect, marksEarned, `${optText} (2nd Try)`);
      }
    } else {
      // Standard One Question - One Chance
      setSelectedOptionIdx(optIdx);
      setHasAnswered(true);

      const isCorrect = Boolean(currentQ?.options?.[optIdx]?.isCorrect);
      const marksEarned = isCorrect ? (Number(currentQ?.marks) || 1) : 0;

      if (isCorrect) {
        if (celebrationEnabled) {
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.65 } });
        }
        if (soundEnabled) {
          playVictorySound();
        }
      }

      recordCompletedTurn(currentQ, isCorrect, marksEarned, optText);
    }
  };

  // Mark Direct Question Result (Answer to Question mode)
  const handleMarkDirectResult = (isCorrect) => {
    if (hasAnswered) return;
    const currentQ = activeQuestion || questionsList[currentQuestionIdx];
    if (!currentQ) return;

    setHasAnswered(true);
    setDirectResult(isCorrect ? 'correct' : 'wrong');
    const marksEarned = isCorrect ? (Number(currentQ?.marks) || 1) : 0;

    if (isCorrect) {
      if (celebrationEnabled) {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.65 } });
      }
      if (soundEnabled) {
        playVictorySound();
      }
    }

    recordCompletedTurn(currentQ, isCorrect, marksEarned, isCorrect ? 'Marked Correct' : 'Marked Wrong');
  };

  const handleNextQuestion = () => {
    const questionsList = quiz?.questions || [];
    if (currentQuestionIdx < questionsList.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setCurrentQuestionIdx(0); // Loop back or keep at end
    }
    setIsQuestionModalOpen(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-gray-400 space-y-2">
        <HelpCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto animate-pulse" />
        <p>Loading Quiz Stage...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="py-20 text-center space-y-3">
        <HelpCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Quiz not found</h3>
        <p className="text-xs text-gray-400">The quiz may have been removed or does not exist.</p>
        <Link to="/app/quiz" className="text-xs font-semibold text-[#635BFF] hover:underline">
          Return to Quizzes
        </Link>
      </div>
    );
  }

  const currentQ = activeQuestion || questionsList[currentQuestionIdx] || null;
  const quizSlug = slugify(quiz.name) || quiz.id;

  return (
    <div
      className={`transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 overflow-y-auto bg-[#0F1117] text-[#F3F4F8] p-4 sm:p-6 lg:p-8 overscroll-contain space-y-6'
          : 'space-y-6 pb-12'
      }`}
    >
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Link to="/app/quiz" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              All Quizzes
            </Link>
            <span>/</span>
            <Link to={`/app/quiz/${quizSlug}`} className="hover:text-[#635BFF] transition-colors truncate max-w-[200px]">
              {quiz.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-bold">Participants & Wheel</span>
          </nav>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {quiz.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-600 text-white">
              Round {currentRound}{totalRounds > 1 ? ` of ${totalRounds}` : ''}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF]">
              {typeDef.name}
            </span>
          </div>
        </div>

        {/* Top Action Buttons: Fullscreen, Play Intro & Edit Questions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isFullscreen
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 ring-1 ring-amber-400'
                : 'bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Presentation Mode'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </>
            )}
          </button>

          {(quiz.introMediaUrl || activeRoundObj?.introMediaUrl) && (
            <button
              type="button"
              onClick={() => {
                if (quiz.introMediaUrl) setShowingIntro('quiz');
                else if (activeRoundObj?.introMediaUrl) setShowingIntro('round');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200/80 dark:border-violet-800/80 text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-violet-600" />
              <span>Play Intro</span>
            </button>
          )}

          <Link
            to={`/app/quiz/${quizSlug}/questions`}
            state={{ quizId: quiz.id, round: currentRound }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Questions</span>
          </Link>
        </div>
      </div>

      {/* Main Tabs (Participants vs Wheel vs Total Marks) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-[#161925] border border-gray-200 dark:border-gray-800 w-fit">
        <button
          type="button"
          onClick={() => {
            setShowingIntro(null);
            setActiveTab('participants');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            !showingIntro && activeTab === 'participants'
              ? 'bg-white dark:bg-[#202434] text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Participants</span>
          <span className="px-1.5 py-0.2 rounded-md bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-[10px] font-black">
            {allParticipants.length}
          </span>
        </button>

        {/* Spin Wheel Tab Button (Locked if no participants) */}
        <button
          type="button"
          disabled={allParticipants.length === 0}
          onClick={() => {
            if (allParticipants.length > 0) {
              setIsFullscreen(true);
              setShowingIntro(null);
              setActiveTab('wheel');
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            allParticipants.length === 0
              ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-500'
              : !showingIntro && activeTab === 'wheel'
              ? 'bg-[#635BFF] text-white shadow-xs cursor-pointer'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer'
          }`}
          title={allParticipants.length === 0 ? 'Add participants first to unlock the wheel' : 'Spin Wheel'}
        >
          {allParticipants.length === 0 ? (
            <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          ) : (
            <RotateCw className="w-4 h-4 shrink-0" />
          )}
          <span>Spin Wheel</span>
          {eligibleParticipants.length > 0 && fairTurn && (
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-black">
              {eligibleParticipants.length}
            </span>
          )}
        </button>

        {/* Results / Total Marks Tab Button (Locked if no participants) */}
        <button
          type="button"
          disabled={allParticipants.length === 0}
          onClick={() => {
            if (allParticipants.length > 0) {
              setShowingIntro(null);
              setActiveTab('scoreboard');
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            allParticipants.length === 0
              ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-500'
              : !showingIntro && activeTab === 'scoreboard'
              ? 'bg-amber-500 text-white shadow-xs cursor-pointer'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer'
          }`}
          title={allParticipants.length === 0 ? 'Add participants first to unlock results' : 'Total Marks & Results'}
        >
          {allParticipants.length === 0 ? (
            <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          ) : (
            <Trophy className="w-4 h-4 shrink-0" />
          )}
          <span>Total Marks</span>
        </button>
      </div>

      {/* ===================== INTRO PRESENTATION SCREEN ===================== */}
      {showingIntro ? (
        <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-xl space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-600 text-white">
                    {showingIntro === 'quiz' ? 'Quiz Introduction' : `Round ${currentRound} Introduction`}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF]">
                    {showingIntro === 'quiz' ? `${roundsList.length} Rounds` : typeDef.name}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {showingIntro === 'quiz' ? quiz.name : `Round ${currentRound}: ${typeDef.name}`}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {showingIntro === 'quiz'
                    ? (quiz.description || 'Welcome to the quiz! Enjoy the presentation below before we begin.')
                    : (typeDef.description || 'Watch or listen to the round intro before beginning the wheel turns.')}
                </p>
              </div>

              {/* Action Buttons: Fullscreen & Skip */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isFullscreen
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-gray-50 dark:bg-[#12141F] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (showingIntro === 'quiz' && activeRoundObj?.introMediaUrl) {
                      setShowingIntro('round');
                    } else {
                      setIsFullscreen(true);
                      setShowingIntro(null);
                      setActiveTab('wheel');
                    }
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-[#12141F] border border-gray-200 dark:border-gray-800 transition-colors cursor-pointer"
                >
                  Skip Intro
                </button>
              </div>
            </div>

            {/* Media Player */}
            <div className="rounded-2xl overflow-hidden bg-black/90 shadow-md">
              <MediaViewer
                mediaUrl={showingIntro === 'quiz' ? quiz.introMediaUrl : activeRoundObj?.introMediaUrl}
                mediaType={showingIntro === 'quiz' ? (quiz.introMediaType || 'video') : (activeRoundObj?.introMediaType || 'video')}
                autoPlay={true}
                className="w-full max-h-[500px]"
              />
            </div>

            {/* Bottom Proceed Controls */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (showingIntro === 'quiz' && activeRoundObj?.introMediaUrl) {
                    setShowingIntro('round');
                  } else {
                    setIsFullscreen(true);
                    setShowingIntro(null);
                    setActiveTab('wheel');
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-500/25 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span>
                  {showingIntro === 'quiz' && activeRoundObj?.introMediaUrl
                    ? `Next: Round ${currentRound} Intro`
                    : `Next: Proceed to Round ${currentRound} Wheel`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* ===================== TAB 1: PARTICIPANTS ===================== */}
      {activeTab === 'participants' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <EventParticipantsView
            eventId={quiz.id}
            eventName={quiz.name}
            customParticipants={allParticipants}
            onAddParticipant={handleAddParticipant}
            onUpdateParticipant={handleEditParticipant}
            onBulkAddParticipants={handleBulkAdd}
            onDeleteParticipant={handleDeleteParticipant}
            onBulkDeleteParticipants={handleBulkDelete}
          />

          {/* Bottom Callout to Wheel */}
          {allParticipants.length > 0 && (
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsFullscreen(true);
                  if (activeRoundObj?.introMediaUrl) {
                    setShowingIntro('round');
                  } else {
                    setShowingIntro(null);
                    setActiveTab('wheel');
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#635BFF]/25"
              >
                <span>Next: Spin Wheel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: SPIN WHEEL ===================== */}
      {activeTab === 'wheel' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {isQuizCompleted ? (
            /* Quiz Completed Stage when all participants completed turn OR all questions answered */
            <div className="max-w-xl mx-auto text-center py-14 px-6 rounded-3xl bg-gradient-to-b from-[#181B2A] to-[#12141F] border border-gray-800 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Trophy className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                  {quiz?.isFinished ? 'Quiz Concluded' : `Round ${currentRound} Completed`}
                </div>
                <h3 className="text-2xl font-black text-white">
                  {quiz?.isFinished ? 'Quiz Completed!' : `Round ${currentRound} Completed!`}
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {quiz?.isFinished
                    ? 'All rounds have concluded! You can review the final scores and rankings for each student.'
                    : isLastRound
                    ? `All questions in the final round (Round ${currentRound}) have been answered. You can now review total marks and finish the quiz.`
                    : `All questions in Round ${currentRound} have been answered. You can now review total marks or proceed to Round ${currentRound + 1}.`}
                </p>
              </div>

              {/* Quick Top 3 Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-md mx-auto">
                {(() => {
                  const sorted = [...allParticipants].sort((a, b) => (b.score || 0) - (a.score || 0) || (b.correct || 0) - (a.correct || 0)).slice(0, 3);
                  const medals = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
                  return sorted.map((p, idx) => (
                    <div key={p.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                      <span className="text-[10px] font-black text-amber-400 block">{medals[idx]}</span>
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#635BFF]/30 text-[#8881FF] font-black text-xs">
                        {p.score || 0} pts
                      </span>
                    </div>
                  ));
                })()}
              </div>

              {/* Buttons: 1) View Total Marks, 2) Proceed to Round N+1 (ONLY IF NOT LAST ROUND), 3) Finish Quiz (ONLY IF LAST ROUND) */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('scoreboard')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>View Total Marks</span>
                </button>

                {!quiz?.isFinished && !isLastRound && (
                  <button
                    type="button"
                    onClick={handleProceedToNextRound}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#635BFF]/30 cursor-pointer"
                  >
                    <span>Proceed to Round {currentRound + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {!quiz?.isFinished && isLastRound && (
                  <button
                    type="button"
                    onClick={handleFinishQuiz}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finish Quiz</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col items-center space-y-6">
              {questionsList.length === 0 && (
                <div className="w-full p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                    No questions added for Round {currentRound} yet
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 max-w-sm mx-auto">
                    Set up questions for Round {currentRound} first, then come back here to spin the wheel.
                  </p>
                  <Link
                    to={`/app/quiz/${quizSlug}/questions`}
                    state={{ quizId: quiz.id, round: currentRound }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold transition-all shadow-md shadow-[#635BFF]/30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Setup Questions for Round {currentRound}</span>
                  </Link>
                </div>
              )}

              {/* Wheel Container */}
              <div className="relative w-full max-w-md aspect-square flex items-center justify-center p-3 rounded-3xl bg-gradient-to-b from-[#181B2A] to-[#12141F] border border-gray-800 shadow-2xl overflow-hidden">
                <WheelCanvas
                  ref={wheelRef}
                  participants={
                    eligibleParticipants.length > 0
                      ? eligibleParticipants
                      : allParticipants.length > 0
                      ? allParticipants
                      : [
                          { id: 'demo1', name: 'Student 1' },
                          { id: 'demo2', name: 'Student 2' },
                          { id: 'demo3', name: 'Student 3' },
                          { id: 'demo4', name: 'Student 4' }
                        ]
                  }
                  duration={duration}
                  soundEnabled={soundEnabled}
                  isPaused={isQuestionModalOpen}
                  onSpinStart={() => setIsSpinning(true)}
                  onSpinEnd={handleWheelEnd}
                  className="w-full h-full"
                />
              </div>

              {/* Quick Add Participant Box when no participants enrolled */}
              {allParticipants.length === 0 && (
                <div className="w-full max-w-md p-4 rounded-2xl bg-white dark:bg-[#161925] border border-violet-200 dark:border-violet-900/50 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">Add Participants to Spin</h4>
                      <p className="text-[11px] text-gray-400">Enter student names to populate the wheel slices.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSampleParticipants}
                      className="text-[11px] font-bold text-[#635BFF] dark:text-[#8881FF] hover:underline cursor-pointer"
                    >
                      + Add Demo Students
                    </button>
                  </div>

                  <form onSubmit={handleQuickAdd} className="flex gap-2">
                    <input
                      type="text"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      placeholder="Student or team name..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12141F] text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30"
                    />
                    <button
                      type="submit"
                      disabled={!quickName.trim()}
                      className="px-4 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}

              {/* Slices / Remaining info & Scoreboard shortcut */}
              <div className="w-full max-w-md flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                <span>
                  {eligibleParticipants.length} students • {availableQuestions.length} questions remaining
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('scoreboard')}
                  className="inline-flex items-center gap-1 font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>View Total Marks</span>
                </button>
              </div>

              {/* Big Spin Action Button */}
              <div className="w-full max-w-md flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleSpinWheel}
                  disabled={isSpinning || eligibleParticipants.length === 0 || !currentQuestionToAsk}
                  className="w-full py-3.5 rounded-2xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-base font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#635BFF]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>
                    {isSpinning
                      ? 'Spinning...'
                      : eligibleParticipants.length === 0
                      ? 'Add Participants to Spin'
                      : !currentQuestionToAsk
                      ? 'All Round Questions Answered'
                      : 'Spin Wheel'}
                  </span>
                </button>

                {/* Wheel Settings Toolbar */}
                <div className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 text-xs">
                  {/* Stylish Duration Dropdown */}
                  <StylishDurationDropdown
                    value={duration}
                    onChange={setDuration}
                    disabled={isSpinning}
                  />

                  {/* Sound & Celebration Toggles */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        soundEnabled
                          ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400'
                          : 'border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title="Toggle Sound"
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCelebrationEnabled(!celebrationEnabled)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        celebrationEnabled
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                          : 'border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title="Toggle Celebration Confetti"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setFairTurn(!fairTurn)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
                        fairTurn
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title="When on, selected participants are removed from upcoming spins in this round"
                    >
                      Fair Turn: {fairTurn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Turn History Card */}
                {turnHistory.length > 0 && (
                  <div className="w-full max-w-md p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Recent Turns
                      </h4>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {turnHistory.length} turns recorded
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {turnHistory.map(th => (
                        <div
                          key={th.id}
                          className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-[#12141F] text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 dark:text-white">{th.participantName}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                              th.isCorrect
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            }`}>
                              {th.isCorrect ? `+${th.marksEarned} pts` : '0 pts'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            Q{th.questionNumber}: {th.questionText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: TOTAL MARKS / SCOREBOARD ===================== */}
      {activeTab === 'scoreboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Stats Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  Student Scoreboard & Total Marks
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Live rankings and total marks scored by each student in {quiz.name}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={allParticipants.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('wheel')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Back to Wheel</span>
              </button>

              {isQuizCompleted && !quiz?.isFinished && !isLastRound && (
                <button
                  type="button"
                  onClick={handleProceedToNextRound}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-[#635BFF]/25"
                >
                  <span>Proceed to Round {currentRound + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {isQuizCompleted && !quiz?.isFinished && isLastRound && (
                <button
                  type="button"
                  onClick={handleFinishQuiz}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-rose-600/25"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finish Quiz</span>
                </button>
              )}
            </div>
          </div>

          {/* Student Rankings Table */}
          <div className="rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs space-y-3 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                Rankings & Total Marks
              </h3>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={scoreboardSearch}
                  onChange={e => setScoreboardSearch(e.target.value)}
                  placeholder="Search student..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#12141F] text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#635BFF]"
                />
              </div>
            </div>

            {allParticipants.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
                <p>No participants enrolled yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 w-16">Rank</th>
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3 text-center">Questions</th>
                      <th className="py-3 px-3 text-center">Correct</th>
                      <th className="py-3 px-3 text-right">Total Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(() => {
                      const filtered = allParticipants
                        .filter(p => !scoreboardSearch || p.name?.toLowerCase().includes(scoreboardSearch.toLowerCase()) || p.external_identifier?.toLowerCase().includes(scoreboardSearch.toLowerCase()))
                        .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.correct || 0) - (a.correct || 0));

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-400">
                              No students match "{scoreboardSearch}"
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((p, idx) => {
                        const rankBadges = ['🥇', '🥈', '🥉'];
                        const rankColor = idx === 0 ? 'text-amber-500 font-black' : idx === 1 ? 'text-slate-400 font-black' : idx === 2 ? 'text-amber-700 font-black' : 'text-gray-400 font-bold';

                        return (
                          <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-[#12141F]/60 transition-colors">
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 ${rankColor}`}>
                                {idx < 3 ? rankBadges[idx] : `#${idx + 1}`}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                              {p.name}
                            </td>
                            <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-300 font-medium">
                              {p.turns || 0}
                            </td>
                            <td className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
                              {p.correct || 0}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="inline-block px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/70 text-[#635BFF] dark:text-[#A59EFF] font-black text-xs">
                                {p.score || 0} pts
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {/* ===================== QUIZ QUESTION TURN MODAL ===================== */}
      {isQuestionModalOpen && currentWinner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto overscroll-contain rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Selected By Wheel
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    {currentWinner.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isTwoChances && activeQuestion && (
                  <span className={`px-2.5 py-1 rounded-xl font-black text-xs ${
                    hasAnswered
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      : attemptNumber === 1
                      ? 'bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300'
                      : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 animate-pulse'
                  }`}>
                    {hasAnswered ? 'Completed' : attemptNumber === 1 ? '1st Chance' : '2nd Chance'}
                  </span>
                )}

                {activeQuestion && Number(activeQuestion.timeLimit) > 0 && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-all ${
                      isTimedOut
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                        : timeLeft !== null && timeLeft <= 3 && !hasAnswered
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 animate-pulse border border-rose-300 dark:border-rose-800'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                    }`}
                    title="Time limit for this question"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {isTimedOut
                        ? "Time's up"
                        : hasAnswered
                        ? formatTimeSeconds(activeQuestion.timeLimit)
                        : formatTimeSeconds(timeLeft !== null ? timeLeft : activeQuestion.timeLimit)}
                    </span>
                  </span>
                )}

                {activeQuestion && (
                  <span className="px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-extrabold text-xs">
                    {isTwoChances
                      ? `${(attemptNumber === 2 ? (activeQuestion.secondTryMarks !== undefined ? activeQuestion.secondTryMarks : 1) : (activeQuestion.marks || 1))} pts`
                      : `${activeQuestion.marks || 1} pts`}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {activeQuestion ? (
              <>
                {/* Media Attachment (Image, Video, Audio) if provided */}
                {activeQuestion.mediaUrl && (
                  <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12141F]">
                    <MediaViewer
                      mediaUrl={activeQuestion.mediaUrl}
                      mediaType={activeQuestion.mediaType || 'image'}
                      className="w-full max-h-[340px]"
                    />
                  </div>
                )}

                {/* Question Text */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    <span>Question ({usedQuestionIds.size + (hasAnswered ? 0 : 1)} of {questionsList.length})</span>
                    <span className="text-gray-400 font-medium normal-case text-[10px]">
                      {Math.max(0, questionsList.length - usedQuestionIds.size - (hasAnswered ? 0 : 1))} remaining
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white leading-snug">
                    {activeQuestion.text || `Question ${usedQuestionIds.size + 1}`}
                  </h2>

                  {/* Countdown Progress Bar (if timeLimit is set and question is active) */}
                  {Number(activeQuestion.timeLimit) > 0 && !hasAnswered && timeLeft !== null && (
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                          timeLeft <= 3 ? 'bg-rose-500' : timeLeft <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.max(0, Math.min(100, (timeLeft / Number(activeQuestion.timeLimit)) * 100))}%`
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Mode 1: Answer to Question / Direct Q&A without options */}
                {isQuestionDirect ? (
                  <div className="space-y-4 pt-2">
                    {!isAnswerRevealed ? (
                      <div className="py-6 flex flex-col items-center justify-center gap-3 bg-gray-50/70 dark:bg-[#12141F] rounded-2xl border border-dashed border-violet-300 dark:border-violet-900/60 p-6 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                          Direct question without options. Participant gives their answer verbally or in person. Click below to reveal the official answer.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAnswerRevealed(true);
                            setTimeLeft(null);
                          }}
                          className="py-3 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-violet-500/25 transition-all cursor-pointer hover:scale-[1.02]"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Show Answer</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        {/* Revealed Answer Box */}
                        <div className="p-5 rounded-2xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 space-y-1.5 shadow-xs">
                          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Revealed Answer</span>
                          </div>
                          <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-relaxed">
                            {activeQuestion.answer || '(No answer text provided)'}
                          </p>
                        </div>

                        {/* Correct / Wrong Decision Buttons */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Mark Participant Answer:
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              disabled={hasAnswered}
                              onClick={() => handleMarkDirectResult(true)}
                              className={`py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                hasAnswered
                                  ? directResult === 'correct'
                                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500'
                                    : 'opacity-30 bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 hover:scale-[1.02]'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Correct (+{activeQuestion.marks || 1} pts)</span>
                            </button>

                            <button
                              type="button"
                              disabled={hasAnswered}
                              onClick={() => handleMarkDirectResult(false)}
                              className={`py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                hasAnswered
                                  ? directResult === 'wrong'
                                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500'
                                    : 'opacity-30 bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 hover:scale-[1.02]'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Wrong (0 pts)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : isTwoChances ? (
                  /* Mode 2: One Question - 2 Chances MCQ Options */
                  <div className="space-y-3 pt-1">
                    {/* 2 Chances Notice Banner if attempt 1 was wrong and waiting for attempt 2 */}
                    {attemptNumber === 2 && !hasAnswered && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>1st try was incorrect! Second chance: Choose another option for {activeQuestion.secondTryMarks !== undefined ? activeQuestion.secondTryMarks : 1} pts.</span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {(activeQuestion.options || []).map((opt, optIdx) => {
                        const isCorrect = typeof opt === 'object' && opt ? Boolean(opt.isCorrect) : false;
                        const optText = typeof opt === 'string' ? opt : (opt?.text || `Option ${OPTION_LETTERS[optIdx] || optIdx + 1}`);
                        const optKey = (typeof opt === 'object' && opt?.id) ? opt.id : `q_opt_${optIdx}`;

                        const isFirstWrong = optIdx === firstAttemptWrongIdx;
                        const isSecondAttempt = optIdx === secondAttemptIdx;

                        let cardStyle = 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141F] hover:border-violet-500/60 cursor-pointer';
                        let isDisabled = hasAnswered;
                        let badge = null;

                        if (!hasAnswered) {
                          if (attemptNumber === 2 && isFirstWrong) {
                            cardStyle = 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 opacity-60 cursor-not-allowed';
                            isDisabled = true;
                            badge = (
                              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0">
                                <X className="w-3.5 h-3.5" />
                                <span>Wrong (1st Try)</span>
                              </span>
                            );
                          }
                        } else {
                          // Question finished
                          if (isTimedOut) {
                            if (isCorrect) {
                              cardStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold';
                              badge = (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                  <Check className="w-4 h-4" />
                                  <span>Correct Answer</span>
                                </span>
                              );
                            } else {
                              cardStyle = 'opacity-40 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12141F] cursor-not-allowed';
                            }
                          } else if (attemptNumber === 1 && selectedOptionIdx === optIdx && isCorrect) {
                            cardStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold';
                            badge = (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                <Check className="w-4 h-4" />
                                <span>Correct (1st Try)</span>
                              </span>
                            );
                          } else if (attemptNumber === 2) {
                            if (isFirstWrong) {
                              cardStyle = 'border-rose-400 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200';
                              badge = (
                                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0">
                                  <X className="w-4 h-4" />
                                  <span>Wrong (1st Try)</span>
                                </span>
                              );
                            } else if (isSecondAttempt && isCorrect) {
                              cardStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold';
                              badge = (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                  <Check className="w-4 h-4" />
                                  <span>Correct (2nd Try)</span>
                                </span>
                              );
                            } else if (isSecondAttempt && !isCorrect) {
                              cardStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-bold';
                              badge = (
                                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0">
                                  <X className="w-4 h-4" />
                                  <span>Wrong (2nd Try)</span>
                                </span>
                              );
                            } else if (isCorrect) {
                              // Only revealed after 2nd chance failure!
                              cardStyle = 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-bold';
                              badge = (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                                  <Check className="w-4 h-4" />
                                  <span>Correct Answer</span>
                                </span>
                              );
                            } else {
                              cardStyle = 'opacity-40 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12141F] cursor-not-allowed';
                            }
                          } else {
                            cardStyle = 'opacity-40 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12141F] cursor-not-allowed';
                          }
                        }

                        return (
                          <button
                            key={optKey}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleSelectOption(optIdx)}
                            className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${cardStyle}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {OPTION_LETTERS[optIdx] || String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="text-xs font-semibold truncate">
                                {optText}
                              </span>
                            </div>
                            {badge}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Mode 3: One Question - One Chance MCQ Options */
                  <div className="space-y-2.5">
                    {(activeQuestion.options || []).map((opt, optIdx) => {
                      const isSelected = selectedOptionIdx === optIdx;
                      const isCorrect = typeof opt === 'object' && opt ? Boolean(opt.isCorrect) : false;
                      const optText = typeof opt === 'string' ? opt : (opt?.text || `Option ${OPTION_LETTERS[optIdx] || optIdx + 1}`);
                      const optKey = (typeof opt === 'object' && opt?.id) ? opt.id : `q_opt_${optIdx}`;

                      let cardStyle = 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141F] hover:border-violet-500/60 cursor-pointer';

                      if (hasAnswered) {
                        if (isTimedOut) {
                          if (isCorrect) {
                            cardStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold';
                          } else {
                            cardStyle = 'opacity-40 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12141F] cursor-not-allowed';
                          }
                        } else if (isSelected && isCorrect) {
                          cardStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold';
                        } else if (isSelected && !isCorrect) {
                          cardStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-bold';
                        } else if (isCorrect) {
                          cardStyle = 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200';
                        } else {
                          cardStyle = 'opacity-50 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12141F] cursor-not-allowed';
                        }
                      }

                      return (
                        <button
                          key={optKey}
                          type="button"
                          disabled={hasAnswered}
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${cardStyle}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {OPTION_LETTERS[optIdx] || String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="text-xs font-semibold truncate">
                              {optText}
                            </span>
                          </div>

                          {hasAnswered && isCorrect && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                              <Check className="w-4 h-4" />
                              <span>Correct</span>
                            </span>
                          )}

                          {hasAnswered && !isTimedOut && isSelected && !isCorrect && (
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0">
                              <X className="w-4 h-4" />
                              <span>Wrong</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Outcome Banner if answered */}
                {hasAnswered && (
                  <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between ${
                    isTimedOut
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                      : isQuestionDirect
                      ? directResult === 'correct'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                      : isTwoChances
                      ? (attemptNumber === 1 && activeQuestion?.options?.[selectedOptionIdx]?.isCorrect) || (attemptNumber === 2 && activeQuestion?.options?.[secondAttemptIdx]?.isCorrect)
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                      : activeQuestion?.options?.[selectedOptionIdx]?.isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}>
                    <span>
                      {(() => {
                        if (isTimedOut) return "⏱️ Time's up! No answer selected (0 pts)";
                        if (isQuestionDirect) {
                          return directResult === 'correct'
                            ? `🎉 Marked as Correct! +${activeQuestion.marks || 1} pts`
                            : `❌ Marked as Wrong (0 pts)`;
                        }
                        if (isTwoChances) {
                          if (attemptNumber === 1 && activeQuestion?.options?.[selectedOptionIdx]?.isCorrect) {
                            return `🎉 Correct on 1st try! +${activeQuestion.marks || 1} pts`;
                          }
                          if (attemptNumber === 2 && activeQuestion?.options?.[secondAttemptIdx]?.isCorrect) {
                            const secondMarks = activeQuestion.secondTryMarks !== undefined ? activeQuestion.secondTryMarks : 1;
                            return `🎉 Correct on 2nd try! +${secondMarks} pts`;
                          }
                          return `❌ Incorrect after 2 chances! (0 pts)`;
                        }
                        return activeQuestion?.options?.[selectedOptionIdx]?.isCorrect
                          ? `🎉 Correct answer! +${activeQuestion.marks || 1} pts`
                          : `❌ Incorrect answer!`;
                      })()}
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-white/70 dark:bg-[#12141F]/80 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800">
                      Total: {((allParticipants.find(p => p.id === currentWinner?.id)?.score || 0))} pts
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-amber-500" />
                </div>
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                  {questionsList.length > 0 ? 'All Questions Completed!' : 'No questions in this quiz yet'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {questionsList.length > 0
                    ? 'All questions in this quiz have already been attended. You can view the final total marks of each student.'
                    : 'Add questions in the Questions editor to turn spins into interactive question rounds!'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuestionModalOpen(false);
                    setActiveTab('scoreboard');
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/25 cursor-pointer mx-auto"
                >
                  <Trophy className="w-4 h-4" />
                  <span>View Total Marks</span>
                </button>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                disabled={Boolean(activeQuestion && !hasAnswered)}
                onClick={() => {
                  if (activeQuestion && !hasAnswered) return;
                  setIsQuestionModalOpen(false);
                  const remainingStudents = eligibleParticipants.filter(p => p.id !== currentWinner?.id);
                  const remainingQuestions = questionsList.filter(q => !usedQuestionIds.has(q.id) && q.id !== activeQuestion?.id);

                  if (remainingStudents.length === 0 || remainingQuestions.length === 0) {
                    setActiveTab('scoreboard');
                  } else {
                    setTimeout(() => handleSpinWheel(), 350);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ml-auto ${
                  activeQuestion && !hasAnswered
                    ? 'opacity-40 bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-[#635BFF] hover:bg-[#5145E5] text-white cursor-pointer shadow-md shadow-[#635BFF]/25'
                }`}
              >
                {(() => {
                  const remainingStudents = eligibleParticipants.filter(p => p.id !== currentWinner?.id);
                  const remainingQuestions = questionsList.filter(q => !usedQuestionIds.has(q.id) && q.id !== activeQuestion?.id);
                  const isFinished = remainingStudents.length === 0 || remainingQuestions.length === 0;

                  return isFinished ? (
                    <>
                      <Trophy className="w-3.5 h-3.5" />
                      <span>View Total Marks</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Spin Next</span>
                    </>
                  );
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPlayPage() {
  return (
    <QuizPlayErrorBoundary>
      <QuizPlayPageContent />
    </QuizPlayErrorBoundary>
  );
}

