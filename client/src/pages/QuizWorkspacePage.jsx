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
  Clock,
  Play,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  Link as LinkIcon
} from 'lucide-react';
import { quizService, QUIZ_TYPES } from '../services/quizService';
import { slugify } from '../utils/slugUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StylishQuizTypeDropdown from '../components/quiz/StylishQuizTypeDropdown';
import MediaViewer from '../components/quiz/MediaViewer';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function createDefaultQuestion(quizType, defaultMarks = 1, defaultSecondTryMarks = 1) {
  const isDirect = quizType === 'answer_to_question';
  const isTwoChances = quizType === 'one_question_two_chances';
  const isMedia = quizType === 'media_based';
  return {
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    text: '',
    format: isDirect ? 'direct' : 'mcq',
    mediaType: 'image',
    mediaUrl: '',
    answer: isDirect ? '' : undefined,
    marks: Number(defaultMarks) || 1,
    secondTryMarks: isTwoChances ? (Number(defaultSecondTryMarks) || 1) : undefined,
    timeLimit: null,
    timeValue: '',
    timeUnit: 'sec',
    options: isDirect ? [] : [
      { id: 'opt_1', text: '', isCorrect: true },
      { id: 'opt_2', text: '', isCorrect: false },
      { id: 'opt_3', text: '', isCorrect: false },
      { id: 'opt_4', text: '', isCorrect: false }
    ]
  };
}

