import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import {
  Settings,
  Layers,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { specialEventService } from '../services/specialEventService';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

export default function SpecialEventSettingsPage() {
  const { user, profile } = useAuth();
  const isAdmin = user?.email === 'admin@gmail.com' || profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  const outletCtx = useOutletContext() || {};
  const { eventId: urlParamId } = useParams();
  const eventId = outletCtx.eventId || outletCtx.event?.id || urlParamId;
  const event = outletCtx.event;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState(null);

  const [roundsCount, setRoundsCount] = useState(3);
  const [rounds, setRounds] = useState([
    { roundNumber: 1, task: '' },
    { roundNumber: 2, task: '' },
    { roundNumber: 3, task: '' }
  ]);

  useEffect(() => {
    async function loadSettings() {
      if (!eventId) return;
      try {
        setLoading(true);
        const data = await specialEventService.getSpecialEventSettings(eventId);
        if (data) {
          const count = typeof data.roundsCount === 'number' ? data.roundsCount : (data.rounds?.length || 3);
          setRoundsCount(Math.max(1, count));
          if (Array.isArray(data.rounds) && data.rounds.length > 0) {
            const OLD_DEFAULTS = [
              'Initial participant selection & icebreaker tasks',
              'In-depth performance evaluation & questions',
              'Finalist round & scoring'
            ];
            setRounds(data.rounds.map((r, i) => {
              const rawTask = r.task ?? '';
              return {
                roundNumber: i + 1,
                task: OLD_DEFAULTS.includes(rawTask) ? '' : rawTask
              };
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load special event settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [eventId]);

  const updateRoundsCount = (newCount) => {
    const validCount = Math.max(1, newCount);
    setRoundsCount(validCount);

    setRounds(prev => {
      const nextRounds = [...prev];
      if (validCount > prev.length) {
        for (let i = prev.length + 1; i <= validCount; i++) {
          nextRounds.push({
            roundNumber: i,
            task: ''
          });
        }
      } else if (validCount < prev.length) {
        return nextRounds.slice(0, validCount);
      }
      return nextRounds;
    });
  };

  const handleRoundTaskChange = (index, value) => {
    setRounds(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], task: value };
      return copy;
    });
  };

  const handleAddRound = () => {
    updateRoundsCount(roundsCount + 1);
  };

  const handleRemoveRound = (index) => {
    if (roundsCount <= 1) return;
    setRounds(prev => {
      const filtered = prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, roundNumber: i + 1 }));
      setRoundsCount(filtered.length);
      return filtered;
    });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      await specialEventService.saveSpecialEventSettings(eventId, {
        roundsCount,
        rounds,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setErrorMsg('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteReset = async () => {
    if (!eventId) return;
    try {
      setResetting(true);
      setResetSuccessMsg(null);
      await specialEventService.resetSpecialEventData(eventId);
      setResetSuccessMsg(`Special event "${event?.name || 'This event'}" has been successfully reset. All operational data has been purged, and authorized users are preserved.`);
      setIsResetConfirmOpen(false);
      setRoundsCount(1);
      setRounds([{ roundNumber: 1, task: '' }]);
      setTimeout(() => setResetSuccessMsg(null), 6000);
    } catch (err) {
      console.error('Reset error:', err);
      alert('Failed to reset event: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-gray-400">
        Loading special event settings...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner - Full Width */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-indigo-900/30 border border-violet-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Special Event Settings
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/30">
                Special Event
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Configure competition structure, rounds, and rules for {event?.name || 'this event'}.
            </p>
          </div>
        </div>

        {/* Top Save Shortcut */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25 transition-all cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <span>Saving...</span>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Round settings saved successfully! You can edit these tasks anytime.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Card: Number of Rounds */}
        <div className="p-6 bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Number of Rounds
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Specify how many rounds or progressive stages take place in this event.
              </p>
            </div>

            {/* Stepper counter with direct number typing */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#12141F] border border-gray-200 dark:border-gray-800 rounded-2xl p-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateRoundsCount(roundsCount - 1)}
                disabled={roundsCount <= 1}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#1A1D2B] border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Decrease rounds"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="number"
                min="1"
                value={roundsCount}
                onChange={(e) => updateRoundsCount(parseInt(e.target.value) || 1)}
                className="w-14 text-center font-black text-base text-gray-900 dark:text-white bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={() => updateRoundsCount(roundsCount + 1)}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#1A1D2B] border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center cursor-pointer transition-all"
                title="Increase rounds"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick preset pills */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 mr-1">Quick Select:</span>
            {[1, 2, 3, 4, 5, 6, 8, 10].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => updateRoundsCount(num)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roundsCount === num
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {num} {num === 1 ? 'Round' : 'Rounds'}
              </button>
            ))}
          </div>
        </div>

        {/* Card: Round Tasks */}
        <div className="p-6 bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Round Tasks</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Customize each Round Tasks
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddRound}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Round</span>
            </button>
          </div>

          {/* List of single-input boxes per round */}
          <div className="space-y-3 pt-2">
            {rounds.map((round, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <div className="flex-1 flex items-center rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#161925] overflow-hidden focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all shadow-xs">
                  {/* Non-editable prefix */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-[#131622] text-xs font-bold text-gray-900 dark:text-white border-r border-gray-200/80 dark:border-gray-800 shrink-0 select-none">
                    Round {idx + 1}:
                  </div>
                  {/* Space to type task */}
                  <input
                    type="text"
                    value={round.task || ''}
                    onChange={(e) => handleRoundTaskChange(idx, e.target.value)}
                    placeholder={`Type task for Round ${idx + 1}...`}
                    className="w-full px-4 py-3 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent focus:outline-none"
                  />
                </div>

                {rounds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRound(idx)}
                    className="p-3 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                    title={`Remove Round ${idx + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-gray-400 dark:text-gray-500">
            Tip: You can leave tasks blank and fill or edit them anytime before or during the event.
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-7 py-3.5 rounded-2xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold shadow-lg shadow-[#635BFF]/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <span>Saving Changes...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Round Settings</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* Reset Special Event Data (Admin & Authorized Access Users) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#161925] border border-red-200/80 dark:border-red-900/40 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Reset Special Event Data</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-xl">
            Permanently wipe all registered participants, evaluator login credentials, configured round tasks, evaluator scores, and historical wheel draws for this event from the database. Authorized users will be kept intact.
          </p>
        </div>

        {resetSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{resetSuccessMsg}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={resetting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset {event?.name || 'Special Event'} Data</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title={`Reset "${event?.name || 'Special Event'}" Data?`}
        message={`Are you sure you want to permanently delete all registered participants, evaluator credentials, round tasks, evaluator scores, and wheel draw records for "${event?.name || 'this event'}"? Authorized users will be kept intact. This action cannot be undone.`}
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
