import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Users,
  Play,
  Settings,
  Sparkles,
  Layers,
  Award,
  Video,
  Music,
  Image as ImageIcon,
  CheckCircle2,
  RotateCcw,
  FileSpreadsheet,
  Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { quizService } from '../services/quizService';
import { slugify } from '../utils/slugUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';
import QuizSettingsModal from '../components/quiz/QuizSettingsModal';
import QuizExcelImportModal from '../components/quiz/QuizExcelImportModal';

export default function QuizHubPage() {
  const { user } = useAuth();
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const launchStepRef = useRef(null);

  // Automatically scroll down to Step 3 (Launch & Play Quiz) when navigated with scrollTo: 'launch' or #launch
  useEffect(() => {
    if (!loading && (location.state?.scrollTo === 'launch' || location.hash === '#launch')) {
      const timer = setTimeout(() => {
        launchStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, location.state, location.hash]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      const targetId = location.state?.quizId || quizId;
      const data = await quizService.getQuizById(targetId);
      if (!data) {
        throw new Error('Quiz not found');
      }
      setQuiz(data);
    } catch (err) {
      console.error('Failed to load quiz:', err);
      setError(err.message || 'Quiz not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const handleSaveSettings = async (updatedFields) => {
    if (!quiz?.id) return;
    await quizService.updateQuiz(quiz.id, updatedFields);
    await fetchQuiz();
  };

  const handleResetProgress = async () => {
    if (!quiz?.id) return;
    try {
      setResetting(true);
      await quizService.resetQuizProgress(quiz.id);
      setIsResetDialogOpen(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
      await fetchQuiz();
    } catch (err) {
      console.error('Failed to reset quiz progress:', err);
    } finally {
      setResetting(false);
    }
  };

  const handleImportExcelData = async ({ rounds: importedRounds, mode, scope, targetRoundNumber }) => {
    if (!quiz?.id || !importedRounds || importedRounds.length === 0) return;

    try {
      const currentRounds = quiz.rounds || [];
      let mergedRounds = [...currentRounds];

      if (scope === 'single') {
        const roundNum = targetRoundNumber || 1;
        const importedRound = importedRounds[0];
        const newQuestions = importedRound?.questions || [];

        const existingIdx = mergedRounds.findIndex(r => r.roundNumber === roundNum);
        if (existingIdx >= 0) {
          const targetR = mergedRounds[existingIdx];
          const finalQuestions = mode === 'append'
            ? [...(targetR.questions || []), ...newQuestions]
            : newQuestions;

          mergedRounds[existingIdx] = {
            ...targetR,
            quizType: importedRound?.quizType || targetR.quizType,
            questions: finalQuestions,
            isTypeConfirmed: true
          };
        } else {
          mergedRounds.push({
            roundNumber: roundNum,
            name: `Round ${roundNum}`,
            title: `Round ${roundNum}`,
            quizType: importedRound?.quizType || quiz.quizType || 'one_question_one_chance',
            isTypeConfirmed: true,
            questions: newQuestions,
            introMediaUrl: importedRound?.introMediaUrl || '',
            introMediaType: importedRound?.introMediaType || 'video',
            isCompleted: false
          });
        }
        mergedRounds.sort((a, b) => a.roundNumber - b.roundNumber);
      } else {
        if (mode === 'append') {
          const highestExistingRoundNum = currentRounds.reduce((max, r) => Math.max(max, r.roundNumber || 0), 0);
          const remappedImported = importedRounds.map((r, idx) => ({
            ...r,
            roundNumber: highestExistingRoundNum + idx + 1,
            title: r.title ? r.title : `Round ${highestExistingRoundNum + idx + 1}`,
            name: r.title ? r.title : `Round ${highestExistingRoundNum + idx + 1}`
          }));
          mergedRounds = [...currentRounds, ...remappedImported];
        } else {
          mergedRounds = importedRounds;
        }
      }

      const activeRoundNum = scope === 'single' ? (targetRoundNumber || 1) : (quiz.currentRound || 1);
      const activeRound = mergedRounds.find(r => r.roundNumber === activeRoundNum) || mergedRounds[0];

      await quizService.updateQuiz(quiz.id, {
        currentRound: activeRoundNum,
        rounds: mergedRounds,
        quizType: activeRound?.quizType || quiz.quizType,
        questions: activeRound?.questions || []
      });

      await fetchQuiz();
    } catch (err) {
      console.error('Failed to import Excel into quiz:', err);
      throw err;
    }
  };

  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';
  const isOwner = Boolean(user?.id && (quiz?.owner_id === user.id || quiz?.owner?.id === user.id));
  const canReset = isAdmin || isOwner || !user;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Loading quiz overview...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center font-bold">
          <HelpCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white">Quiz Not Found</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{error || 'This quiz could not be located.'}</p>
        <Link
          to="/home/quiz"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold shadow-md shadow-[#635BFF]/25 hover:bg-[#5145E5] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Quizzes</span>
        </Link>
      </div>
    );
  }

  const quizSlug = slugify(quiz.name) || quiz.id;
  const roundsList = Array.isArray(quiz.rounds) && quiz.rounds.length > 0
    ? quiz.rounds
    : [{ roundNumber: 1, questions: quiz.questions || [] }];
  const roundsCount = roundsList.length;
  const participantsCount = Array.isArray(quiz.participants) ? quiz.participants.length : 0;
  const totalQuestions = roundsList.reduce(
    (sum, r) => sum + (Array.isArray(r.questions) ? r.questions.length : 0),
    0
  );
  const activeRound = roundsList.find(r => r.roundNumber === (quiz.currentRound || 1)) || roundsList[0];
  const activeQuestionsCount = Array.isArray(activeRound?.questions) ? activeRound.questions.length : (quiz.questions?.length || 0);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Back Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <Link
            to={location.state?.fromAdminAllQuizzes ? "/home/admin/quizzes" : "/home/quiz"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{location.state?.fromAdminAllQuizzes ? "All User Quizzes" : "All Quizzes"}</span>
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-gray-900 dark:text-white font-bold truncate max-w-xs sm:max-w-md">
            {quiz.name}
          </span>
        </div>

        {/* Top Right Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExcelImportOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Upload an Excel sheet to bulk import rounds and questions"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel</span>
          </button>

          {canReset && (
            <button
              type="button"
              onClick={() => setIsResetDialogOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Reset scores, turns, and wheel progress back to Round 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Progress</span>
            </button>
          )}

          {/* Settings button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:border-violet-500/50 text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Quiz Intro & Settings</span>
          </button>
        </div>
      </div>

      {/* Reset Success Notice */}
      {resetSuccess && (
        <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Quiz progress has been successfully reset! All participant scores are reset to 0, wheel turns are refreshed, and the quiz is set back to Round 1. All questions, options, and settings were safely kept.</span>
        </div>
      )}

      {/* Quiz Header Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-violet-50/40 dark:from-[#161925] dark:via-[#161925] dark:to-violet-950/20 border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-violet-600 text-white shadow-xs">
              Quiz Hub
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] border border-indigo-200/50 dark:border-indigo-800/50">
              {roundsCount} {roundsCount === 1 ? 'Round' : 'Rounds'}
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
              {participantsCount} Participants
            </span>
            {quiz.introMediaUrl && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50">
                <Sparkles className="w-3 h-3" />
                <span>Intro Media Attached</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            {quiz.name}
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {quiz.description || 'Manage questions and rounds, configure participants, or launch the live presentation.'}
          </p>
        </div>
      </div>

      {/* Setup Steps (Steps 1 & 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Questions */}
        <div
          onClick={() => navigate(`/home/quiz/${quizSlug}/questions`, { state: { quizId: quiz.id, fromAdminAllQuizzes: location.state?.fromAdminAllQuizzes } })}
          className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-violet-500/80 dark:hover:border-violet-500/80 p-6 sm:p-8 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] flex items-center justify-center font-bold shadow-xs">
                <HelpCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Step 1
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                Questions
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                Add and organize questions for all rounds, choose MCQ or Direct Answer formats, set marks, and attach round intro media.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400">
                {totalQuestions} questions
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExcelImportOpen(true);
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                title="Import questions from Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#635BFF] group-hover:translate-x-0.5 transition-transform shrink-0">
              <span>Setup Questions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Participants */}
        <div
          onClick={() => navigate(`/home/quiz/${quizSlug}/play`, { state: { quizId: quiz.id, tab: 'participants', fromAdminAllQuizzes: location.state?.fromAdminAllQuizzes } })}
          className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-sky-500/80 dark:hover:border-sky-500/80 p-6 sm:p-8 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1 transition-all cursor-pointer"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shadow-xs">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Step 2
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Participants
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                Add individual participants or bulk import teams from Excel spreadsheets. Manage participants, view spin wheel pool and scores.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              {participantsCount} participants
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform shrink-0">
              <span>View Participants</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Step 3: Launch & Play Arena Modes */}
      <div ref={launchStepRef} id="launch-step" className="space-y-4 pt-2">
        <div>
          <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span>Launch & Play Quiz</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Step 3
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Choose how to host your quiz — on stage with the spin wheel, or live on participants' devices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mode A: Stage & Wheel Presenter */}
          <div
            onClick={() => {
              if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
              }
              navigate(`/home/quiz/${quizSlug}/play`, { state: { quizId: quiz.id, startQuiz: true, fullscreen: true, round: quiz.currentRound || 1, fromAdminAllQuizzes: location.state?.fromAdminAllQuizzes } });
            }}
            className="group relative flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#635BFF] via-[#5145E5] to-[#4338CA] text-white p-6 sm:p-8 shadow-xl shadow-[#635BFF]/20 hover:shadow-2xl hover:shadow-[#635BFF]/35 hover:-translate-y-1 transition-all cursor-pointer ring-1 ring-white/20"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold shadow-xs backdrop-blur-xs">
                  <Play className="w-6 h-6 fill-white" />
                </div>
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-white/20 text-white uppercase tracking-wider backdrop-blur-xs">
                  Stage Wheel Mode
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Spin Wheel & Stage Presenter
                </h3>
                <p className="text-xs text-white/80 mt-2 leading-relaxed">
                  Projector-ready view with the spinning wheel to pick participants, on-stage question turns, and big-screen animations.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80">
                Round {quiz.currentRound || 1} ready
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white group-hover:translate-x-0.5 transition-transform">
                <span>Launch Stage Wheel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Mode B: Live Audience Device Arena */}
          <div
            onClick={() => {
              if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
              }
              navigate(`/home/quiz/${quizSlug}/live`, { state: { quizId: quiz.id, fullscreen: true, fromAdminAllQuizzes: location.state?.fromAdminAllQuizzes } });
            }}
            className="group relative flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#2A1B6B] to-[#1E1B4B] text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/40 hover:shadow-2xl hover:shadow-violet-900/40 hover:-translate-y-1 transition-all cursor-pointer border-2 border-violet-500/40 hover:border-violet-400"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-violet-500/40">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-black px-3 py-1 rounded-full bg-violet-500/30 text-violet-200 border border-violet-400/40 uppercase tracking-wider">
                  Participation
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Live Device Arena
                </h3>
                <p className="text-xs text-violet-200/80 mt-2 leading-relaxed">
                  Audience participates live on their own devices using a 6-digit PIN. Displays questions on screen, tracks live answers, and reveals scores!
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-violet-300">
                PIN & QR Join Ready
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-300 group-hover:translate-x-0.5 transition-transform">
                <span>Host Live Arena</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <QuizSettingsModal
        quiz={quiz}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* Excel Bulk Import Modal */}
      <QuizExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onImport={handleImportExcelData}
        currentRoundsCount={quiz?.rounds?.length || 1}
      />

      {/* Reset Progress Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        title="Reset Quiz Progress"
        message={`Are you sure you want to reset all test progress for "${quiz?.name}"? This will reset all participant points to 0, return all participants to the wheel, and reset the quiz back to Round 1. All questions, options, settings, and participant names will be safely kept.`}
        confirmText={resetting ? 'Resetting...' : 'Reset Progress'}
        confirmVariant="danger"
        isLoading={resetting}
        onConfirm={handleResetProgress}
        onCancel={() => setIsResetDialogOpen(false)}
        onClose={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}

