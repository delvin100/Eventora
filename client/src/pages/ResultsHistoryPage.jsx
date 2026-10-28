import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { History, Trophy, Shuffle, Users, Eye, Trash2, Loader2 } from 'lucide-react';
import ResultDetailModal from '../components/results/ResultDetailModal';
import { resultService } from '../services/resultService';

export default function ResultsHistoryPage() {
  const { eventId } = useParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [inspectingResult, setInspectingResult] = useState(null);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await resultService.getResults(eventId || null);
      setResults(data);
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
    { id: 'all', label: 'All Results' },
    { id: 'wheel', label: 'Wheel Draws' },
    { id: 'shuffle', label: 'Shuffles' },
    { id: 'groups', label: 'Groups' }
  ];

  const filtered = results.filter(r => {
    const type = r.operation_type || r.type;
    if (activeFilter === 'all') return true;
    return type === activeFilter;
  });

  const handleDelete = async (id) => {
    if (window.confirm('Delete this historical result record from Supabase?')) {
      try {
        await resultService.deleteResult(id);
        setResults(prev => prev.filter(r => r.id !== id));
      } catch (err) {
        console.error('Failed to delete result from Supabase:', err);
      }
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
            Audit logs and immutable snapshots of all spinning wheel draws, list shuffles, and group formations saved directly in Supabase.
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

      <div className="bg-white dark:bg-[#161925] rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-xs text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#635BFF]" />
            <span>Loading historical results from Supabase...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 space-y-2">
            <History className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="font-semibold text-gray-600 dark:text-gray-300">No results recorded</p>
            <p>Run a wheel spin, shuffle, or group generation to log immutable records to Supabase.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-[#141722] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-200/80 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3.5">Result Name</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Outcome Summary</th>
                  <th className="px-6 py-3.5">Event</th>
                  <th className="px-6 py-3.5">Recorded</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {filtered.map((r) => {
                  const type = r.operation_type || r.type;
                  const name = r.result_name || r.name;
                  const recordedDate = r.created_at ? new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent';

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {name}
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                        {getOutcomeSummary(r)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#635BFF]">
                        {r.event_name || 'General'}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {recordedDate}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                            onClick={() => handleDelete(r.id)}
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
    </div>
  );
}
