import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Users,
  Search,
  Trash2,
  CalendarDays,
  FolderKanban,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  UserCheck,
  Mail,
  UserX,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatDate } from '../utils/dateUtils';

export default function UsersManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load registered users:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load registered users.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // If normal user tries to access this page, redirect to /app
  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeleteLoading(true);
      await userService.deleteUser(userToDelete.id);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setFeedbackMsg({
        type: 'success',
        text: `Account "${userToDelete.displayName || userToDelete.email}" and all associated events and results were permanently deleted.`
      });
      setUserToDelete(null);
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to delete user account.'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.usageType && u.usageType.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#2E1065] border border-violet-900/50 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Users Management
            </h1>
            <p className="text-sm text-violet-200/80 max-w-xl">
              View all registered users on the platform. Deleting an account permanently wipes that user and all their events, participants, and results.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
              <span className="block text-2xl font-black text-white">{users.length}</span>
              <span className="text-[11px] text-violet-200 uppercase tracking-wider font-semibold">Registered Users</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Notifications */}
      {feedbackMsg.text && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedbackMsg.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg({ type: '', text: '' })}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email, or usage..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151823] text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all shadow-sm"
          />
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Showing {filteredUsers.length} of {users.length} registered user{users.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Users Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading registered users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-[#151823] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-12 text-center max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800/80 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            No Registered Users Yet
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Aside from admin, there are currently no other user accounts registered on this platform.
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-[#151823] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center text-xs text-gray-400">
          No users match "{search}".
        </div>
      ) : (
        <div className="bg-white dark:bg-[#151823] rounded-2xl border border-gray-200/90 dark:border-gray-800/90 shadow-sm overflow-hidden">
          {/* Table for md+ screens */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#12141F] text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-5">Email</th>
                  <th className="py-3.5 px-5">Usage Type</th>
                  <th className="py-3.5 px-5">Events & Quizzes</th>
                  <th className="py-3.5 px-5">Joined Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-[#1A1D2B] transition-colors"
                  >
                    {/* User display name & avatar */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 text-violet-700 dark:text-violet-300 font-extrabold text-sm flex items-center justify-center shrink-0">
                          {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {u.displayName || 'Unnamed User'}
                          </p>
                          <span className="text-[10px] text-gray-400 font-mono">
                            ID: {u.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    {/* Usage Type */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60">
                        {u.usageType || 'Personal'}
                      </span>
                    </td>

                    {/* Events & Quizzes count */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/app/admin/events?user=${u.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer"
                          title={`View ${u.displayName}'s events in All Events Explorer`}
                        >
                          <FolderKanban className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>
                            {u.eventsCount || 0} Event{(u.eventsCount || 0) === 1 ? '' : 's'}
                          </span>
                        </Link>
                        <Link
                          to={`/app/admin/quizzes?user=${u.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/80 text-violet-700 dark:text-violet-300 font-semibold text-xs border border-violet-200/60 dark:border-violet-800/60 transition-all cursor-pointer"
                          title={`View ${u.displayName}'s quizzes in All Quizzes Explorer`}
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span>Quizzes</span>
                        </Link>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="py-4 px-5 text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{u.createdAt ? formatDate(u.createdAt) : 'Recently'}</span>
                      </div>
                    </td>

                    {/* Action: Delete */}
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => setUserToDelete(u)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-all cursor-pointer"
                        title={`Delete account for ${u.displayName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title={userToDelete ? `Delete Account "${userToDelete.displayName}"?` : 'Delete Account'}
        message={
          userToDelete
            ? `Are you sure you want to permanently delete this user account (${userToDelete.email})? ALL events, participants, results, saved lists, and profile data belonging to this account will be permanently deleted. This action CANNOT be undone.`
            : 'Are you sure you want to delete this account?'
        }
        confirmText="Delete Account & All Data"
        cancelText="Cancel"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}

