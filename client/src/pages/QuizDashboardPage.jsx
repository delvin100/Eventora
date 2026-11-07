import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  CalendarDays,
  Sparkles,
  ChevronDown,
  X,
  Layers,
  ArrowRight,
  BookOpen,
  Award,
  Clock,
  Check,
  Settings
} from 'lucide-react';
import { quizService, QUIZ_TYPES } from '../services/quizService';
import { formatDate } from '../utils/dateUtils';
import { slugify } from '../utils/slugUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';
import QuizSettingsModal from '../components/quiz/QuizSettingsModal';

export default function QuizDashboardPage() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [settingsQuiz, setSettingsQuiz] = useState(null);

  const handleSaveQuizSettings = async (updatedFields) => {
    if (!settingsQuiz?.id) return;
    await quizService.updateQuiz(settingsQuiz.id, updatedFields);
    await loadQuizzes();
  };

  // New Quiz Form state
  const [newQuizName, setNewQuizName] = useState('');
  const [newQuizDescription, setNewQuizDescription] = useState('');
  const [newQuizRounds, setNewQuizRounds] = useState(1);
  const [defaultMarks, setDefaultMarks] = useState(1);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setNewQuizName('');
    setNewQuizDescription('');
    setNewQuizRounds(1);
    setDefaultMarks(1);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await quizService.getQuizzes();
      setQuizzes(data || []);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizName.trim()) {
      setFormError('Please enter a quiz name.');
      return;
    }

    try {
      setCreating(true);
      setFormError('');

      const created = await quizService.createQuiz({
        name: newQuizName,
        description: newQuizDescription,
        defaultMarks: Number(defaultMarks) || 1,
        numberOfRounds: Number(newQuizRounds) || 1
      });

      setIsCreateModalOpen(false);
      setNewQuizName('');
      setNewQuizDescription('');
      setNewQuizRounds(1);
      setDefaultMarks(1);

      // Enter directly into the newly created quiz workspace using slug/name
      const slug = slugify(created.name) || created.id;
      navigate(`/app/quiz/${slug}`, { state: { quizId: created.id } });
    } catch (err) {
      console.error('Failed to create quiz:', err);
      setFormError(err.message || 'Failed to create quiz.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      setDeleteLoading(true);
      await quizService.deleteQuiz(quizToDelete.id);
      setQuizzes(prev => prev.filter(q => q.id !== quizToDelete.id));
      setQuizToDelete(null);
    } catch (err) {
      console.error('Failed to delete quiz:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(q => {
    if (!search.trim()) return true;
    const s = search.toLowerCase().trim();
    return (
      (q.name && q.name.toLowerCase().includes(s)) ||
      (q.description && q.description.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#311068] border border-violet-900/50 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Interactive Assessment Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Quiz Master
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Create multiple-choice quizzes, tailor scoring per question or uniformly, and build question banks with designated correct answers.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-sm font-semibold transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes by title or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-xs"
          />
        </div>
      </div>

      {/* Quizzes List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800/40 animate-pulse border border-gray-200 dark:border-gray-800" />
          ))}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800">
          <HelpCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {search ? 'No quizzes match your search' : 'No quizzes created yet'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            {search
              ? 'Try adjusting your search terms or clear the filter.'
              : 'Create your first quiz to begin adding multiple-choice questions, options, and scores.'}
          </p>
          {!search && (
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#635BFF] hover:bg-[#5145E5] transition-all cursor-pointer shadow-md shadow-[#635BFF]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Quiz</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.map(quiz => {
            const typeDef = QUIZ_TYPES.find(t => t.id === quiz.quizType) || QUIZ_TYPES[0];

            const quizSlug = slugify(quiz.name) || quiz.id;

            return (
              <div
                key={quiz.id}
                onClick={() => navigate(`/app/quiz/${quizSlug}`, { state: { quizId: quiz.id } })}
                className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:border-violet-500/70 dark:hover:border-violet-500/70 transition-all p-5 shadow-xs hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="space-y-3.5">
                  {/* Top Action buttons on top right */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsQuiz(quiz);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer"
                      title="Quiz Intro & Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuizToDelete(quiz);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
                      {quiz.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[32px]">
                      {quiz.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Footer with Date on bottom left */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-start">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    {quiz.created_at ? formatDate(quiz.created_at) : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Quiz Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create New Quiz</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Define quiz name and type</p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              {/* Quiz Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Quiz Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newQuizName}
                  onChange={(e) => setNewQuizName(e.target.value)}
                  placeholder="e.g. Science & Nature Trivia, History Pop Quiz"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141F] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400"
                />
              </div>

              {/* Number of Rounds */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                  Number of Rounds <span className="text-gray-400 font-normal normal-case">(can add more anytime)</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141F] shadow-xs">
                    <button
                      type="button"
                      onClick={() => setNewQuizRounds(prev => Math.max(1, (parseInt(prev, 10) || 1) - 1))}
                      disabled={Number(newQuizRounds) <= 1}
                      className="w-9 h-[42px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-base font-bold select-none border-r border-gray-100 dark:border-gray-800"
                      title="Decrease rounds"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={newQuizRounds}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setNewQuizRounds(isNaN(val) ? '' : Math.max(1, Math.min(20, val)));
                      }}
                      onBlur={() => {
                        if (!newQuizRounds || Number(newQuizRounds) < 1) setNewQuizRounds(1);
                      }}
                      className="w-14 h-[42px] text-sm font-bold text-gray-900 dark:text-white text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setNewQuizRounds(prev => Math.min(20, (parseInt(prev, 10) || 1) + 1))}
                      disabled={Number(newQuizRounds) >= 20}
                      className="w-9 h-[42px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-base font-bold select-none border-l border-gray-100 dark:border-gray-800"
                      title="Increase rounds"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {Number(newQuizRounds) === 1 ? '1 round initial setup' : `${newQuizRounds} rounds configured at start`}
                  </span>
                </div>
              </div>

              {/* Description (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Description <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={newQuizDescription}
                  onChange={(e) => setNewQuizDescription(e.target.value)}
                  placeholder="Briefly describe what this quiz is about..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141F] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>{creating ? 'Creating...' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Settings Modal */}
      <QuizSettingsModal
        quiz={settingsQuiz}
        isOpen={Boolean(settingsQuiz)}
        onClose={() => setSettingsQuiz(null)}
        onSave={handleSaveQuizSettings}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(quizToDelete)}
        title="Delete Quiz"
        message={`Are you sure you want to permanently delete "${quizToDelete?.name}"? All questions, options, and assigned marks will be removed.`}
        confirmText={deleteLoading ? 'Deleting...' : 'Delete Quiz'}
        confirmVariant="danger"
        isLoading={deleteLoading}
        onConfirm={handleDeleteQuiz}
        onCancel={() => setQuizToDelete(null)}
        onClose={() => setQuizToDelete(null)}
      />
    </div>
  );
}

