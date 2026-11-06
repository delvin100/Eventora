import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Check,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Sparkles,
  Layers,
  Award,
  Hash,
  X,
  FileCheck,
  Clock
} from 'lucide-react';
import { quizService, QUIZ_TYPES } from '../services/quizService';
import { slugify } from '../utils/slugUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function StylishUnitDropdown({ value = 'sec', onChange }) {
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

  const options = [
    { value: 'sec', label: 'sec' },
    { value: 'min', label: 'min' }
  ];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-amber-100/70 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[11px] font-black transition-all cursor-pointer select-none"
      >
        <span>{value}</span>
        <ChevronDown className={`w-3 h-3 text-amber-600 dark:text-amber-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-24 rounded-xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-gray-700 shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-black'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function QuizWorkspacePage() {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable Quiz Fields
  const [quizName, setQuizName] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [defaultMarks, setDefaultMarks] = useState(1);
  const [defaultTimeValue, setDefaultTimeValue] = useState('');
  const [defaultTimeUnit, setDefaultTimeUnit] = useState('sec');
  const [questions, setQuestions] = useState([]);
  const [questionToDeleteIdx, setQuestionToDeleteIdx] = useState(null);

  // Status notification
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    let isCancelled = false;

    async function loadQuiz() {
      try {
        setLoading(true);
        const targetLookup = location.state?.quizId || quizId;
        const data = await quizService.getQuizById(targetLookup);
        if (isCancelled) return;

        if (!data) {
          setStatusMsg({ type: 'error', text: 'Quiz not found.' });
          setLoading(false);
          return;
        }

        setQuiz(data);
        setQuizName(data.name || 'Untitled Quiz');
        setQuizDescription(data.description || '');
        setDefaultMarks(data.defaultMarks || 1);
        if (data.defaultTimeValue !== undefined && data.defaultTimeValue !== null) {
          setDefaultTimeValue(data.defaultTimeValue);
        }
        if (data.defaultTimeUnit) {
          setDefaultTimeUnit(data.defaultTimeUnit);
        }

        const rawQuestions = Array.isArray(data.questions) && data.questions.length > 0
          ? data.questions
          : [
              {
                id: 'q_' + Date.now(),
                text: '',
                marks: data.defaultMarks || 1,
                timeLimit: null,
                timeValue: '',
                timeUnit: 'sec',
                options: [
                  { id: 'opt_1', text: '', isCorrect: true },
                  { id: 'opt_2', text: '', isCorrect: false },
                  { id: 'opt_3', text: '', isCorrect: false },
                  { id: 'opt_4', text: '', isCorrect: false }
                ]
              }
            ];

        const initialQuestions = rawQuestions.map(q => {
          const unit = q.timeUnit || 'sec';
          let val = q.timeValue;
          if (val === undefined || val === null || val === '') {
            if (q.timeLimit && Number(q.timeLimit) > 0) {
              val = unit === 'min' ? Math.round(Number(q.timeLimit) / 60) : Number(q.timeLimit);
            } else {
              val = '';
            }
          }
          return {
            ...q,
            timeValue: val,
            timeUnit: unit,
            timeLimit: q.timeLimit ? Number(q.timeLimit) : (val !== '' && !isNaN(Number(val)) && Number(val) > 0 ? (unit === 'min' ? Math.round(Number(val) * 60) : Math.round(Number(val))) : null)
          };
        });

        setQuestions(initialQuestions);

        // Update document title and rewrite UUID URL with slug
        if (data.name) {
          document.title = `${data.name} | Eventora Quiz`;
          const slug = slugify(data.name);
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizId);
          if (isUUID && slug) {
            const newPath = location.pathname.replace(quizId, slug);
            navigate(newPath, { replace: true, state: { ...location.state, quizId: data.id } });
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load quiz details:', err);
          setStatusMsg({ type: 'error', text: 'Failed to load quiz.' });
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadQuiz();
    return () => { isCancelled = true; };
  }, [quizId]);

  // Compute Total Marks dynamically
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  // Save Quiz handler
  const handleSaveQuiz = async () => {
    if (!quiz?.id) return;
    try {
      setSaving(true);
      await quizService.updateQuiz(quiz.id, {
        name: quizName,
        description: quizDescription,
        defaultMarks: Number(defaultMarks) || 1,
        defaultTimeValue,
        defaultTimeUnit,
        questions
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setStatusMsg({ type: 'success', text: 'All questions and quiz configuration saved!' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);

      // Keep title and URL in sync if name changed
      if (quizName) {
        document.title = `${quizName} | Eventora Quiz`;
        const slug = slugify(quizName);
        if (slug && quizId !== slug) {
          navigate(`/app/quiz/${slug}`, { replace: true, state: { ...location.state, quizId: quiz.id } });
        }
      }
    } catch (err) {
      console.error('Failed to save quiz:', err);
      setStatusMsg({ type: 'error', text: 'Failed to save quiz: ' + (err.message || 'Unknown error') });
    } finally {
      setSaving(false);
    }
  };

  // Next Step handler: automatically saves questions and navigates to the Participants & Wheel page
  const handleGoToNext = async () => {
    if (!quiz?.id) return;
    try {
      setSaving(true);
      await quizService.updateQuiz(quiz.id, {
        name: quizName,
        description: quizDescription,
        defaultMarks: Number(defaultMarks) || 1,
        defaultTimeValue,
        defaultTimeUnit,
        questions
      });

      const slug = slugify(quizName) || quiz.id;
      navigate(`/app/quiz/${slug}/play`, { state: { quizId: quiz.id } });
    } catch (err) {
      console.error('Auto-save before next step failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to save before navigating: ' + (err.message || 'Unknown error') });
    } finally {
      setSaving(false);
    }
  };

  // Bulk Apply Marks to All Questions
  const handleApplyMarksToAll = () => {
    const markVal = Math.max(1, parseInt(defaultMarks, 10) || 1);
    setQuestions(prev => prev.map(q => ({
      ...q,
      marks: markVal
    })));
    setStatusMsg({
      type: 'success',
      text: `Updated all ${questions.length} questions to ${markVal} mark${markVal === 1 ? '' : 's'} each.`
    });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Bulk Apply Time to All Questions
  const handleApplyTimeToAll = () => {
    const numTime = parseFloat(defaultTimeValue);
    const hasTime = defaultTimeValue !== '' && !isNaN(numTime) && numTime > 0;
    const inSeconds = hasTime ? (defaultTimeUnit === 'min' ? Math.round(numTime * 60) : Math.round(numTime)) : null;

    setQuestions(prev => prev.map(q => ({
      ...q,
      timeValue: hasTime ? numTime : '',
      timeUnit: defaultTimeUnit,
      timeLimit: inSeconds
    })));

    setStatusMsg({
      type: 'success',
      text: hasTime
        ? `Applied ${numTime} ${defaultTimeUnit} time limit to all ${questions.length} questions.`
        : `Cleared time limit from all ${questions.length} questions.`
    });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Bulk Apply Both (Marks and Time) to All Questions
  const handleApplyAllToAll = () => {
    const markVal = Math.max(1, parseInt(defaultMarks, 10) || 1);
    const numTime = parseFloat(defaultTimeValue);
    const hasTime = defaultTimeValue !== '' && !isNaN(numTime) && numTime > 0;
    const inSeconds = hasTime ? (defaultTimeUnit === 'min' ? Math.round(numTime * 60) : Math.round(numTime)) : null;

    setQuestions(prev => prev.map(q => ({
      ...q,
      marks: markVal,
      timeValue: hasTime ? numTime : '',
      timeUnit: defaultTimeUnit,
      timeLimit: inSeconds
    })));

    setStatusMsg({
      type: 'success',
      text: `Applied ${markVal} pts and ${hasTime ? `${numTime} ${defaultTimeUnit}` : 'no'} time limit to all ${questions.length} questions.`
    });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Add a new question
  const handleAddQuestion = () => {
    const markVal = Math.max(1, parseInt(defaultMarks, 10) || 1);
    const numTime = parseFloat(defaultTimeValue);
    const hasTime = defaultTimeValue !== '' && !isNaN(numTime) && numTime > 0;
    const inSeconds = hasTime ? (defaultTimeUnit === 'min' ? Math.round(numTime * 60) : Math.round(numTime)) : null;

    const newQ = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: '',
      marks: markVal,
      timeLimit: inSeconds,
      timeValue: hasTime ? numTime : '',
      timeUnit: defaultTimeUnit || 'sec',
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
        { id: 'opt_4', text: '', isCorrect: false }
      ]
    };

    setQuestions(prev => [...prev, newQ]);
  };

  // Duplicate a question
  const handleDuplicateQuestion = (idx) => {
    const target = questions[idx];
    if (!target) return;

    const dup = {
      ...target,
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: target.text ? `${target.text} (Copy)` : '',
      timeLimit: target.timeLimit || null,
      timeValue: target.timeValue !== undefined ? target.timeValue : '',
      timeUnit: target.timeUnit || 'sec',
      options: target.options.map(o => ({
        ...o,
        id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
      }))
    };

    const nextList = [...questions];
    nextList.splice(idx + 1, 0, dup);
    setQuestions(nextList);
  };

  // Delete question
  const handleDeleteQuestion = (idx) => {
    if (questions.length <= 1) {
      // If deleting the only question, reset it to an empty question
      setQuestions([
        {
          id: 'q_' + Date.now(),
          text: '',
          marks: Number(defaultMarks) || 1,
          options: [
            { id: 'opt_1', text: '', isCorrect: true },
            { id: 'opt_2', text: '', isCorrect: false },
            { id: 'opt_3', text: '', isCorrect: false },
            { id: 'opt_4', text: '', isCorrect: false }
          ]
        }
      ]);
    } else {
      setQuestions(prev => prev.filter((_, i) => i !== idx));
    }
    setQuestionToDeleteIdx(null);
  };

  // Move Question position
  const handleMoveQuestion = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const nextList = [...questions];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setQuestions(nextList);
  };

  // Update Question Text
  const handleQuestionTextChange = (idx, text) => {
    setQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], text };
      return next;
    });
  };

  // Update Individual Question Marks
  const handleQuestionMarksChange = (idx, marks) => {
    const parsed = Math.max(1, parseInt(marks, 10) || 1);
    setQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], marks: parsed };
      return next;
    });
  };

  // Update Individual Question Time Limit & Unit (sec / min)
  const handleQuestionTimeChange = (idx, val, unit) => {
    setQuestions(prev => {
      const next = [...prev];
      const curUnit = unit !== undefined ? unit : (next[idx].timeUnit || 'sec');
      const num = parseFloat(val);
      const hasVal = val !== '' && !isNaN(num) && num > 0;
      const inSec = hasVal ? (curUnit === 'min' ? Math.round(num * 60) : Math.round(num)) : null;

      next[idx] = {
        ...next[idx],
        timeValue: val === '' ? '' : (isNaN(num) ? val : num),
        timeUnit: curUnit,
        timeLimit: inSec
      };
      return next;
    });
  };

  const handleQuestionTimeLimitChange = (idx, val) => {
    handleQuestionTimeChange(idx, val, questions[idx]?.timeUnit || 'sec');
  };

  // Update Option Text
  const handleOptionTextChange = (qIdx, optIdx, text) => {
    setQuestions(prev => {
      const next = [...prev];
      const nextOptions = [...next[qIdx].options];
      nextOptions[optIdx] = { ...nextOptions[optIdx], text };
      next[qIdx] = { ...next[qIdx], options: nextOptions };
      return next;
    });
  };

  // Set One Option as the Single Correct Answer
  const handleSetCorrectOption = (qIdx, optIdx) => {
    setQuestions(prev => {
      const next = [...prev];
      const nextOptions = next[qIdx].options.map((opt, i) => ({
        ...opt,
        isCorrect: i === optIdx
      }));
      next[qIdx] = { ...next[qIdx], options: nextOptions };
      return next;
    });
  };

  // Add Option to a question
  const handleAddOption = (qIdx) => {
    const targetQ = questions[qIdx];
    if (!targetQ || targetQ.options.length >= 8) return;

    const newOpt = {
      id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: '',
      isCorrect: false
    };

    setQuestions(prev => {
      const next = [...prev];
      next[qIdx] = {
        ...next[qIdx],
        options: [...next[qIdx].options, newOpt]
      };
      return next;
    });
  };

  // Remove Option from a question (minimum 2 options)
  const handleRemoveOption = (qIdx, optIdx) => {
    const targetQ = questions[qIdx];
    if (!targetQ || targetQ.options.length <= 2) {
      alert('Each question must have at least 2 options.');
      return;
    }

    const wasCorrect = targetQ.options[optIdx]?.isCorrect;
    const remaining = targetQ.options.filter((_, i) => i !== optIdx);

    // If we removed the correct one, make the first remaining option correct
    if (wasCorrect && remaining.length > 0) {
      remaining[0].isCorrect = true;
    }

    setQuestions(prev => {
      const next = [...prev];
      next[qIdx] = { ...next[qIdx], options: remaining };
      return next;
    });
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-gray-400 space-y-2">
        <HelpCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto animate-pulse" />
        <p>Loading Quiz Workspace...</p>
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

  const typeDef = QUIZ_TYPES.find(t => t.id === quiz.quizType) || QUIZ_TYPES[0];

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link
          to="/app/quiz"
          className="inline-flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Quizzes</span>
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <span className="text-gray-900 dark:text-white font-bold truncate max-w-xs">{quizName}</span>
      </nav>

      {/* Status banner */}
      {statusMsg.text && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-semibold border transition-all ${
            statusMsg.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Quiz Master Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF]">
              {typeDef.name} (MCQ)
            </span>
            <span className="text-xs text-gray-400">
              {typeDef.description}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-[#635BFF] focus:outline-none transition-colors w-full"
              placeholder="Quiz Title..."
            />
          </div>

          <input
            type="text"
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-gray-800 focus:border-gray-400 focus:outline-none transition-colors w-full"
            placeholder="Add a short description or instructions for this quiz..."
          />
        </div>

        {/* Metrics & Save Button */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#191D2B] border border-gray-200 dark:border-gray-800 text-center">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Questions</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{questions.length}</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Total Marks</span>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{totalMarks} pts</span>
          </div>

          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#635BFF] hover:bg-[#5145E5] text-white'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Quiz'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bulk Scoring & Timing Toolbar (Apply to all) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-violet-50/80 via-indigo-50/50 to-purple-50/80 dark:from-violet-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border border-violet-200/80 dark:border-violet-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
              Quiz Setup & Bulk Apply
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Apply uniform marks and time limits to all questions, or customize them individually below.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mark Input */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Mark:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={defaultMarks}
              onChange={(e) => setDefaultMarks(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-12 text-xs font-bold text-gray-900 dark:text-white text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[11px] text-gray-400">pts</span>
          </div>

          {/* Time Limit Input with Stylish sec/min */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-amber-200 dark:border-amber-900/50 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Time:</span>
            <input
              type="number"
              min={0}
              max={defaultTimeUnit === 'min' ? 60 : 3600}
              placeholder="None"
              value={defaultTimeValue}
              onChange={(e) => setDefaultTimeValue(e.target.value)}
              className="w-14 text-xs font-bold text-amber-700 dark:text-amber-300 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-400 placeholder:font-normal"
            />
            <StylishUnitDropdown
              value={defaultTimeUnit}
              onChange={setDefaultTimeUnit}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleApplyMarksToAll}
              title="Apply only marks to all questions"
              className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs shadow-violet-600/25 transition-all cursor-pointer whitespace-nowrap"
            >
              Apply Marks
            </button>

            <button
              type="button"
              onClick={handleApplyTimeToAll}
              title="Apply only time limit to all questions"
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs shadow-amber-600/25 transition-all cursor-pointer whitespace-nowrap"
            >
              Apply Time
            </button>

            <button
              type="button"
              onClick={handleApplyAllToAll}
              title="Apply both marks and time limit to all questions"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shadow-indigo-600/25 transition-all cursor-pointer whitespace-nowrap"
            >
              Apply to All
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-5">
        {questions.map((q, qIdx) => {
          return (
            <div
              key={q.id || qIdx}
              className="rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-5 sm:p-6 space-y-4 shadow-xs hover:border-gray-300 dark:hover:border-gray-700 transition-all"
            >
              {/* Question Card Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-black">
                    Question {qIdx + 1}
                  </span>

                  {/* Individual Question Marks Input */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Marks:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.marks || 1}
                      onChange={(e) => handleQuestionMarksChange(qIdx, e.target.value)}
                      className="w-12 text-xs font-black text-emerald-700 dark:text-emerald-300 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">pts</span>
                  </div>

                  {/* Optional Time Limit Input with Stylish sec/min */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50"
                    title="Optional time limit for this question"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Time:</span>
                    <input
                      type="number"
                      min={0}
                      max={q.timeUnit === 'min' ? 60 : 3600}
                      placeholder="None"
                      value={q.timeValue !== undefined && q.timeValue !== null && q.timeValue !== '' ? q.timeValue : ''}
                      onChange={(e) => handleQuestionTimeChange(qIdx, e.target.value, q.timeUnit || 'sec')}
                      className="w-12 text-xs font-black text-amber-700 dark:text-amber-300 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-amber-400/60 placeholder:font-normal"
                    />
                    <StylishUnitDropdown
                      value={q.timeUnit || 'sec'}
                      onChange={(newUnit) => handleQuestionTimeChange(qIdx, q.timeValue, newUnit)}
                    />
                  </div>
                </div>

                {/* Question Actions (Move, Duplicate, Delete) */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveQuestion(qIdx, 'up')}
                    disabled={qIdx === 0}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleMoveQuestion(qIdx, 'down')}
                    disabled={qIdx === questions.length - 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicateQuestion(qIdx)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer"
                    title="Duplicate question"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setQuestionToDeleteIdx(qIdx)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Statement Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Question Statement
                </label>
                <textarea
                  rows={2}
                  value={q.text || ''}
                  onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                  placeholder={`e.g. What is the capital of Australia?`}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141F] text-sm text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400 resize-none shadow-xs"
                />
              </div>

              {/* Multiple Choice Options List */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Options <span className="normal-case font-normal text-gray-400">(Select the radio button to designate the correct answer)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-gray-400">
                    {q.options.length} Options
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = Boolean(opt.isCorrect);
                    const letter = OPTION_LETTERS[optIdx] || String.fromCharCode(65 + optIdx);

                    return (
                      <div
                        key={opt.id || optIdx}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500/80 dark:border-emerald-500/80 ring-1 ring-emerald-500/30'
                            : 'bg-gray-50/70 dark:bg-[#12141F] border-gray-200 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        {/* Radio Button to mark as One Correct Answer */}
                        <button
                          type="button"
                          onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                            isCorrect
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                              : 'border-gray-300 dark:border-gray-700 hover:border-emerald-500 text-transparent'
                          }`}
                          title={isCorrect ? 'Correct Answer' : 'Click to set as Correct Answer'}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        {/* Option Letter Tag */}
                        <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                            : 'bg-gray-200/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}>
                          {letter}
                        </span>

                        {/* Option Input */}
                        <input
                          type="text"
                          value={opt.text || ''}
                          onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                          placeholder={`Option ${letter}...`}
                          className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                        />

                        {/* Correct Answer Badge */}
                        {isCorrect && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                            Correct
                          </span>
                        )}

                        {/* Remove Option Button */}
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(qIdx, optIdx)}
                            className="p-1 rounded-md text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                            title="Remove option"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Option Button */}
                {q.options.length < 8 && (
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIdx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-violet-500 dark:hover:border-violet-500 text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 text-xs font-semibold transition-all cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Option</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Question CTA button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-900/60 hover:border-violet-500 dark:hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 text-violet-700 dark:text-violet-300 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Another Question</span>
          </button>
        </div>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#161925]/95 border border-gray-200 dark:border-gray-800 shadow-2xl backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 pl-1 sm:pl-2">
          <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
            <strong>{questions.length}</strong> questions (total marks {totalMarks})
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <button
            type="button"
            onClick={handleSaveQuiz}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>

          <button
            type="button"
            onClick={handleGoToNext}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4.5 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <span>{saving ? 'Saving...' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Delete Question Confirmation Dialog */}
      <ConfirmDialog
        isOpen={questionToDeleteIdx !== null}
        title="Delete Question"
        message="Are you sure you want to delete this question? Its options and marks will be removed."
        confirmText="Delete Question"
        confirmVariant="danger"
        onConfirm={() => handleDeleteQuestion(questionToDeleteIdx)}
        onCancel={() => setQuestionToDeleteIdx(null)}
        onClose={() => setQuestionToDeleteIdx(null)}
      />
    </div>
  );
}

