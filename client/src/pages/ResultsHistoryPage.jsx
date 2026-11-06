import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { History, Trophy, Shuffle, Users, Eye, Trash2, Loader2, Award, Star, UserCheck, FileText, Sparkles } from 'lucide-react';
import ResultDetailModal from '../components/results/ResultDetailModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SpecialEventDetailedReportModal from '../components/specialEvents/SpecialEventDetailedReportModal';
import { resultService } from '../services/resultService';
import { specialEventService } from '../services/specialEventService';
import { specialEventLiveService } from '../services/specialEventLiveService';
import { formatDateTime } from '../utils/dateUtils';

export default function ResultsHistoryPage() {
  const { eventId: paramId } = useParams();
  const outletCtx = useOutletContext();
  const eventId = outletCtx?.eventId || outletCtx?.event?.id || paramId;
  const isSpecialEvent = outletCtx?.event?.category === 'Special Event' || outletCtx?.event?.name?.toLowerCase().includes('prathibha');

  const [results, setResults] = useState([]);
  const [specialScores, setSpecialScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(isSpecialEvent ? 'evaluator_scores' : 'all');
  const [inspectingResult, setInspectingResult] = useState(null);
  const [resultToDelete, setResultToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [specialSettings, setSpecialSettings] = useState(null);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await resultService.getResults(eventId || null);
      setResults(data);
      if (isSpecialEvent) {
        const scores = await specialEventLiveService.getScores(eventId);
        setSpecialScores(scores || []);
        if (eventId) {
          try {
            const settings = await specialEventService.getSpecialEventSettings(eventId);
            setSpecialSettings(settings);
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error fetching results from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [eventId]);

  const filters = [
    ...(isSpecialEvent ? [{ id: 'evaluator_scores', label: 'Evaluator Scores' }] : []),
    { id: 'all', label: 'All Results' },
    { id: 'wheel', label: 'Wheel Draws' },
    { id: 'shuffle', label: 'Shuffles' },
    { id: 'groups', label: 'Groups' }
  ];

  const filtered = results.filter(r => {
    const type = (r.operation_type || r.type || '').toLowerCase();
    // Exclude internal special event operational records (user access, allocations, settings, etc.)
    if (type.startsWith('special_event_')) return false;
    if (activeFilter === 'all') return true;
    return type === activeFilter;
  });

  const handleDelete = (r) => {
    setResultToDelete(r);
  };

  const confirmDelete = async () => {
    if (!resultToDelete) return;
    try {
      setDeleteLoading(true);
      await resultService.deleteResult(resultToDelete.id);
      setResults(prev => prev.filter(r => r.id !== resultToDelete.id));
      setResultToDelete(null);
    } catch (err) {
      console.error('Failed to delete result from Supabase:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getOutcomeSummary = (r) => {
    const snap = r.result_snapshot || {};
    if (snap.winner) {
      return <span>Winner: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{snap.winner}</strong></span>;
    }
    if (snap.summary) {
      return <span>{snap.summary}</span>;
    }
    if (snap.items) {
      return <span>{snap.items.length} items ordered/selected</span>;
    }
    if (snap.groups) {
      return <span>{snap.groups.length} balanced groups formed</span>;
    }
    return <span>{r.details || 'Completed'}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Results History</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Audit logs and immutable snapshots of all spinning wheel draws, list shuffles, and group formations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-[#635BFF] text-white shadow-xs'
                  : 'bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Special Event Detailed Report Banner */}
      {isSpecialEvent && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-violet-950/70 via-[#1C1736] to-[#141624] border border-violet-800/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>Special Event</span>
              </span>
              <span className="text-xs text-gray-400">
                {specialScores.length} rating{specialScores.length === 1 ? '' : 's'} recorded
              </span>
            </div>
            <h2 className="text-base font-bold text-white">
              Detailed Assessment & Final Leaderboard
            </h2>
            <p className="text-xs text-violet-200/80">
              View round-by-round score + grace calculations, individual evaluator marks, and final average standings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-violet-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Open Detailed Report</span>
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-[#161925] rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-xs text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#635BFF]" />
            <span>Loading historical results...</span>
          </div>
        ) : activeFilter === 'evaluator_scores' ? (
          specialScores.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 space-y-2">
              <Award className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="font-semibold text-gray-600 dark:text-gray-300">No evaluator scores recorded yet</p>
              <p>When evaluators submit scores for students on /ps, their ratings will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 dark:bg-[#141722] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-200/80 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Participant</th>
                    <th className="px-6 py-3.5 text-center">Round</th>
                    <th className="px-6 py-3.5 text-center">Evaluator</th>
                    <th className="px-6 py-3.5 text-center">Base Score</th>
                    <th className="px-6 py-3.5 text-center">Grace</th>
                    <th className="px-6 py-3.5 text-center">Total Marks</th>
                    <th className="px-6 py-3.5 text-center">Recorded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                  {specialScores.map((scoreItem) => {
                    const baseScore = Number(scoreItem.score) || 0;
                    const graceVal = Number(scoreItem.grace !== undefined ? scoreItem.grace : (scoreItem.grade && !isNaN(Number(scoreItem.grade)) ? scoreItem.grade : 0));
                    const totalVal = scoreItem.totalScore !== undefined ? Number(scoreItem.totalScore) : (baseScore + graceVal);

                    return (
                      <tr key={scoreItem.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white text-left">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 font-black text-xs flex items-center justify-center">
                              {scoreItem.studentName?.charAt(0) || 'P'}
                            </div>
                            <span>{scoreItem.studentName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                            Round {scoreItem.roundNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{scoreItem.evaluator}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200 text-center">
                          {baseScore} pts
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            +{graceVal}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 rounded-lg shadow-xs">
                            {totalVal} pts
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-center">
                          {scoreItem.createdAt ? formatDateTime(scoreItem.createdAt) : 'Recent'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 space-y-2">
            <History className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="font-semibold text-gray-600 dark:text-gray-300">No results recorded</p>
            <p>Run a wheel spin, shuffle, or group generation to log records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-[#141722] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-200/80 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3.5 text-left">Result Name</th>
                  <th className="px-6 py-3.5 text-center">Type</th>
                  <th className="px-6 py-3.5 text-center">Outcome Summary</th>
                  <th className="px-6 py-3.5 text-center">Event</th>
                  <th className="px-6 py-3.5 text-center">Recorded</th>
                  <th className="px-6 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {filtered.map((r) => {
                  const type = r.operation_type || r.type;
                  const name = r.result_name || r.name;
                  const recordedDate = r.created_at ? formatDateTime(r.created_at) : 'Recent';

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white text-left">
                        {name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          type === 'wheel'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF]'
                            : type === 'shuffle'
                            ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
                        }`}>
                          {type === 'wheel' && <Trophy className="w-3 h-3" />}
                          {type === 'shuffle' && <Shuffle className="w-3 h-3" />}
                          {type === 'groups' && <Users className="w-3 h-3" />}
                          <span>{type}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200 text-center">
                        {getOutcomeSummary(r)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#635BFF] text-center">
                        {r.event_name || 'General'}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-center">
                        {recordedDate}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setInspectingResult({
                              ...r,
                              name,
                              type,
                              details: (r.result_snapshot?.summary || r.result_snapshot?.winner || r.details || ''),
                              winner: r.result_snapshot?.winner || r.winner
                            })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#635BFF] hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                            title="View snapshot details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                            title="Delete result"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ResultDetailModal
        isOpen={Boolean(inspectingResult)}
        onClose={() => setInspectingResult(null)}
        result={inspectingResult}
      />

      <ConfirmDialog
        isOpen={Boolean(resultToDelete)}
        title="Delete Historical Result?"
        message={`Delete "${resultToDelete?.result_name || 'this result'}" from history? This action cannot be undone.`}
        confirmText="Delete Result"
        cancelText="Cancel"
        isDanger={true}
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setResultToDelete(null)}
      />

      {/* Special Event Detailed Report Modal */}
      <SpecialEventDetailedReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        eventId={eventId}
        eventName={outletCtx?.event?.name || 'Special Event'}
        eventCategory={outletCtx?.event?.category || 'Special Event'}
        participants={outletCtx?.participants || []}
        specialSettings={specialSettings}
        scores={specialScores}
      />
    </div>
  );
}