function normalizeQuestions(rawList, defaultSecondMarks = 1) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(q => {
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
      format: q.format || (q.options && q.options.length > 0 ? 'mcq' : (q.answer ? 'direct' : 'mcq')),
      mediaType: q.mediaType || 'image',
      mediaUrl: q.mediaUrl || '',
      answer: q.answer !== undefined ? q.answer : '',
      secondTryMarks: q.secondTryMarks !== undefined ? q.secondTryMarks : (Number(defaultSecondMarks) || 1),
      timeValue: val,
      timeUnit: unit,
      timeLimit: q.timeLimit ? Number(q.timeLimit) : (val !== '' && !isNaN(Number(val)) && Number(val) > 0 ? (unit === 'min' ? Math.round(Number(val) * 60) : Math.round(Number(val))) : null)
    };
  });
}

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
  const [defaultSecondTryMarks, setDefaultSecondTryMarks] = useState(1);
  const [defaultTimeValue, setDefaultTimeValue] = useState('');
  const [defaultTimeUnit, setDefaultTimeUnit] = useState('sec');
  const [questions, setQuestions] = useState([]);
  const [questionToDeleteIdx, setQuestionToDeleteIdx] = useState(null);

  // Round Management
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [isTypeConfirmed, setIsTypeConfirmed] = useState(false);
  const [selectedRoundType, setSelectedRoundType] = useState('');
  const [roundToDeleteNum, setRoundToDeleteNum] = useState(null);
  const [roundIntroMediaUrl, setRoundIntroMediaUrl] = useState('');
  const [roundIntroMediaType, setRoundIntroMediaType] = useState('video');

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
        if (data.defaultSecondTryMarks !== undefined && data.defaultSecondTryMarks !== null) {
          setDefaultSecondTryMarks(data.defaultSecondTryMarks);
        }
        if (data.defaultTimeValue !== undefined && data.defaultTimeValue !== null) {
          setDefaultTimeValue(data.defaultTimeValue);
        }
        if (data.defaultTimeUnit) {
          setDefaultTimeUnit(data.defaultTimeUnit);
        }

        const activeRoundNum = (location.state?.round ? Number(location.state.round) : null) || data.currentRound || 1;
        setCurrentRound(activeRoundNum);

        const roundsList = Array.isArray(data.rounds) && data.rounds.length > 0
          ? data.rounds
          : [
              {
                roundNumber: 1,
                quizType: data.quizType || null,
                isTypeConfirmed: Boolean(data.quizType && data.questions?.length > 0),
                questions: data.questions || [],
                isCompleted: false
              }
            ];

        setRounds(roundsList);

        const activeRound = roundsList.find(r => r.roundNumber === activeRoundNum) || roundsList[0] || {
          roundNumber: activeRoundNum,
          quizType: null,
          isTypeConfirmed: false,
          questions: [],
          isCompleted: false
        };

        const hasConfirmedType = Boolean(
          activeRound.isTypeConfirmed ||
          (activeRound.quizType && activeRound.questions && activeRound.questions.length > 0 && activeRound.questions.some(q => q.text?.trim() || q.answer?.trim() || q.options?.some(o => o.text?.trim())))
        );

        setIsTypeConfirmed(hasConfirmedType);
        setSelectedRoundType(activeRound.quizType || '');
        setRoundIntroMediaUrl(activeRound.introMediaUrl || '');
        setRoundIntroMediaType(activeRound.introMediaType || 'video');

        let rawQuestions = Array.isArray(activeRound.questions) && activeRound.questions.length > 0
          ? activeRound.questions
          : hasConfirmedType
          ? [createDefaultQuestion(activeRound.quizType, data.defaultMarks || 1, data.defaultSecondTryMarks || 1)]
          : [];

        const initialQuestions = normalizeQuestions(rawQuestions, data.defaultSecondTryMarks || 1);
        setQuestions(initialQuestions);

        // Update document title and rewrite UUID URL with slug
        if (data.name) {
          document.title = `${data.name} | Eventora Quiz`;
          const slug = slugify(data.name);
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizId);
          if (isUUID && slug) {
            const newPath = location.pathname.replace(quizId, slug);
            navigate(newPath, { replace: true, state: { ...location.state, quizId: data.id, round: activeRoundNum } });
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

  // Compute Total Marks dynamically for current round
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  // Helper to sanitize current questions state
  const getSanitizedQuestions = () => {
    return questions.map(q => ({
      ...q,
      marks: Math.max(1, parseInt(q.marks, 10) || 1),
      ...(selectedRoundType === 'one_question_two_chances'
        ? { secondTryMarks: Math.max(1, parseInt(q.secondTryMarks, 10) || 1) }
        : {})
    }));
  };

  // Switch between rounds in the workspace
  const handleSwitchRound = (targetRoundNum) => {
    if (targetRoundNum === currentRound) return;

    // 1. Sync current editing questions and quizType into rounds state
    const sanitizedCurrentQuestions = getSanitizedQuestions();
    const updatedRounds = rounds.map(r => {
      if (r.roundNumber === currentRound) {
        return {
          ...r,
          quizType: selectedRoundType,
          isTypeConfirmed: isTypeConfirmed,
          questions: sanitizedCurrentQuestions,
          introMediaUrl: roundIntroMediaUrl,
          introMediaType: roundIntroMediaType
        };
      }
      return r;
    });

    if (!updatedRounds.some(r => r.roundNumber === currentRound)) {
      updatedRounds.push({
        roundNumber: currentRound,
        quizType: selectedRoundType,
        isTypeConfirmed: isTypeConfirmed,
        questions: sanitizedCurrentQuestions,
        introMediaUrl: roundIntroMediaUrl,
        introMediaType: roundIntroMediaType,
        isCompleted: false
      });
    }

    setRounds(updatedRounds);

    // 2. Load target round
    const targetRound = updatedRounds.find(r => r.roundNumber === targetRoundNum) || {
      roundNumber: targetRoundNum,
      quizType: null,
      isTypeConfirmed: false,
      questions: [],
      introMediaUrl: '',
      introMediaType: 'video',
      isCompleted: false
    };

    const hasConfirmed = Boolean(
      targetRound.isTypeConfirmed ||
      (targetRound.quizType && targetRound.questions?.length > 0 && targetRound.questions.some(q => q.text?.trim() || q.answer?.trim() || q.options?.some(o => o.text?.trim())))
    );

    setCurrentRound(targetRoundNum);
    setSelectedRoundType(targetRound.quizType || '');
    setIsTypeConfirmed(hasConfirmed);
    setRoundIntroMediaUrl(targetRound.introMediaUrl || '');
    setRoundIntroMediaType(targetRound.introMediaType || 'video');

    const rawQuestions = Array.isArray(targetRound.questions) && targetRound.questions.length > 0
      ? targetRound.questions
      : hasConfirmed
      ? [createDefaultQuestion(targetRound.quizType, defaultMarks, defaultSecondTryMarks)]
      : [];

    setQuestions(normalizeQuestions(rawQuestions, defaultSecondTryMarks));
  };

  // Add a new round at the beginning
  const handleAddRound = () => {
    const sanitizedCurrentQuestions = getSanitizedQuestions();
    const updatedRounds = rounds.map(r => {
      if (r.roundNumber === currentRound) {
        return {
          ...r,
          quizType: selectedRoundType,
          isTypeConfirmed: isTypeConfirmed,
          questions: sanitizedCurrentQuestions,
          introMediaUrl: roundIntroMediaUrl,
          introMediaType: roundIntroMediaType
        };
      }
      return r;
    });

    if (!updatedRounds.some(r => r.roundNumber === currentRound)) {
      updatedRounds.push({
        roundNumber: currentRound,
        quizType: selectedRoundType,
        isTypeConfirmed: isTypeConfirmed,
        questions: sanitizedCurrentQuestions,
        introMediaUrl: roundIntroMediaUrl,
        introMediaType: roundIntroMediaType,
        isCompleted: false
      });
    }

    const nextRoundNumber = updatedRounds.length > 0
      ? Math.max(...updatedRounds.map(r => r.roundNumber)) + 1
      : 1;

    const newRound = {
      roundNumber: nextRoundNumber,
      quizType: null,
      isTypeConfirmed: false,
      questions: [],
      introMediaUrl: '',
      introMediaType: 'video',
      isCompleted: false
    };

    const nextRoundsList = [...updatedRounds, newRound];
    setRounds(nextRoundsList);

    // Switch to new round
    setCurrentRound(nextRoundNumber);
    setSelectedRoundType('');
    setIsTypeConfirmed(false);
    setRoundIntroMediaUrl('');
    setRoundIntroMediaType('video');
    setQuestions([]);

    setStatusMsg({
      type: 'success',
      text: `Round ${nextRoundNumber} added! Choose a quiz type to configure its questions.`
    });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Delete a round
  const handleDeleteRound = (roundNumToDelete) => {
    if (rounds.length <= 1) {
      setStatusMsg({ type: 'error', text: 'Quiz must have at least 1 round.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
      return;
    }

    const remaining = rounds
      .filter(r => r.roundNumber !== roundNumToDelete)
      .map((r, idx) => ({ ...r, roundNumber: idx + 1 }));

    setRounds(remaining);

    let newActiveRound = currentRound;
    if (currentRound === roundNumToDelete) {
      newActiveRound = Math.min(roundNumToDelete, remaining.length);
    } else if (currentRound > roundNumToDelete) {
      newActiveRound = currentRound - 1;
    }

    const targetRound = remaining.find(r => r.roundNumber === newActiveRound) || remaining[0];
    const hasConfirmed = Boolean(
      targetRound.isTypeConfirmed ||
      (targetRound.quizType && targetRound.questions?.length > 0 && targetRound.questions.some(q => q.text?.trim() || q.answer?.trim() || q.options?.some(o => o.text?.trim())))
    );

    setCurrentRound(targetRound.roundNumber);
    setSelectedRoundType(targetRound.quizType || '');
    setIsTypeConfirmed(hasConfirmed);

    const rawQuestions = Array.isArray(targetRound.questions) && targetRound.questions.length > 0
      ? targetRound.questions
      : hasConfirmed
      ? [createDefaultQuestion(targetRound.quizType, defaultMarks, defaultSecondTryMarks)]
      : [];

    setQuestions(normalizeQuestions(rawQuestions, defaultSecondTryMarks));
    setRoundToDeleteNum(null);

    setStatusMsg({
      type: 'success',
      text: `Round ${roundNumToDelete} removed. Quiz updated to ${remaining.length} round${remaining.length === 1 ? '' : 's'}.`
    });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Confirm Round Quiz Type handler
  const handleConfirmRoundType = async () => {
    if (!selectedRoundType) {
      setStatusMsg({ type: 'error', text: 'Please select a quiz type first.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
      return;
    }

    const targetQuizId = quiz?.id || location.state?.quizId || quizId;
    const isDirect = selectedRoundType === 'answer_to_question';
    const isTwoChances = selectedRoundType === 'one_question_two_chances';

    const defaultQ = questions.length > 0 ? questions.map(q => ({
      ...q,
      answer: q.answer !== undefined ? q.answer : '',
      secondTryMarks: q.secondTryMarks !== undefined ? q.secondTryMarks : (Number(defaultSecondTryMarks) || 1),
      options: isDirect
        ? []
        : (q.options && q.options.length > 0
          ? q.options
          : [
              { id: 'opt_1', text: '', isCorrect: true },
              { id: 'opt_2', text: '', isCorrect: false },
              { id: 'opt_3', text: '', isCorrect: false },
              { id: 'opt_4', text: '', isCorrect: false }
            ])
    })) : [createDefaultQuestion(selectedRoundType, defaultMarks, defaultSecondTryMarks)];

    const updatedRounds = rounds.map(r => {
      if (r.roundNumber === currentRound) {
        return {
          ...r,
          quizType: selectedRoundType,
          isTypeConfirmed: true,
          questions: r.questions && r.questions.length > 0 ? r.questions : defaultQ
        };
      }
      return r;
    });

    if (!updatedRounds.some(r => r.roundNumber === currentRound)) {
      updatedRounds.push({
        roundNumber: currentRound,
        quizType: selectedRoundType,
        isTypeConfirmed: true,
        questions: defaultQ,
        isCompleted: false
      });
    }

    setRounds(updatedRounds);
    setQuestions(defaultQ);
    setIsTypeConfirmed(true);
    setQuiz(prev => ({
      ...(prev || {}),
      id: targetQuizId,
      name: prev?.name || quizName || 'Untitled Quiz',
      quizType: selectedRoundType,
      currentRound,
      rounds: updatedRounds
    }));

    if (targetQuizId) {
      try {
        setSaving(true);
        await quizService.updateQuiz(targetQuizId, {
          quizType: selectedRoundType,
          currentRound,
          rounds: updatedRounds,
          questions: defaultQ
        });

        setStatusMsg({
          type: 'success',
          text: `Round ${currentRound} is ready! You can now add questions.`
        });
        setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
      } catch (err) {
        console.error('Failed to confirm round type in backend:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  // Save Quiz handler
  const handleSaveQuiz = async () => {
    if (!quiz?.id) return;
    try {
      setSaving(true);
      const cleanDefaultMarks = Math.max(1, parseInt(defaultMarks, 10) || 1);
      const cleanDefaultSecondMarks = Math.max(1, parseInt(defaultSecondTryMarks, 10) || 1);
      setDefaultMarks(cleanDefaultMarks);
      if (selectedRoundType === 'one_question_two_chances') {
        setDefaultSecondTryMarks(cleanDefaultSecondMarks);
      }

      const sanitizedQuestions = getSanitizedQuestions();
      setQuestions(sanitizedQuestions);

      let updatedRounds = rounds.map(r => {
        if (r.roundNumber === currentRound) {
          return {
            ...r,
            quizType: selectedRoundType,
            isTypeConfirmed: isTypeConfirmed,
            questions: sanitizedQuestions,
            introMediaUrl: roundIntroMediaUrl,
            introMediaType: roundIntroMediaType
          };
        }
        return r;
      });

      if (!updatedRounds.some(r => r.roundNumber === currentRound)) {
        updatedRounds.push({
          roundNumber: currentRound,
          quizType: selectedRoundType,
          isTypeConfirmed: isTypeConfirmed,
          questions: sanitizedQuestions,
          introMediaUrl: roundIntroMediaUrl,
          introMediaType: roundIntroMediaType,
          isCompleted: false
        });
      }

      setRounds(updatedRounds);

      await quizService.updateQuiz(quiz.id, {
        name: quizName,
        description: quizDescription,
        quizType: selectedRoundType,
        defaultMarks: cleanDefaultMarks,
        defaultSecondTryMarks: cleanDefaultSecondMarks,
        defaultTimeValue,
        defaultTimeUnit,
        currentRound,
        rounds: updatedRounds,
        questions: sanitizedQuestions
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setStatusMsg({ type: 'success', text: `All rounds and questions saved successfully!` });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);

      if (quizName) {
        document.title = `${quizName} | Eventora Quiz`;
        const slug = slugify(quizName);
        if (slug && quizId !== slug) {
          navigate(`/app/quiz/${slug}/questions`, { replace: true, state: { ...location.state, quizId: quiz.id, round: currentRound } });
        }
      }
    } catch (err) {
      console.error('Failed to save quiz:', err);
      setStatusMsg({ type: 'error', text: 'Failed to save quiz: ' + (err.message || 'Unknown error') });
    } finally {
      setSaving(false);
    }
  };

  // Next Step handler: automatically saves all questions/rounds and navigates to the Participants & Wheel page
  const handleGoToNext = async () => {
    const targetQuizId = quiz?.id || location.state?.quizId || quizId;
    if (!targetQuizId) return;

    try {
      setSaving(true);
      const cleanDefaultMarks = Math.max(1, parseInt(defaultMarks, 10) || 1);
      const cleanDefaultSecondMarks = Math.max(1, parseInt(defaultSecondTryMarks, 10) || 1);
      const sanitizedQuestions = getSanitizedQuestions();

      let updatedRounds = rounds.map(r => {
        if (r.roundNumber === currentRound) {
          return {
            ...r,
            quizType: selectedRoundType,
            isTypeConfirmed: isTypeConfirmed,
            questions: sanitizedQuestions,
            introMediaUrl: roundIntroMediaUrl,
            introMediaType: roundIntroMediaType
          };
        }
        return r;
      });

      if (!updatedRounds.some(r => r.roundNumber === currentRound)) {
        updatedRounds.push({
          roundNumber: currentRound,
          quizType: selectedRoundType,
          isTypeConfirmed: isTypeConfirmed,
          questions: sanitizedQuestions,
          introMediaUrl: roundIntroMediaUrl,
          introMediaType: roundIntroMediaType,
          isCompleted: false
        });
      }

      setRounds(updatedRounds);

      const round1 = updatedRounds.find(r => r.roundNumber === 1) || updatedRounds[0];

      await quizService.updateQuiz(targetQuizId, {
        name: quizName,
        description: quizDescription,
        quizType: round1?.quizType || selectedRoundType,
        defaultMarks: cleanDefaultMarks,
        defaultSecondTryMarks: cleanDefaultSecondMarks,
        defaultTimeValue,
        defaultTimeUnit,
        currentRound: 1, // Start quiz from Round 1
        rounds: updatedRounds,
        questions: round1?.questions || sanitizedQuestions
      });

      const slug = slugify(quizName) || targetQuizId;
      navigate(`/app/quiz/${slug}/play`, { state: { quizId: targetQuizId, round: 1, tab: 'participants' } });
    } catch (err) {
      console.error('Auto-save before next step failed:', err);
      const slug = slugify(quizName) || targetQuizId;
      navigate(`/app/quiz/${slug}/play`, { state: { quizId: targetQuizId, round: 1, tab: 'participants' } });
    } finally {
      setSaving(false);
    }
  };

  // Bulk Apply Marks to All Questions
  const handleApplyMarksToAll = () => {
    const markVal = Math.max(1, parseInt(defaultMarks, 10) || 1);
    const secondMarkVal = Math.max(1, parseInt(defaultSecondTryMarks, 10) || 1);
    setDefaultMarks(markVal);
    if (selectedRoundType === 'one_question_two_chances') {
      setDefaultSecondTryMarks(secondMarkVal);
    }
    setQuestions(prev => prev.map(q => ({
      ...q,
      marks: markVal,
      ...(selectedRoundType === 'one_question_two_chances' ? { secondTryMarks: secondMarkVal } : {})
    })));

    setStatusMsg({
      type: 'success',
      text: selectedRoundType === 'one_question_two_chances'
        ? `Updated all ${questions.length} questions to ${markVal} pts (1st try) and ${secondMarkVal} pts (2nd try).`
        : `Updated all ${questions.length} questions to ${markVal} mark${markVal === 1 ? '' : 's'} each.`
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
    const secondMarkVal = Math.max(1, parseInt(defaultSecondTryMarks, 10) || 1);
    setDefaultMarks(markVal);
    if (selectedRoundType === 'one_question_two_chances') {
      setDefaultSecondTryMarks(secondMarkVal);
    }
    const numTime = parseFloat(defaultTimeValue);
    const hasTime = defaultTimeValue !== '' && !isNaN(numTime) && numTime > 0;
    const inSeconds = hasTime ? (defaultTimeUnit === 'min' ? Math.round(numTime * 60) : Math.round(numTime)) : null;

    setQuestions(prev => prev.map(q => ({
      ...q,
      marks: markVal,
      ...(selectedRoundType === 'one_question_two_chances' ? { secondTryMarks: secondMarkVal } : {}),
      timeValue: hasTime ? numTime : '',
      timeUnit: defaultTimeUnit,
      timeLimit: inSeconds
    })));

    setStatusMsg({
      type: 'success',
      text: selectedRoundType === 'one_question_two_chances'
        ? `Applied ${markVal} pts / ${secondMarkVal} pts and ${hasTime ? `${numTime} ${defaultTimeUnit}` : 'no'} time limit to all ${questions.length} questions.`
        : `Applied ${markVal} pts and ${hasTime ? `${numTime} ${defaultTimeUnit}` : 'no'} time limit to all ${questions.length} questions.`
    });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Add a new question
  const handleAddQuestion = () => {
    const markVal = Math.max(1, parseInt(defaultMarks, 10) || 1);
    const secondMarkVal = Math.max(1, parseInt(defaultSecondTryMarks, 10) || 1);
    const numTime = parseFloat(defaultTimeValue);
    const hasTime = defaultTimeValue !== '' && !isNaN(numTime) && numTime > 0;
    const inSeconds = hasTime ? (defaultTimeUnit === 'min' ? Math.round(numTime * 60) : Math.round(numTime)) : null;

    const isDirect = selectedRoundType === 'answer_to_question';
    const isTwoChances = selectedRoundType === 'one_question_two_chances';
    const isMedia = selectedRoundType === 'media_based';

    const newQ = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: '',
      format: isDirect ? 'direct' : 'mcq',
      mediaType: 'image',
      mediaUrl: '',
      answer: isDirect ? '' : undefined,
      marks: markVal,
      secondTryMarks: isTwoChances ? secondMarkVal : undefined,
      timeLimit: inSeconds,
      timeValue: hasTime ? numTime : '',
      timeUnit: defaultTimeUnit || 'sec',
      options: isDirect ? [] : [
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
      format: target.format || 'mcq',
      mediaType: target.mediaType || 'image',
      mediaUrl: target.mediaUrl || '',
      answer: target.answer !== undefined ? target.answer : '',
      timeLimit: target.timeLimit || null,
      timeValue: target.timeValue !== undefined ? target.timeValue : '',
      timeUnit: target.timeUnit || 'sec',
      marks: target.marks,
      secondTryMarks: target.secondTryMarks,
      options: Array.isArray(target.options) ? target.options.map(o => ({
        ...o,
        id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
      })) : []
    };

    const nextList = [...questions];
    nextList.splice(idx + 1, 0, dup);
    setQuestions(nextList);
  };

  // Delete question
  const handleDeleteQuestion = (idx) => {
    if (questions.length <= 1) {
      setQuestions([
        createDefaultQuestion(selectedRoundType, defaultMarks, defaultSecondTryMarks)
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

  // Update Question Answer (for Answer to Question mode)
  const handleQuestionAnswerChange = (idx, text) => {
    setQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], answer: text };
      return next;
    });
  };

  // Update Question Format (MCQ vs Direct Answer / Question Only)
  const handleQuestionFormatChange = (idx, format) => {
    setQuestions(prev => {
      const next = [...prev];
      const cur = next[idx];
      let nextOptions = cur.options || [];
      if (format === 'mcq' && (!nextOptions || nextOptions.length === 0)) {
        nextOptions = [
          { id: 'opt_1', text: '', isCorrect: true },
          { id: 'opt_2', text: '', isCorrect: false },
          { id: 'opt_3', text: '', isCorrect: false },
          { id: 'opt_4', text: '', isCorrect: false }
        ];
      }
      next[idx] = {
        ...cur,
        format,
        options: nextOptions,
        answer: cur.answer !== undefined ? cur.answer : ''
      };
      return next;
    });
  };

  // Update Question Media Type (image | audio | video)
  const handleQuestionMediaTypeChange = (idx, mediaType) => {
    setQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], mediaType };
      return next;
    });
  };

  // Update Question Media URL link
  const handleQuestionMediaUrlChange = (idx, mediaUrl) => {
    setQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], mediaUrl };
      return next;
    });
  };

  // Update Individual Question Marks (1st Try / Standard)
  const handleQuestionMarksChange = (idx, marks) => {
    const val = marks === '' ? '' : (parseInt(marks, 10) || '');
    setQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], marks: val };
      return next;
    });
  };

  const handleQuestionMarksBlur = (idx) => {
    setQuestions(prev => {
      const next = [...prev];
      const cur = next[idx]?.marks;
      if (cur === '' || cur === null || cur === undefined || Number(cur) < 1) {
        next[idx] = { ...next[idx], marks: 1 };
      }
      return next;
    });
  };

  // Update Individual Question 2nd Try Marks (for One Question - 2 Chances)
  const handleQuestionSecondTryMarksChange = (idx, marks) => {
    const val = marks === '' ? '' : (parseInt(marks, 10) || '');
    setQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], secondTryMarks: val };
      return next;
    });
  };

  const handleQuestionSecondTryMarksBlur = (idx) => {
    setQuestions(prev => {
      const next = [...prev];
      const cur = next[idx]?.secondTryMarks;
      if (cur === '' || cur === null || cur === undefined || Number(cur) < 1) {
        next[idx] = { ...next[idx], secondTryMarks: 1 };
      }
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

  const typeDef = QUIZ_TYPES.find(t => t.id === selectedRoundType) || QUIZ_TYPES.find(t => t.id === quiz.quizType) || QUIZ_TYPES[0];

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
        <Link
          to={`/app/quiz/${slugify(quizName) || quiz.id}`}
          className="text-gray-900 dark:text-white font-bold hover:text-[#635BFF] transition-colors truncate max-w-xs"
        >
          {quizName}
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        <span className="text-[#635BFF] font-bold">Round {currentRound}</span>
      </nav>

      {/* Rounds Navigation Header Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
          <div className="flex items-center gap-1.5 shrink-0 pr-1 text-xs font-black text-gray-500 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[#635BFF]" />
            <span>Rounds:</span>
          </div>

          {rounds.map((rnd) => {
            const isActive = rnd.roundNumber === currentRound;
            const rndQuestionCount = isActive ? questions.length : (rnd.questions?.length || 0);

            return (
              <div key={rnd.roundNumber} className="relative group shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => handleSwitchRound(rnd.roundNumber)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/30 font-black'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>Round {rnd.roundNumber}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {rndQuestionCount} {rndQuestionCount === 1 ? 'Q' : 'Qs'}
                  </span>
                </button>

                {/* Delete round button (if more than 1 round exists) */}
                {rounds.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRoundToDeleteNum(rnd.roundNumber);
                    }}
                    className="ml-1 p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title={`Delete Round ${rnd.roundNumber}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Round Button */}
          <button
            type="button"
            onClick={handleAddRound}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-[#635BFF]/60 hover:border-[#635BFF] text-[#635BFF] dark:text-[#8881FF] hover:bg-violet-50/60 dark:hover:bg-violet-950/30 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Round</span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-gray-400 shrink-0">
          Total: {rounds.length} {rounds.length === 1 ? 'Round' : 'Rounds'}
        </div>
      </div>

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

      {/* Round 1 / Round N Type Selection view (shown before confirming round type) */}
      {!isTypeConfirmed ? (
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-6 px-2">
          <div className="max-w-xl w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/70 text-[#635BFF] dark:text-[#8881FF] text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Round {currentRound}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                Round {currentRound}: Select Quiz Type
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Choose the question format for Round {currentRound}. Once confirmed, you can add questions, customize options, and set marks.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Quiz Type
              </label>
              <StylishQuizTypeDropdown
                selectedTypeId={selectedRoundType}
                onChange={setSelectedRoundType}
              />
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleConfirmRoundType}
                disabled={saving || !selectedRoundType}
                className={`w-full py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  !selectedRoundType
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-[#635BFF] hover:bg-[#5145E5] text-white shadow-[#635BFF]/30 cursor-pointer'
                }`}
              >
                <span>{saving ? 'Setting up Round...' : `Confirm & Setup Round ${currentRound}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Quiz Master Header Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-600 text-white shrink-0">
                  Round {currentRound}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] shrink-0">
                  {typeDef.id === 'one_question_two_chances'
                    ? 'One Question - Two Chances (MCQ)'
                    : typeDef.id === 'one_question_one_chance'
                    ? 'One Question - One Chance (MCQ)'
                    : typeDef.id === 'answer_to_question'
                    ? 'Answer to Question (Direct Q&A)'
                    : typeDef.id === 'media_based'
                    ? 'Media Question (Audio/Video/Image)'
                    : `${typeDef.name} (MCQ)`}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-2 flex-wrap">
                  <span>{typeDef.description}</span>
                  <button
                    type="button"
                    onClick={() => setIsTypeConfirmed(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 dark:hover:bg-violet-900/60 text-[#635BFF] dark:text-[#8881FF] border border-violet-200/80 dark:border-violet-800/60 transition-all cursor-pointer shadow-xs shrink-0"
                    title="Change quiz type for this round"
                  >
                    <span>Change Type</span>
                  </button>
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

          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
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

          <button
            type="button"
            onClick={handleGoToNext}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold transition-all shadow-md shadow-[#635BFF]/30 cursor-pointer disabled:opacity-50"
          >
            <span>{saving ? 'Saving...' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Round Intro Media Attachment (Optional) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Round {currentRound} Intro Media <span className="font-normal text-xs text-gray-400 lowercase">(optional)</span>
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Play an intro video, audio clip, or show an image before Round {currentRound} begins.
                </p>
              </div>
            </div>
          </div>

          {/* Media Type Tabs */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#12141F] p-0.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
            <button
              type="button"
              onClick={() => setRoundIntroMediaType('video')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roundIntroMediaType === 'video'
                  ? 'bg-[#635BFF] text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
            <button
              type="button"
              onClick={() => setRoundIntroMediaType('audio')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roundIntroMediaType === 'audio'
                  ? 'bg-[#635BFF] text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Audio</span>
            </button>
            <button
              type="button"
              onClick={() => setRoundIntroMediaType('image')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roundIntroMediaType === 'image'
                  ? 'bg-[#635BFF] text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
          </div>
        </div>

        <input
          type="url"
          value={roundIntroMediaUrl}
          onChange={(e) => setRoundIntroMediaUrl(e.target.value)}
          placeholder={
            roundIntroMediaType === 'video'
              ? `Paste Google Drive video link, YouTube, Vimeo, or .mp4 URL for Round ${currentRound} intro...`
              : roundIntroMediaType === 'audio'
              ? `Paste Google Drive audio link or audio URL for Round ${currentRound} intro...`
              : `Paste Google Drive image link or image URL for Round ${currentRound} intro...`
          }
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12141F] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400"
        />

        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          Supports <strong>Google Drive</strong> (ensure sharing is "Anyone with the link can view"), <strong>YouTube</strong>, <strong>Vimeo</strong>, or direct links. If left empty, Round {currentRound} starts directly at the wheel.
        </p>

        {roundIntroMediaUrl && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Round {currentRound} Intro Preview
            </div>
            <div className="max-w-md rounded-xl overflow-hidden max-h-56">
              <MediaViewer mediaUrl={roundIntroMediaUrl} mediaType={roundIntroMediaType} />
            </div>
          </div>
        )}
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

        <div className="flex flex-col sm:items-end items-center gap-2.5">
          {/* Mark & Time Inputs Row */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            {/* Mark Input(s) */}
            {selectedRoundType === 'one_question_two_chances' ? (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs" title="1st Attempt Marks">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">1st Try:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={defaultMarks !== undefined && defaultMarks !== null ? defaultMarks : ''}
                    onChange={(e) => setDefaultMarks(e.target.value === '' ? '' : (parseInt(e.target.value, 10) || ''))}
                    onBlur={() => {
                      if (!defaultMarks || Number(defaultMarks) < 1) {
                        setDefaultMarks(1);
                      }
                    }}
                    className="w-12 sm:w-14 text-xs font-bold text-gray-900 dark:text-white text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[11px] text-gray-400">pts</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs" title="2nd Attempt Marks">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">2nd Try:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={defaultSecondTryMarks !== undefined && defaultSecondTryMarks !== null ? defaultSecondTryMarks : ''}
                    onChange={(e) => setDefaultSecondTryMarks(e.target.value === '' ? '' : (parseInt(e.target.value, 10) || ''))}
                    onBlur={() => {
                      if (!defaultSecondTryMarks || Number(defaultSecondTryMarks) < 1) {
                        setDefaultSecondTryMarks(1);
                      }
                    }}
                    className="w-12 sm:w-14 text-xs font-bold text-gray-900 dark:text-white text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[11px] text-gray-400">pts</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-xs">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Mark:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={defaultMarks !== undefined && defaultMarks !== null ? defaultMarks : ''}
                  onChange={(e) => setDefaultMarks(e.target.value === '' ? '' : (parseInt(e.target.value, 10) || ''))}
                  onBlur={() => {
                    if (!defaultMarks || Number(defaultMarks) < 1) {
                      setDefaultMarks(1);
                    }
                  }}
                  className="w-12 sm:w-14 text-xs font-bold text-gray-900 dark:text-white text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[11px] text-gray-400">pts</span>
              </div>
            )}

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
          </div>

          {/* Action Buttons: Centered in the middle */}
          <div className="flex items-center justify-center gap-2 w-full">
            <button
              type="button"
              onClick={handleApplyMarksToAll}
              title="Apply only marks to all questions"
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs shadow-violet-600/25 transition-all cursor-pointer whitespace-nowrap"
            >
              Apply Marks
            </button>

            <button
              type="button"
              onClick={handleApplyTimeToAll}
              title="Apply only time limit to all questions"
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs shadow-amber-600/25 transition-all cursor-pointer whitespace-nowrap"
            >
              Apply Time
            </button>

            <button
              type="button"
              onClick={handleApplyAllToAll}
              title="Apply both marks and time limit to all questions"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shadow-indigo-600/25 transition-all cursor-pointer whitespace-nowrap"
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
                  {selectedRoundType === 'one_question_two_chances' ? (
                    <>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50" title="Marks for 1st attempt">
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">1st Try:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={q.marks !== undefined && q.marks !== null ? q.marks : ''}
                          onChange={(e) => handleQuestionMarksChange(qIdx, e.target.value)}
                          onBlur={() => handleQuestionMarksBlur(qIdx)}
                          className="w-12 sm:w-14 text-xs font-black text-emerald-700 dark:text-emerald-300 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">pts</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50" title="Marks for 2nd attempt">
                        <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">2nd Try:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={q.secondTryMarks !== undefined && q.secondTryMarks !== null ? q.secondTryMarks : ''}
                          onChange={(e) => handleQuestionSecondTryMarksChange(qIdx, e.target.value)}
                          onBlur={() => handleQuestionSecondTryMarksBlur(qIdx)}
                          className="w-12 sm:w-14 text-xs font-black text-teal-700 dark:text-teal-300 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-teal-600 dark:text-teal-400">pts</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Marks:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={q.marks !== undefined && q.marks !== null ? q.marks : ''}
                        onChange={(e) => handleQuestionMarksChange(qIdx, e.target.value)}
                        onBlur={() => handleQuestionMarksBlur(qIdx)}
                        className="w-12 sm:w-14 text-xs font-black text-emerald-700 dark:text-emerald-300 text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">pts</span>
                    </div>
                  )}

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

              {/* Question Format Selector (for media_based round) */}
              {selectedRoundType === 'media_based' && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-[#12141F] border border-gray-200/80 dark:border-gray-800">
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">Question Format</span>
                    <span className="text-[11px] text-gray-400">Choose MCQ (with choices) or Question Only (verbal / direct answer)</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-[#161925] p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleQuestionFormatChange(qIdx, 'mcq')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (q.format || 'mcq') === 'mcq'
                          ? 'bg-[#635BFF] text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Multiple Choice (MCQ)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionFormatChange(qIdx, 'direct')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        q.format === 'direct'
                          ? 'bg-[#635BFF] text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Question Only (Direct Answer)
                    </button>
                  </div>
                </div>
              )}

              {/* Media Attachment (URL input, media type tabs, live preview) */}
              {(selectedRoundType === 'media_based' || q.mediaUrl) && (
                <div className="p-3.5 rounded-2xl bg-violet-50/40 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Media Attachment (Link / URL)</span>
                    </div>

                    {/* Media Type Tabs */}
                    <div className="flex items-center gap-1 bg-white dark:bg-[#12141F] p-0.5 rounded-lg border border-violet-200/60 dark:border-violet-800/60 text-xs">
                      <button
                        type="button"
                        onClick={() => handleQuestionMediaTypeChange(qIdx, 'image')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          (q.mediaType || 'image') === 'image'
                            ? 'bg-[#635BFF] text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuestionMediaTypeChange(qIdx, 'audio')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          q.mediaType === 'audio'
                            ? 'bg-[#635BFF] text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <Music className="w-3 h-3" />
                        <span>Audio</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuestionMediaTypeChange(qIdx, 'video')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          q.mediaType === 'video'
                            ? 'bg-[#635BFF] text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <VideoIcon className="w-3 h-3" />
                        <span>Video</span>
                      </button>
                    </div>
                  </div>

                  <input
                    type="url"
                    value={q.mediaUrl || ''}
                    onChange={(e) => handleQuestionMediaUrlChange(qIdx, e.target.value)}
                    placeholder={
                      (q.mediaType || 'image') === 'image'
                        ? 'Paste Google Drive image link or web image URL (Unsplash, Imgur, .png, .jpg)...'
                        : q.mediaType === 'audio'
                        ? 'Paste Google Drive audio link or audio URL (.mp3, .wav)...'
                        : 'Paste Google Drive video link, YouTube, Vimeo, or .mp4 URL...'
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-violet-200/80 dark:border-violet-800/80 bg-white dark:bg-[#12141F] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400"
                  />
                  <p className="text-[10.5px] text-gray-500 dark:text-gray-400">
                    Supports <strong>Google Drive</strong> (ensure link sharing is set to "Anyone with the link can view"), <strong>YouTube</strong>, <strong>Vimeo</strong>, or direct media URLs.
                  </p>

                  {q.mediaUrl && (
                    <div className="pt-2 border-t border-violet-100 dark:border-violet-900/30">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Media Preview
                      </div>
                      <div className="max-w-md rounded-xl overflow-hidden">
                        <MediaViewer mediaUrl={q.mediaUrl} mediaType={q.mediaType || 'image'} />
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {selectedRoundType === 'answer_to_question' || (selectedRoundType === 'media_based' && q.format === 'direct') ? (
                /* Direct Answer (Answer to Question / Direct Media Question) */
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                    Correct Answer <span className="normal-case font-normal text-gray-400">(Revealed when "Show Answer" is clicked during quiz)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={q.answer || ''}
                    onChange={(e) => handleQuestionAnswerChange(qIdx, e.target.value)}
                    placeholder="Enter the correct answer to be revealed, e.g. Canberra / Mitochondria / 1969..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141F] text-sm text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400 resize-none shadow-xs"
                  />
                </div>
              ) : (
                /* Multiple Choice Options List */
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Options <span className="normal-case font-normal text-gray-400">(Select the radio button to designate the correct answer)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-gray-400">
                      {(q.options || []).length} Options
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(q.options || []).map((opt, optIdx) => {
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
                          {(q.options || []).length > 2 && (
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
                  {(q.options || []).length < 8 && (
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
              )}
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

      {/* Sticky Bottom Save Bar (Centered in the main page area without being offset by sidebar) */}
      <div className="fixed bottom-3 sm:bottom-4 left-0 right-0 md:left-[var(--sidebar-width,16rem)] z-30 flex justify-center pointer-events-none px-3 sm:px-4">
        <div className="pointer-events-auto max-w-lg w-full p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#161925]/95 border border-gray-200 dark:border-gray-800 shadow-2xl backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 pl-1 sm:pl-2">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
              <strong>{questions.length}</strong> {questions.length === 1 ? 'question' : 'questions'}
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold transition-all shadow-md shadow-[#635BFF]/30 cursor-pointer disabled:opacity-50"
            >
              <span>{saving ? 'Saving...' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Delete Round Confirmation Dialog */}
      <ConfirmDialog
        isOpen={roundToDeleteNum !== null}
        title={`Delete Round ${roundToDeleteNum}`}
        message={`Are you sure you want to delete Round ${roundToDeleteNum}? All questions in this round will be removed.`}
        confirmText="Delete Round"
        confirmVariant="danger"
        onConfirm={() => handleDeleteRound(roundToDeleteNum)}
        onCancel={() => setRoundToDeleteNum(null)}
        onClose={() => setRoundToDeleteNum(null)}
      />

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

