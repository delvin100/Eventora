import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  X,
  AlertCircle,
  Users,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { specialEventService } from '../../services/specialEventService';
import { formatDate } from '../../utils/dateUtils';
import ConfirmDialog from '../common/ConfirmDialog';

const ACCESS_LEVELS = [
  { id: 'Operator', label: 'Operator', desc: 'Can control wheels, tasks & shuffles' },
  { id: 'Evaluator', label: 'Evaluator', desc: 'Can evaluate participants' },
  { id: 'Viewer', label: 'Viewer', desc: 'Read-only live presentation screen' }
];

export default function UserAllocationModal({ isOpen, onClose, event, onAllocationsUpdated }) {
  const [allocatedUsers, setAllocatedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessLevel, setAccessLevel] = useState('Evaluator');
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Password visibility map for list { [userId]: boolean }
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Delete confirmation
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadUsers = async () => {
    if (!event?.id) return;
    try {
      setLoading(true);
      const data = await specialEventService.getAllocatedUsers(event.id);
      setAllocatedUsers(data);
    } catch (err) {
      console.error('Failed to load allocated users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && event?.id) {
      loadUsers();
      setUsername('');
      setPassword('');
      setFormError('');
      setRevealedPasswords({});
    }
  }, [isOpen, event?.id]);

  if (!isOpen || !event) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setShowPassword(true);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setFormError('Please enter a username.');
      return;
    }
    if (!password || password.length < 4) {
      setFormError('Password must be at least 4 characters.');
      return;
    }

    try {
      setFormLoading(true);
      setFormError('');
      const newUser = await specialEventService.addAllocatedUser(event.id, {
        username,
        password,
        accessLevel
      });

      const updated = [newUser, ...allocatedUsers];
      setAllocatedUsers(updated);
      setUsername('');
      setPassword('');
      setShowPassword(false);
      if (onAllocationsUpdated) {
        onAllocationsUpdated(event.id, updated.length);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to add user.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopyCredentials = (u) => {
    const text = `Event: ${event.name}\nUsername: ${u.username}\nPassword: ${u.password}\nAccess: ${u.access_level}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleRevealPassword = (userId) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      await specialEventService.deleteAllocatedUser(event.id, userToDelete.id);
      const updated = allocatedUsers.filter(u => u.id !== userToDelete.id);
      setAllocatedUsers(updated);
      setUserToDelete(null);
      if (onAllocationsUpdated) {
        onAllocationsUpdated(event.id, updated.length);
      }
    } catch (err) {
      console.error('Failed to delete allocated user:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#181B26] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-600/30">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>User Allocation & Access</span>
              </h2>
              <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                {event.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Create User Form Section */}
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#12141D] border border-gray-200/80 dark:border-gray-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Create New User & Password</span>
              </h3>
              <span className="text-[11px] text-gray-400">
                You can create as many users as needed
              </span>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. evaluator1, desk_operator"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B26] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                  />
                </div>

                {/* Password Input with Eye & Generator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      required
                      minLength={4}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B26] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Access Level Selector - Fixed to Evaluator as requested */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Access Level / Role
                </label>
                <div className="max-w-xs">
                  <div className="p-3 rounded-xl border border-violet-500/80 bg-violet-50/80 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 flex items-center justify-between shadow-xs select-none">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs">
                        <Check className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-violet-900 dark:text-violet-200">Evaluator</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">Can evaluate participants</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-200/80 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200">
                      Default
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-md shadow-violet-600/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{formLoading ? 'Adding...' : 'Add Allocated User'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Allocated Users List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span>Allocated Users List ({allocatedUsers.length})</span>
              </h3>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading users...</div>
            ) : allocatedUsers.length === 0 ? (
              <div className="py-8 text-center bg-gray-50/50 dark:bg-[#12141D] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 space-y-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  No users allocated yet
                </p>
                <p className="text-[11px] text-gray-400">
                  Enter a username and password above to allocate your first user for this special event.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allocatedUsers.map((u) => {
                  const isRevealed = revealedPasswords[u.id];
                  const isCopied = copiedId === u.id;
                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-[#151823] border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-violet-500/40 transition-colors"
                    >
                      {/* Left: User details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                              {u.username}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-800/50">
                              {u.access_level === 'Judge' || !u.access_level ? 'Evaluator' : u.access_level}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400">
                            Allocated on {formatDate(u.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Password display & actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-[#11131C] border border-gray-200/60 dark:border-gray-700/60 font-mono text-xs text-gray-800 dark:text-gray-200">
                          <Key className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="tracking-wider">
                            {isRevealed ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPassword(u.id)}
                            className="ml-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer p-0.5"
                            title={isRevealed ? 'Hide password' : 'Show password'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(u)}
                          className="p-2 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 border border-gray-200 dark:border-gray-700/60 transition-colors cursor-pointer"
                          title="Copy credentials"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => setUserToDelete(u)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-gray-200 dark:border-gray-700/60 transition-colors cursor-pointer"
                          title="Remove user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/50 dark:bg-[#151823]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Delete User Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title={userToDelete ? `Remove "${userToDelete.username}"?` : 'Remove User'}
        message="Are you sure you want to remove this user from this special event? They will no longer have access."
        confirmText="Remove User"
        cancelText="Cancel"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}

