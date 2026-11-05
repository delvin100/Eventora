import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronDown,
  Loader2,
  Lock,
  Search,
  Check,
  User
} from 'lucide-react';
import { specialEventService } from '../../services/specialEventService';

export default function SpecialEventUserAccessModal({
  isOpen,
  onClose,
  event,
  onUpdated
}) {
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Stylish Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef(null);

  const loadData = async () => {
    if (!event?.id) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const [allUsers, accessList] = await Promise.all([
        specialEventService.getRegisteredUsers(),
        specialEventService.getSpecialEventUserAccess(event.id)
      ]);
      setRegisteredUsers(allUsers || []);
      setAuthorizedUsers(accessList || []);
    } catch (err) {
      console.error('Failed to load user access data:', err);
      setErrorMsg('Could not load registered users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId('');
      setSuccessMsg('');
      setErrorMsg('');
      setIsDropdownOpen(false);
      setDropdownSearch('');
      loadData();
    }
  }, [isOpen, event?.id]);

  // Click outside to close custom dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!isOpen || !event) return null;

  const isUserGranted = (userId) => {
    return authorizedUsers.some(u => u.id === userId || u.userId === userId);
  };

  const selectedUser = registeredUsers.find(u => u.id === selectedUserId);

  const filteredDropdownUsers = registeredUsers.filter(u => {
    const q = dropdownSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setErrorMsg('Please select a registered user first.');
      return;
    }

    const targetUser = registeredUsers.find(u => u.id === selectedUserId);
    if (!targetUser) return;

    try {
      setGranting(true);
      setErrorMsg('');
      setSuccessMsg('');
      const updated = await specialEventService.grantSpecialEventUserAccess(event.id, targetUser);
      setAuthorizedUsers(updated);
      setSelectedUserId('');
      setSuccessMsg(`Access successfully granted to "${targetUser.displayName || targetUser.email}"!`);
      if (onUpdated) onUpdated();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to grant user access:', err);
      setErrorMsg(err.message || 'Failed to grant access.');
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAccess = async (userId, userDisplayName) => {
    try {
      setRevokingId(userId);
      setErrorMsg('');
      setSuccessMsg('');
      const updated = await specialEventService.revokeSpecialEventUserAccess(event.id, userId);
      setAuthorizedUsers(updated);
      setSuccessMsg(`Access revoked for "${userDisplayName || 'User'}".`);
      if (onUpdated) onUpdated();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to revoke access:', err);
      setErrorMsg(err.message || 'Failed to revoke access.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#161825] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/25">
                  Access Control
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                User Access Settings
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {event.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Info pill */}
          <div className="p-3.5 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/40 text-xs text-violet-900 dark:text-violet-200 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              By default, normal users cannot see this special event. Only registered users granted access below will be able to view and open this event in their dashboard.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Grant Access Section with STYLISH CUSTOM DROPDOWN */}
          <form onSubmit={handleGrantAccess} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Grant Access to Registered User
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Custom Dropdown Container */}
              <div ref={dropdownRef} className="relative flex-1">
                {/* Trigger Button */}
                <button
                  type="button"
                  disabled={loading || granting || registeredUsers.length === 0}
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDropdownOpen
                      ? 'border-violet-500 bg-white dark:bg-[#1D2030] ring-2 ring-violet-500/25 shadow-md shadow-violet-500/10'
                      : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/70 dark:bg-[#1A1D2D] hover:border-violet-400 dark:hover:border-violet-500/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedUser ? (
                      <>
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-sm">
                          {(selectedUser.displayName || selectedUser.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 text-left">
                          <span className="block text-xs font-bold text-gray-900 dark:text-white truncate">
                            {selectedUser.displayName}
                          </span>
                          <span className="block text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {selectedUser.email}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-lg bg-gray-200/70 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                          {loading
                            ? 'Loading registered users...'
                            : registeredUsers.length === 0
                            ? 'No registered normal users'
                            : 'Select Registered User...'}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-gray-400">
                    {selectedUserId && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserId('');
                        }}
                        className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="Clear selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180 text-violet-500' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Stylish Dropdown Popover */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-[#161826] border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-2xl shadow-indigo-950/25 dark:shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search inside Dropdown */}
                    <div className="p-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12141F]">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          placeholder="Search user by name or email..."
                          autoFocus
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C1F2E] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                        />
                      </div>
                    </div>

                    {/* Users List */}
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                      {filteredDropdownUsers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          No matching users found
                        </div>
                      ) : (
                        filteredDropdownUsers.map((u) => {
                          const granted = isUserGranted(u.id);
                          const isSelected = selectedUserId === u.id;

                          return (
                            <button
                              key={u.id}
                              type="button"
                              disabled={granted}
                              onClick={() => {
                                if (!granted) {
                                  setSelectedUserId(u.id);
                                  setIsDropdownOpen(false);
                                  setDropdownSearch('');
                                }
                              }}
                              className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all ${
                                granted
                                  ? 'opacity-50 cursor-not-allowed bg-gray-50/50 dark:bg-gray-900/30'
                                  : isSelected
                                  ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-500/30'
                                  : 'hover:bg-gray-100/80 dark:hover:bg-[#1E2235] text-gray-900 dark:text-white cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-violet-600 text-white'
                                      : 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                                  }`}
                                >
                                  {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">
                                    {u.displayName}
                                  </p>
                                  <p className="text-[10px] text-gray-400 truncate">
                                    {u.email}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {granted ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    <Check className="w-3 h-3" />
                                    <span>Granted</span>
                                  </span>
                                ) : isSelected ? (
                                  <Check className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                ) : null}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Grant Access Button */}
              <button
                type="submit"
                disabled={loading || granting || !selectedUserId}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {granting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>Grant Access</span>
              </button>
            </div>
          </form>

          {/* Authorized Users List */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800/80">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>Authorized Users ({authorizedUsers.length})</span>
              </h4>
              <span className="text-[11px] text-gray-400">
                {authorizedUsers.length === 1 ? '1 User has access' : `${authorizedUsers.length} Users have access`}
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                <span>Loading access list...</span>
              </div>
            ) : authorizedUsers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-gray-50/70 dark:bg-[#12141F] border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-1.5">
                <Users className="w-6 h-6 text-gray-400 mx-auto" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  No Users Authorized Yet
                </p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Select a registered user from the dropdown above to grant them access to this special event.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {authorizedUsers.map((u) => {
                  const uId = u.id || u.userId;
                  const isRevoking = revokingId === uId;

                  return (
                    <div
                      key={uId}
                      className="p-3 rounded-2xl bg-gray-50 dark:bg-[#1A1D2D] border border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-violet-600/15 border border-violet-500/25 text-violet-600 dark:text-violet-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {u.displayName || 'Registered User'}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {u.email || 'Email not listed'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Access Granted
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRevokeAccess(uId, u.displayName)}
                          disabled={isRevoking}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50"
                          title="Revoke Access"
                        >
                          {isRevoking ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-[#12141F] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
