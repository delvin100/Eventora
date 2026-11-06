import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
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
  Trophy
} from 'lucide-react';

import WheelCanvas from '../components/wheel/WheelCanvas';
import EventParticipantsView from '../components/participants/EventParticipantsView';
import { playVictorySound } from '../components/wheel/audio/wheelAudio';
import { quizService, QUIZ_TYPES } from '../services/quizService';
import { slugify } from '../utils/slugUtils';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const getQuizSessionKey = (id) => `eventora_quiz_session_${id}`;

const loadSavedQuizSession = (id) => {
  if (!id) return { usedQuestionIds: [], removedIds: [] };
  try {
    const raw = localStorage.getItem(getQuizSessionKey(id));
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

const saveQuizSession = (id, usedQIds, remIds) => {
  if (!id) return;
  try {
    localStorage.setItem(getQuizSessionKey(id), JSON.stringify({
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

export default function QuizPlayPage() {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'wheel' | 'scoreboard'

  // Master Participants State (all enrolled students with cumulative marks)
  const [allParticipants, setAllParticipants] = useState([]);
  const [removedIds, setRemovedIds] = useState(new Set()); // IDs of students who have completed turn (Fair Turn)
  const [scoreboardSearch, setScoreboardSearch] = useState('');

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

  // Questions and pool
  const questionsList = quiz?.questions || [];
  const availableQuestions = questionsList.filter(q => !usedQuestionIds.has(q.id));

  // Eligible participants currently on the wheel
  const eligibleParticipants = fairTurn
    ? allParticipants.filter(p => !removedIds.has(p.id))
    : allParticipants;

  // Complete Quiz check: true if all questions are used, or eligible participants is 0, or all students finished
  const isQuizCompleted = allParticipants.length > 0 && (
    eligibleParticipants.length === 0 ||
    (questionsList.length > 0 && availableQuestions.length === 0) ||
    allParticipants.every(p => (Number(p.turns) || 0) > 0) ||
    (questionsList.length > 0 && usedQuestionIds.size >= questionsList.length)
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

        setQuiz(data);
        const list = Array.isArray(data.participants) ? data.participants : [];
        const initialized = list.map(p => ({
          ...p,
          score: Number(p.score) || 0,
          turns: Number(p.turns) || 0,
          correct: Number(p.correct) || 0
        }));
        setAllParticipants(initialized);

        // Restore saved quiz session state (used questions and removed student turns)
        const savedSession = loadSavedQuizSession(data.id);
        const completedStudentIds = initialized
          .filter(p => (Number(p.turns) || 0) > 0)
          .map(p => p.id);

        const restoredRemovedIds = new Set([...savedSession.removedIds, ...completedStudentIds]);

        const qList = Array.isArray(data.questions) ? data.questions : [];
        let restoredUsedQIds = new Set(savedSession.usedQuestionIds);

        const allStudentsTurned = initialized.length > 0 && initialized.every(p => (Number(p.turns) || 0) > 0);
        const totalTurns = initialized.reduce((sum, p) => sum + (Number(p.turns) || 0), 0);

        if (qList.length > 0 && (restoredUsedQIds.size >= qList.length || (totalTurns >= qList.length && restoredUsedQIds.size === 0) || allStudentsTurned)) {
          restoredUsedQIds = new Set(qList.map(q => q.id));
        }

        setRemovedIds(restoredRemovedIds);
        setUsedQuestionIds(restoredUsedQIds);
        saveQuizSession(data.id, restoredUsedQIds, restoredRemovedIds);

        if (data.name) {
          document.title = `${data.name} - Play | Eventora`;
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

  // Handle question timeout when optional timeLimit runs out
  const handleTimeout = useCallback(() => {
    setHasAnswered(true);
    setIsTimedOut(true);
    setSelectedOptionIdx(null);

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

    saveQuizSession(quiz?.id, nextUsed, nextRemoved);

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
  }, [activeQuestion, questionsList, currentQuestionIdx, allParticipants, currentWinner, persistParticipants, usedQuestionIds.size]);

  // Active question countdown timer effect
  useEffect(() => {
    if (!isQuestionModalOpen || !activeQuestion || hasAnswered) return;
    const limit = Number(activeQuestion.timeLimit);
    if (!limit || limit <= 0) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(limit);

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
  }, [isQuestionModalOpen, activeQuestion, hasAnswered, handleTimeout]);

  // Check Answer for Question (One Question - One Chance)
  const handleSelectOption = (optIdx) => {
    if (hasAnswered) return; // One chance only!

    setSelectedOptionIdx(optIdx);
    setHasAnswered(true);

    const currentQ = activeQuestion || questionsList[currentQuestionIdx];
    const isCorrect = Boolean(currentQ?.options?.[optIdx]?.isCorrect);
    const marksEarned = isCorrect ? (Number(currentQ?.marks) || 1) : 0;

    if (isCorrect) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.65 }
      });
      playVictorySound();
    }

    // Award points to this student if correct, else 0 points
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

    // 1. Remove that question so it is never selected again in this session
    let nextUsed = usedQuestionIds;
    if (currentQ?.id) {
      nextUsed = new Set([...usedQuestionIds, currentQ.id]);
      setUsedQuestionIds(nextUsed);
    }

    // 2. Remove the student who attended the question from upcoming spins in the wheel
    let nextRemoved = removedIds;
    if (currentWinner?.id) {
      nextRemoved = new Set([...removedIds, currentWinner.id]);
      setRemovedIds(nextRemoved);
    }

    saveQuizSession(quiz?.id, nextUsed, nextRemoved);

    // Record in history
    setTurnHistory(prev => [
      {
        id: 'turn_' + Date.now(),
        questionId: currentQ?.id,
        participantId: currentWinner?.id,
        participantName: currentWinner?.name || 'Participant',
        questionNumber: usedQuestionIds.size + 1,
        questionText: currentQ?.text || `Question ${usedQuestionIds.size + 1}`,
        selectedOptionText: currentQ?.options?.[optIdx]?.text || '',
        isCorrect,
        marksEarned,
        maxMarks: Number(currentQ?.marks) || 1,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);
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
  const typeDef = QUIZ_TYPES.find(t => t.id === quiz.quizType) || QUIZ_TYPES[0];

  return (
    <div className="space-y-6 pb-12">
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

          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {quiz.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF]">
              {typeDef.name}
            </span>
          </div>
        </div>

        {/* Back to Edit Questions Button */}
        <div className="flex items-center gap-2">
          <Link
            to={`/app/quiz/${quizSlug}`}
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
          onClick={() => setActiveTab('participants')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'participants'
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

        <button
          type="button"
          onClick={() => setActiveTab('wheel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'wheel'
              ? 'bg-[#635BFF] text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <RotateCw className="w-4 h-4" />
          <span>Spin Wheel</span>
          {eligibleParticipants.length > 0 && fairTurn && (
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-black">
              {eligibleParticipants.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scoreboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'scoreboard'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Total Marks</span>
        </button>
      </div>

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
                onClick={() => setActiveTab('wheel')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-[#635BFF]/20"
              >
                <span>Ready to Spin Wheel</span>
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: SPIN WHEEL ===================== */}
      {activeTab === 'wheel' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {allParticipants.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 space-y-4">
              <RotateCw className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Add participants first
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  The wheel requires at least one participant to spin and choose who answers each question.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('participants')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Go to Participants Tab</span>
              </button>
            </div>
          ) : isQuizCompleted ? (
            /* Quiz Completed Stage when all participants completed turn OR all questions answered */
            <div className="max-w-xl mx-auto text-center py-14 px-6 rounded-3xl bg-gradient-to-b from-[#181B2A] to-[#12141F] border border-gray-800 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Trophy className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                  {questionsList.length > 0 && availableQuestions.length === 0 ? 'All Questions Answered' : 'All Turns Completed'}
                </div>
                <h3 className="text-2xl font-black text-white">
                  Quiz Completed!
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {questionsList.length > 0 && availableQuestions.length === 0
                    ? `All ${questionsList.length} questions in this quiz have been answered. You can now review the total marks for each student.`
                    : `All ${allParticipants.length} students have taken their turn on the wheel. You can now review the total marks for each student.`}
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

              {/* Buttons */}
              <div className="flex items-center justify-center pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('scoreboard')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>View Total Marks</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-xl mx-auto flex flex-col items-center space-y-6">
              {/* Wheel Container */}
              <div className="relative w-full max-w-md aspect-square flex items-center justify-center p-3 rounded-3xl bg-gradient-to-b from-[#181B2A] to-[#12141F] border border-gray-800 shadow-2xl overflow-hidden">
                <WheelCanvas
                  ref={wheelRef}
                  participants={eligibleParticipants}
                  duration={duration}
                  soundEnabled={soundEnabled}
                  isPaused={isQuestionModalOpen}
                  onSpinStart={() => setIsSpinning(true)}
                  onSpinEnd={handleWheelEnd}
                  className="w-full h-full"
                />
              </div>

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
                  disabled={isSpinning || eligibleParticipants.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-base font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#635BFF]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'Spinning...' : 'Spin Wheel'}</span>
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-[#635BFF]/25"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Back to Wheel</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Students
              </span>
              <p className="text-xl font-black text-gray-900 dark:text-white">
                {allParticipants.length}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Turns Completed
              </span>
              <p className="text-xl font-black text-violet-600 dark:text-violet-400">
                {removedIds.size} <span className="text-xs text-gray-400 font-normal">/ {allParticipants.length}</span>
              </p>
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
                      <th className="py-3 px-3 text-center">Status</th>
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
                            <td colSpan="6" className="py-8 text-center text-gray-400">
                              No students match "{scoreboardSearch}"
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((p, idx) => {
                        const isCompleted = removedIds.has(p.id) || (p.turns || 0) > 0;
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
                            <td className="py-3 px-3 text-center">
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                  <Check className="w-3 h-3" />
                                  <span>Completed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                  <Clock className="w-3 h-3" />
                                  <span>In Wheel</span>
                                </span>
                              )}
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
                    {activeQuestion.marks || 1} pts
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

                {/* Category 1: One Question - One Chance MCQ Options */}
                <div className="space-y-2.5">
                  {(activeQuestion.options || []).map((opt, optIdx) => {
                    const isSelected = selectedOptionIdx === optIdx;
                    const isCorrect = Boolean(opt.isCorrect);

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
                        key={opt.id || optIdx}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${cardStyle}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {OPTION_LETTERS[optIdx]}
                          </span>
                          <span className="text-xs font-semibold truncate">
                            {opt.text || `Option ${optIdx + 1}`}
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

                {/* Outcome Banner if answered */}
                {hasAnswered && (
                  <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between ${
                    isTimedOut
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                      : activeQuestion?.options?.[selectedOptionIdx]?.isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  }`}>
                    <span>
                      {isTimedOut
                        ? `⏱️ Time's up! No answer selected (0 pts)`
                        : activeQuestion?.options?.[selectedOptionIdx]?.isCorrect
                        ? `🎉 Correct answer! +${activeQuestion.marks || 1} pts`
                        : `❌ Incorrect answer!`}
                    </span>
                    {isTimedOut ? (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                        0 pts
                      </span>
                    ) : activeQuestion?.options?.[selectedOptionIdx]?.isCorrect && (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                        Total: {((allParticipants.find(p => p.id === currentWinner?.id)?.score || 0))} pts
                      </span>
                    )}
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

