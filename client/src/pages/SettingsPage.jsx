import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Volume2, Sparkles, User, Shield, LogOut, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [celebrationEnabled, setCelebrationEnabled] = useState(true);
  const [spinDuration, setSpinDuration] = useState(5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

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
    </div>
  );
}
