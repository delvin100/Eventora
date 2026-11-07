import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { quizService } from '../services/quizService';
import { slugify } from '../utils/slugUtils';
import QuizSettingsModal from '../components/quiz/QuizSettingsModal';

export default function QuizHubPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
          to="/app/quiz"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] text-white text-xs font-bold shadow-md shadow-[#635BFF]/25 hover:bg-[#5145E5] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Quizzes</span>
        </Link>
      </div>
    );
  }

  const quizSlug = slugify(quiz.name) || quiz.id;
  const roundsCount = Array.isArray(quiz.rounds) && quiz.rounds.length > 0 ? quiz.rounds.length : 1;
  const participantsCount = Array.isArray(quiz.participants) ? quiz.participants.length : 0;
  const totalQuestions = (Array.isArray(quiz.rounds) ? quiz.rounds : []).reduce(
    (sum, r) => sum + (Array.isArray(r.questions) ? r.questions.length : 0),
    Array.isArray(quiz.questions) ? quiz.questions.length : 0
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Back Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <Link
            to="/app/quiz"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Quizzes</span>
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-gray-900 dark:text-white font-bold truncate max-w-xs sm:max-w-md">
            {quiz.name}
          </span>
        </div>

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

      {/* 3 Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Questions */}
        <div
          onClick={() => navigate(`/app/quiz/${quizSlug}/questions`, { state: { quizId: quiz.id } })}
          className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-violet-500/80 dark:hover:border-violet-500/80 p-6 sm:p-7 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all cursor-pointer"
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

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              {totalQuestions} questions
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#635BFF] group-hover:translate-x-0.5 transition-transform">
              <span>Setup Questions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Participants */}
        <div
          onClick={() => navigate(`/app/quiz/${quizSlug}/play`, { state: { quizId: quiz.id, tab: 'participants' } })}
          className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 hover:border-sky-500/80 dark:hover:border-sky-500/80 p-6 sm:p-7 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1 transition-all cursor-pointer"
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
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
              <span>View Participants</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Start Quiz */}
        <div
          onClick={() => navigate(`/app/quiz/${quizSlug}/play`, { state: { quizId: quiz.id, startQuiz: true, fullscreen: true, round: quiz.currentRound || 1 } })}
          className="group relative flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#635BFF] to-[#4F46E5] text-white p-6 sm:p-7 shadow-lg shadow-[#635BFF]/25 hover:shadow-2xl hover:shadow-[#635BFF]/35 hover:-translate-y-1 transition-all cursor-pointer ring-1 ring-white/20"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold shadow-xs backdrop-blur-xs">
                <Play className="w-6 h-6 fill-white" />
              </div>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider backdrop-blur-xs">
                Step 3 • Live
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                Start Quiz
              </h3>
              <p className="text-xs text-white/80 mt-2 leading-relaxed">
                Launch the live quiz presentation! Shows the quiz intro, round intro, and opens the wheel for turns and scoring.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/80">
              Round {quiz.currentRound || 1} ready
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white group-hover:translate-x-0.5 transition-transform">
              <span>Launch Quiz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
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
    </div>
  );
}

