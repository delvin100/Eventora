import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sun,
  Moon,
  Volume2,
  Sparkles,
  User,
  Shield,
  LogOut,
  Check,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Trophy
} from 'lucide-react';
import { specialEventService } from '../services/specialEventService';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isAdmin = user?.email === 'admin@gmail.com' || profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [celebrationEnabled, setCelebrationEnabled] = useState(true);
  const [spinDuration, setSpinDuration] = useState(5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Special Event Reset states
  const [specialEvents, setSpecialEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState(null);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load all special events for dropdown (defaults to empty: 'Select Special Event')
  const loadSpecialEvents = async () => {
    try {
      setLoadingEvents(true);
      const list = await specialEventService.getSpecialEvents();
      setSpecialEvents(list || []);
      // Do not auto-select an event by default
      setSelectedEventId(prev => (prev && list.some(e => e.id === prev)) ? prev : '');
    } catch (err) {
      console.error('Failed to load special events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadSpecialEvents();
    }
  }, [user?.id, isAdmin]);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExecuteReset = async () => {
    if (!selectedEventId) return;
    try {
      setResetting(true);
      setResetSuccessMsg(null);
      await specialEventService.resetSpecialEventData(selectedEventId);

      const targetEv = specialEvents.find(e => e.id === selectedEventId);
      setResetSuccessMsg(`Special event "${targetEv?.name || 'Selected event'}" data has been completely removed from the database!`);
      setSelectedEventId('');
      setIsResetConfirmOpen(false);

      await loadSpecialEvents();

      // Auto-dismiss alert after 6s
      setTimeout(() => setResetSuccessMsg(null), 6000);
    } catch (err) {
      console.error('Reset special event error:', err);
      alert('Failed to reset event data: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  const currentSelectedEvent = specialEvents.find(e => e.id === selectedEventId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Manage your profile, theme, and draw animation defaults.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Preferences saved successfully!</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <User className="w-4 h-4 text-[#635BFF]" />
          <span>Profile Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              readOnly
              value={profile?.display_name || user?.user_metadata?.display_name || 'Organizer'}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#12141D] border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="text"
              readOnly
              value={user?.email || 'Not logged in'}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#12141D] border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Appearance & Sound */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#635BFF]" />
          <span>Wheel & Appearance Preferences</span>
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Interface Theme</p>
              <p className="text-[11px] text-gray-400">Switch between light and dark visual styles</p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Audible Tick Sound</p>
              <p className="text-[11px] text-gray-400">Play wheel ticking sound during spin rotations</p>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-4 h-4 text-[#635BFF] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Confetti Celebrations</p>
              <p className="text-[11px] text-gray-400">Show particle confetti when a winner is announced</p>
            </div>
            <input
              type="checkbox"
              checked={celebrationEnabled}
              onChange={(e) => setCelebrationEnabled(e.target.checked)}
              className="w-4 h-4 text-[#635BFF] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Default Spin Duration</p>
              <p className="text-[11px] text-gray-400">Standard spin time in seconds ({spinDuration}s)</p>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              value={spinDuration}
              onChange={(e) => setSpinDuration(Number(e.target.value))}
              className="w-28 cursor-pointer accent-[#635BFF]"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-2 px-5 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-sm cursor-pointer"
        >
          Save Preferences
        </button>
      </div>

      {/* Special Event Data Reset (Admin Account Only) */}
      {isAdmin && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161925] border border-red-200/80 dark:border-red-900/40 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Reset Special Event</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select a special event to purge its participants, evaluator scores, access accounts, and wheel draw records from the database.
            </p>
          </div>

          {resetSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {/* Stylish Custom Dropdown for Special Events */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Select Special Event
            </label>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                disabled={loadingEvents || resetting || specialEvents.length === 0}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#12141D] border border-gray-200 dark:border-gray-700/80 hover:border-red-500/40 dark:hover:border-red-500/40 text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-between shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border transition-colors ${
                    currentSelectedEvent
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-gray-200/60 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300/40 dark:border-gray-700/40'
                  }`}>
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  {currentSelectedEvent ? (
                    <>
                      <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
                        {currentSelectedEvent.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 hidden sm:inline-block">
                        {currentSelectedEvent.category || 'Special Event'}
                      </span>
                    </>
                  ) : (
                    <span className="truncate text-sm font-medium text-gray-400 dark:text-gray-500">
                      {loadingEvents ? 'Loading special events...' : (specialEvents.length === 0 ? 'No Special Events Available' : 'Select Special Event')}
                    </span>
                  )}
                </div>

                {/* Stylish embedded arrow inside the box */}
                <div className="w-7 h-7 rounded-xl bg-gray-200/60 dark:bg-gray-800/80 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-red-500 transition-all shrink-0 ml-2 border border-gray-300/40 dark:border-gray-700/40">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-red-500' : ''}`} />
                </div>
              </button>

              {/* Stylish Dropdown Menu */}
              {isDropdownOpen && specialEvents.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 p-1.5 rounded-2xl bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  {specialEvents.map((ev) => {
                    const isSelected = ev.id === selectedEventId;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2333] hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-red-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                          <span className="truncate">{ev.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-red-500 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Reset Action (Appears only after an event is chosen) */}
          {currentSelectedEvent && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800/80 animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                Resetting will permanently delete all participants, evaluator logins, round tasks, scores, and wheel draw records for <span className="font-semibold text-gray-800 dark:text-gray-200">{currentSelectedEvent.name}</span> from the database.
              </p>

              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                disabled={resetting}
                className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset {currentSelectedEvent.name} Data</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Account Session */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Sign Out</p>
          <p className="text-[11px] text-gray-400">Disconnect your current session on this device</p>
        </div>
        <button
          onClick={signOut}
          className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title={`Reset "${currentSelectedEvent?.name}" Data?`}
        message={`Are you sure you want to permanently delete all registered participants, evaluator credentials, configured tasks, evaluator scores, and wheel draw records for "${currentSelectedEvent?.name}"? This action cannot be undone.`}
        confirmText="Yes, Permanently Delete & Reset"
        cancelText="Cancel"
        isDanger={true}
        loading={resetting}
        onConfirm={handleExecuteReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
}
