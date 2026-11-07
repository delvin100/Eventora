import React, { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import {
  Settings,
  CheckCircle2,
  AlertCircle,
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

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleExecuteReset = async () => {
    if (!eventId) return;
    try {
      setResetting(true);
      setResetSuccessMsg(null);
      setErrorMsg(null);
      await specialEventService.resetSpecialEventData(eventId);
      setResetSuccessMsg(
        `Special event "${event?.name || 'This event'}" has been successfully reset. All operational data has been purged, and authorized users are preserved.`
      );
      setIsResetConfirmOpen(false);
      setTimeout(() => setResetSuccessMsg(null), 6000);
    } catch (err) {
      console.error('Reset error:', err);
      setErrorMsg('Failed to reset event: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner */}
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
              Manage operational maintenance and event data for {event?.name || 'this event'}.
            </p>
          </div>
        </div>
      </div>

      {resetSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{resetSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Reset Special Event Data Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#161925] border border-red-200/80 dark:border-red-900/40 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>Reset Special Event Data</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Permanently wipe all registered participants, evaluator login credentials, configured round tasks, evaluator scores, and historical wheel draws for this event from the database. Authorized users will be kept intact.
            </p>
          </div>

          <div className="shrink-0 flex sm:items-center">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={resetting}
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset {event?.name || 'Special Event'} Data</span>
            </button>
          </div>
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
