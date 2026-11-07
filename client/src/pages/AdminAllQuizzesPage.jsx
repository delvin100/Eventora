import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  Users,
  ArrowRight,
  Trash2,
  Settings,
  Sparkles,
  ShieldCheck,
  User,
  Layers,
  ChevronDown,
  X,
  Plus,
  Check,
  Video,
  Music,
  Image as ImageIcon,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { quizService, QUIZ_TYPES } from '../services/quizService';
import { userService } from '../services/userService';
import { formatDate } from '../utils/dateUtils';
import { slugify } from '../utils/slugUtils';
import ConfirmDialog from '../components/common/ConfirmDialog';
import QuizSettingsModal from '../components/quiz/QuizSettingsModal';

function StylishOrganizerDropdown({ value, onChange, users, totalQuizzesCount }) {
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

  const selectedUser = users.find(u => u.id === value);
  const isAll = !value || value === 'ALL';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-[42px] px-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-xs font-semibold text-gray-800 dark:text-gray-200 hover:border-violet-500/50 dark:hover:border-violet-500/50 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#635BFF]/25 whitespace-nowrap min-w-[210px]"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
            {isAll ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
          </div>
          <span className="truncate">
            {isAll ? 'All Organizers' : selectedUser?.displayName || 'Organizer'}
          </span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
            {isAll ? `${totalQuizzesCount}` : `${selectedUser?.quizzesCount || 0}`}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-violet-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-1.5 w-72 max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
          {/* Option All */}
          <button
            type="button"
            onClick={() => {
              onChange('ALL');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
              isAll
                ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold">All Organizers</p>
                <p className="text-[10px] text-gray-400">All users across platform</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {totalQuizzesCount}
              </span>
              {isAll && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
            </div>
          </button>

          <div className="my-1 border-t border-gray-100 dark:border-gray-800/80" />

          {/* User List */}
          {users.map(u => {
            const isSelected = value === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onChange(u.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{u.displayName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {u.quizzesCount || 0}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminAllQuizzesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';

  const [quizzes, setQuizzes] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get('user') || 'ALL');
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [quizToReset, setQuizToReset] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [settingsQuiz, setSettingsQuiz] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Sync selectedUserId with search params if changed externally
  useEffect(() => {
    const userParam = searchParams.get('user');
    if (userParam && userParam !== selectedUserId) {
      setSelectedUserId(userParam);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allQuizzes, registeredUsers] = await Promise.all([
        quizService.getAllUsersQuizzes(user),
        userService.getUsers().catch(() => [])
      ]);

      const formattedQuizzes = allQuizzes || [];

      // Calculate quizzes count per user
      const countMap = new Map();
      formattedQuizzes.forEach(q => {
        const ownerId = q.owner_id || q.owner?.id;
        if (ownerId) {
          countMap.set(ownerId, (countMap.get(ownerId) || 0) + 1);
        }
      });

      const usersWithCounts = (registeredUsers || []).map(u => ({
        ...u,
        displayName: u.display_name || u.email?.split('@')[0] || 'User',
        quizzesCount: countMap.get(u.id) || 0
      }));

      setQuizzes(formattedQuizzes);
      setUsersList(usersWithCounts);
    } catch (err) {
      console.error('Failed to load all users quizzes:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load user quizzes: ' + (err.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      setDeleteLoading(true);
      await quizService.deleteQuiz(quizToDelete.id);
      setQuizzes(prev => prev.filter(q => q.id !== quizToDelete.id));
      setStatusMsg({
        type: 'success',
        text: `Quiz "${quizToDelete.name}" was successfully removed.`
      });
      setQuizToDelete(null);
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      setStatusMsg({
        type: 'error',
        text: 'Failed to delete quiz: ' + (err.message || 'Unknown error')
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetQuiz = async () => {
    if (!quizToReset) return;
    try {
      setResetLoading(true);
      await quizService.resetQuizProgress(quizToReset.id);
      setQuizToReset(null);
      await loadData();
      setStatusMsg({
        type: 'success',
        text: `Test progress for quiz "${quizToReset.name}" has been reset back to Round 1.`
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to reset quiz progress:', err);
      setStatusMsg({
        type: 'error',
        text: 'Failed to reset quiz progress: ' + (err.message || 'Unknown error')
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSaveQuizSettings = async (updatedFields) => {
    if (!settingsQuiz?.id) return;
    try {
      await quizService.updateQuiz(settingsQuiz.id, updatedFields);
      setSettingsQuiz(null);
      await loadData();
      setStatusMsg({
        type: 'success',
        text: 'Quiz details and intro media updated successfully.'
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to update quiz settings:', err);
      throw err;
    }
  };

  const activeUserFilter = useMemo(() => {
    if (!selectedUserId || selectedUserId === 'ALL') return null;
    return usersList.find(u => u.id === selectedUserId) || null;
  }, [selectedUserId, usersList]);

  const handleUserFilterChange = (userId) => {
    setSelectedUserId(userId);
    if (userId === 'ALL') {
      searchParams.delete('user');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ user: userId });
    }
  };

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      // 1. User filter
      if (selectedUserId && selectedUserId !== 'ALL') {
        const ownerId = q.owner_id || q.owner?.id;
        if (ownerId !== selectedUserId) {
          return false;
        }
      }

      // 2. Type filter
      if (selectedType !== 'All') {
        const typeMatch = q.quizType === selectedType || q.rounds?.some(r => r.quizType === selectedType);
        if (!typeMatch) return false;
      }

      // 3. Search query
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = q.name && q.name.toLowerCase().includes(query);
        const matchesDesc = q.description && q.description.toLowerCase().includes(query);
        const matchesOwnerName = q.owner?.displayName && q.owner.displayName.toLowerCase().includes(query);
        const matchesOwnerEmail = q.owner?.email && q.owner.email.toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesOwnerName || matchesOwnerEmail;
      }

      return true;
    });
  }, [quizzes, selectedUserId, selectedType, search]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const totalQuizzes = quizzes.length;
    const totalQuestions = quizzes.reduce((sum, q) => {
      const qCount = Array.isArray(q.rounds)
        ? q.rounds.reduce((rSum, r) => rSum + (r.questions?.length || 0), 0)
        : (q.questions?.length || 0);
      return sum + qCount;
    }, 0);
    const totalParticipants = quizzes.reduce((sum, q) => sum + (q.participantsCount || q.participants?.length || 0), 0);
    const uniqueOwners = new Set(quizzes.map(q => q.owner_id || q.owner?.id).filter(Boolean)).size;
    return { totalQuizzes, totalQuestions, totalParticipants, uniqueOwners };
  }, [quizzes]);

  const typeFilterOptions = [
    { id: 'All', label: 'All Types' },
    ...QUIZ_TYPES.map(t => ({ id: t.id, label: t.name }))
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#2E1065] border border-violet-900/50 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Super-Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              All User Quizzes Explorer
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Inspect, supervise, and directly interact with any quiz created by registered users across Eventora.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Quizzes</span>
              <span className="text-xl sm:text-2xl font-black text-white">{stats.totalQuizzes}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Questions</span>
              <span className="text-xl sm:text-2xl font-black text-violet-300">{stats.totalQuestions}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Participants</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{stats.totalParticipants}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Organizers</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">{stats.uniqueOwners}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Feedback */}
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

      {/* Controls & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by quiz title, description, organizer name, or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-xs"
            />
          </div>

          {/* User / Organizer Selector */}
          <div className="flex items-center gap-2">
            <StylishOrganizerDropdown
              value={selectedUserId}
              onChange={handleUserFilterChange}
              users={usersList}
              totalQuizzesCount={quizzes.length}
            />

            <Link
              to="/app/quiz"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Quiz</span>
            </Link>
          </div>
        </div>

        {/* Active Filter Pill if filtering by specific user */}
        {activeUserFilter && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs text-violet-800 dark:text-violet-200 w-fit">
            <span>
              Filtering by organizer: <strong>{activeUserFilter.displayName}</strong> ({activeUserFilter.email})
            </span>
            <button
              onClick={() => handleUserFilterChange('ALL')}
              className="p-0.5 rounded-md hover:bg-violet-200 dark:hover:bg-violet-800 text-violet-600 dark:text-violet-300 transition-colors ml-1 cursor-pointer"
              title="Clear organizer filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quiz Type Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {typeFilterOptions.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedType === t.id
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#161925] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-52 rounded-2xl bg-gray-100 dark:bg-gray-800/40 animate-pulse border border-gray-200 dark:border-gray-800" />
          ))}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800">
          <HelpCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No user quizzes found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            {search || selectedType !== 'All' || selectedUserId !== 'ALL'
              ? 'No quizzes match your current filter criteria. Try adjusting the search or filters.'
              : 'There are no quizzes registered by any user in the system yet.'}
          </p>
          {(search || selectedType !== 'All' || selectedUserId !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedType('All');
                handleUserFilterChange('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-[#635BFF] bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.map(quiz => {
            const ownerName = quiz.owner?.displayName || 'Organizer';
            const ownerEmail = quiz.owner?.email || 'user@eventora.app';
            const ownerUsage = quiz.owner?.usageType || 'personal';

            const roundsCount = Array.isArray(quiz.rounds) && quiz.rounds.length > 0 ? quiz.rounds.length : 1;
            const questionsCount = Array.isArray(quiz.rounds)
              ? quiz.rounds.reduce((sum, r) => sum + (r.questions?.length || 0), 0)
              : (quiz.questions?.length || 0);
            const participantsCount = quiz.participantsCount || (Array.isArray(quiz.participants) ? quiz.participants.length : 0);

            const typeDef = QUIZ_TYPES.find(t => t.id === quiz.quizType) || QUIZ_TYPES[0];
            const quizSlug = slugify(quiz.name) || quiz.id;

            return (
              <div
                key={quiz.id}
                onClick={() => {
                  try { sessionStorage.setItem('eventora_admin_quiz_active', 'true'); } catch (_) {}
                  navigate(`/app/quiz/${quizSlug}`, { state: { quizId: quiz.id, fromAdminAllQuizzes: true } });
                }}
                className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:border-violet-500/70 dark:hover:border-violet-500/70 transition-all p-5 shadow-xs hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="space-y-3.5">
                  {/* Category & Date Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF]">
                        {typeDef.name}
                      </span>
                      {quiz.introMediaUrl && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Intro</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {quiz.created_at ? formatDate(quiz.created_at) : ''}
                    </span>
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

                  {/* Creator / Owner Info Box */}
                  <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#1B1E2D] border border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {ownerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">
                          {ownerName}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate block">
                          {ownerEmail}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-200/60 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize shrink-0">
                      {ownerUsage}
                    </span>
                  </div>
                </div>

                {/* Footer with Metrics & Action Buttons */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <strong>{roundsCount}</strong> {roundsCount === 1 ? 'round' : 'rounds'}
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                      <strong>{questionsCount}</strong> Qs
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <strong>{participantsCount}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsQuiz(quiz);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer"
                      title="Quiz Settings & Intro Media"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuizToReset(quiz);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                      title="Reset test progress back to Round 1"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuizToDelete(quiz);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete quiz as Admin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quiz Settings Modal */}
      <QuizSettingsModal
        quiz={settingsQuiz}
        isOpen={Boolean(settingsQuiz)}
        onClose={() => setSettingsQuiz(null)}
        onSave={handleSaveQuizSettings}
      />

      {/* Reset Progress Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(quizToReset)}
        title="Reset Quiz Progress"
        message={`Are you sure you want to reset all test progress for "${quizToReset?.name}"? This will reset all participant points to 0, return all participants to the wheel, and reset the quiz back to Round 1. All questions, options, settings, and participant names will be safely kept.`}
        confirmText={resetLoading ? 'Resetting...' : 'Reset Progress'}
        confirmVariant="danger"
        isLoading={resetLoading}
        onConfirm={handleResetQuiz}
        onCancel={() => setQuizToReset(null)}
        onClose={() => setQuizToReset(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(quizToDelete)}
        title="Delete Quiz"
        message={`Are you sure you want to permanently delete quiz "${quizToDelete?.name}"? All rounds, questions, options, and assigned participant scores will be removed.`}
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

