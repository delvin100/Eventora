import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Medal,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Download,
  Printer,
  X,
  Search,
  Filter,
  Star,
  ChevronDown,
  Sparkles,
  FileSpreadsheet,
  Clock,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SpecialEventDetailedReportModal({
  isOpen,
  onClose,
  eventId,
  eventName = 'Special Event',
  eventCategory = 'Special Event',
  participants = [],
  specialSettings = null,
  scores = []
}) {
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'breakdown' | 'audit'
  const [roundFilter, setRoundFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const roundsConfig = specialSettings?.rounds || [
    { roundNumber: 1, task: 'Round 1 Assessment' },
    { roundNumber: 2, task: 'Round 2 Assessment' }
  ];

  // =========================================================================
  // DATA PROCESSING & AGGREGATION
  // =========================================================================
  const { participantStats, evaluatorsList, topThree, totalSubmissionsCount } = useMemo(() => {
    // 1. Gather all unique evaluators
    const evaluatorsSet = new Set();
    scores.forEach(s => {
      if (s.evaluator) evaluatorsSet.add(s.evaluator);
    });
    const evalList = Array.from(evaluatorsSet);

    // 2. Map participants with their scores across rounds
    // Use participants list if available, otherwise derive from score entries
    const participantMap = new Map();

    participants.forEach(p => {
      participantMap.set(p.name?.trim().toLowerCase(), {
        id: p.id,
        name: p.name,
        externalId: p.external_identifier || '',
        rounds: {}
      });
    });

    scores.forEach(s => {
      const pName = (s.studentName || 'Participant').trim();
      const pKey = pName.toLowerCase();
      if (!participantMap.has(pKey)) {
        participantMap.set(pKey, {
          id: s.studentId || pKey,
          name: pName,
          externalId: '',
          rounds: {}
        });
      }

      const pEntry = participantMap.get(pKey);
      const rNum = Number(s.roundNumber) || 1;
      if (!pEntry.rounds[rNum]) {
        pEntry.rounds[rNum] = [];
      }

      const baseScore = Number(s.score) || 0;
      const graceVal = Number(
        s.grace !== undefined
          ? s.grace
          : (s.grade && !isNaN(Number(s.grade)) ? s.grade : 0)
      );
      const totalMarks = s.totalScore !== undefined
        ? Number(s.totalScore)
        : (baseScore + graceVal);

      pEntry.rounds[rNum].push({
        id: s.id,
        evaluator: s.evaluator || 'Evaluator',
        score: baseScore,
        grace: graceVal,
        totalScore: totalMarks,
        createdAt: s.createdAt
      });
    });

    // 3. Compute totals and averages for each participant
    const stats = Array.from(participantMap.values()).map(p => {
      let grandTotalMarks = 0;
      let totalEvaluationsCount = 0;
      const roundDetails = {};

      roundsConfig.forEach(r => {
        const roundNum = r.roundNumber;
        const entries = p.rounds[roundNum] || [];
        const roundTotal = entries.reduce((acc, curr) => acc + curr.totalScore, 0);
        const roundBaseSum = entries.reduce((acc, curr) => acc + curr.score, 0);
        const roundGraceSum = entries.reduce((acc, curr) => acc + curr.grace, 0);
        const roundAvg = entries.length > 0 ? (roundTotal / entries.length) : 0;

        roundDetails[roundNum] = {
          task: r.task,
          entries: entries,
          totalScore: roundTotal,
          baseScoreSum: roundBaseSum,
          graceSum: roundGraceSum,
          averageScore: roundAvg,
          evaluatorCount: entries.length
        };

        grandTotalMarks += roundTotal;
        totalEvaluationsCount += entries.length;
      });

      // Overall average across rounds
      const activeRoundsEvaluated = Object.values(roundDetails).filter(rd => rd.evaluatorCount > 0);
      const finalAverageMarks = activeRoundsEvaluated.length > 0
        ? (activeRoundsEvaluated.reduce((acc, rd) => acc + rd.averageScore, 0) / activeRoundsEvaluated.length)
        : (totalEvaluationsCount > 0 ? (grandTotalMarks / totalEvaluationsCount) : 0);

      return {
        id: p.id,
        name: p.name,
        externalId: p.externalId,
        roundDetails,
        grandTotalMarks,
        totalEvaluationsCount,
        finalAverageMarks: Number(finalAverageMarks.toFixed(2))
      };
    });

    // 4. Rank participants by final average descending, then grand total descending
    stats.sort((a, b) => {
      if (b.finalAverageMarks !== a.finalAverageMarks) {
        return b.finalAverageMarks - a.finalAverageMarks;
      }
      return b.grandTotalMarks - a.grandTotalMarks;
    });

    // Assign rank
    stats.forEach((st, idx) => {
      st.rank = idx + 1;
    });

    const top3 = stats.slice(0, 3).filter(st => st.totalEvaluationsCount > 0);

    return {
      participantStats: stats,
      evaluatorsList: evalList,
      topThree: top3,
      totalSubmissionsCount: scores.length
    };
  }, [scores, participants, roundsConfig]);

  if (!isOpen) return null;

  // =========================================================================
  // EXPORT TO EXCEL
  // =========================================================================
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Leaderboard & Summary
      const summaryRows = participantStats.map(p => {
        const row = {
          'Rank': p.rank,
          'Participant Name': p.name,
          'Overall Average Marks': p.finalAverageMarks,
          'Grand Total Marks': p.grandTotalMarks,
          'Total Evaluator Ratings': p.totalEvaluationsCount
        };

        roundsConfig.forEach(r => {
          const rd = p.roundDetails[r.roundNumber];
          row[`Round ${r.roundNumber} Avg (${r.task || 'Task'})`] = rd ? Number(rd.averageScore.toFixed(2)) : 0;
          row[`Round ${r.roundNumber} Total`] = rd ? rd.totalScore : 0;
        });

        return row;
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Final Leaderboard');

      // Sheet 2: Detailed Evaluator Log
      const detailRows = scores.map((s, idx) => {
        const base = Number(s.score) || 0;
        const grace = Number(
          s.grace !== undefined
            ? s.grace
            : (s.grade && !isNaN(Number(s.grade)) ? s.grade : 0)
        );
        const total = s.totalScore !== undefined ? Number(s.totalScore) : (base + grace);

        return {
          '#': idx + 1,
          'Participant Name': s.studentName,
          'Round Number': s.roundNumber,
          'Evaluator': s.evaluator,
          'Base Score': base,
          'Grace Marks': grace,
          'Total Marks': total,
          'Recorded At': s.createdAt ? new Date(s.createdAt).toLocaleString() : ''
        };
      });

      const wsDetails = XLSX.utils.json_to_sheet(detailRows);
      XLSX.utils.book_append_sheet(wb, wsDetails, 'Evaluator Breakdown');

      const safeName = (eventName || 'Special_Event').replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `${safeName}_Detailed_Evaluation_Report.xlsx`);
    } catch (err) {
      console.error('Failed to export report to Excel:', err);
      alert('Could not export to Excel: ' + (err.message || 'Unknown error'));
    }
  };

  // Filtered participants for search
  const filteredParticipants = participantStats.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#141724] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in duration-200 print:border-none print:shadow-none print:max-h-none print:w-full">
        
        {/* =====================================================================
            MODAL HEADER & EVENT CONCLUDED BANNER
           ===================================================================== */}
        <div className="px-6 py-5 bg-gradient-to-r from-violet-950 via-[#1D1739] to-[#121422] text-white border-b border-violet-900/40 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Final Event Report</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Concluded
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {eventName}
              </h2>
              <p className="text-xs text-violet-200/80">
                Detailed assessment summary across all rounds, evaluators, base marks, and grace points.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download Excel Workbook"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Print or Save PDF"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Close Report"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-violet-900/50">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/30 text-violet-300 flex items-center justify-center font-black text-sm shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-violet-300">Participants</p>
                <p className="text-base font-black text-white">{participantStats.length}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-black text-sm shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-indigo-300">Total Rounds</p>
                <p className="text-base font-black text-white">{roundsConfig.length}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-black text-sm shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-emerald-300">Evaluators</p>
                <p className="text-base font-black text-white">{evaluatorsList.length || 1}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600/30 text-amber-300 flex items-center justify-center font-black text-sm shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-amber-300">Total Ratings</p>
                <p className="text-base font-black text-white">{totalSubmissionsCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            TOP NAVIGATION TABS & SEARCH
           ===================================================================== */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-[#11131D] border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Final Leaderboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'breakdown'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Evaluator Breakdown by Round
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              All Rating Entries ({totalSubmissionsCount})
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search participant..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B28] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* =====================================================================
            BODY CONTENT AREA (Scrollable)
           ===================================================================== */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* ===================================================================
              TAB 1: LEADERBOARD & FINAL SUMMARY
             =================================================================== */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              {/* Podium Highlight for Top 3 */}
              {topThree.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {topThree.map((winner, idx) => {
                    const badgeStyles = [
                      { title: '1st Place Winner', border: 'border-amber-400 dark:border-amber-500/50', bg: 'bg-amber-500/10 text-amber-500', crown: 'text-amber-400' },
                      { title: '2nd Place', border: 'border-slate-300 dark:border-slate-600', bg: 'bg-slate-500/10 text-slate-400', crown: 'text-slate-300' },
                      { title: '3rd Place', border: 'border-amber-700/40 dark:border-amber-700/40', bg: 'bg-amber-700/10 text-amber-600', crown: 'text-amber-600' }
                    ][idx];

                    return (
                      <div
                        key={winner.id}
                        className={`p-5 rounded-2xl bg-white dark:bg-[#181B28] border ${badgeStyles.border} shadow-sm space-y-3 relative overflow-hidden`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeStyles.bg}`}>
                            {badgeStyles.title}
                          </span>
                          <Trophy className={`w-5 h-5 ${badgeStyles.crown}`} />
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                            {winner.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-extrabold text-gray-900 dark:text-white truncate">
                              {winner.name}
                            </h4>
                            <p className="text-[11px] text-gray-400">
                              Rank #{winner.rank}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 text-center">
                          <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#12141F]">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Final Average</p>
                            <p className="text-sm font-black text-violet-600 dark:text-violet-400">
                              {winner.finalAverageMarks} pts
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#12141F]">
                            <p className="text-[10px] uppercase font-bold text-gray-400">Grand Total</p>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {winner.grandTotalMarks} pts
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Master Leaderboard Table */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#181B28] shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151824] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Complete Participant Final Standing
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Evaluated marks, round averages, and grand totals.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                    {filteredParticipants.length} Participants
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 dark:bg-[#12141E] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-200/80 dark:border-gray-800">
                      <tr>
                        <th className="px-5 py-3.5 w-16">Rank</th>
                        <th className="px-5 py-3.5">Participant</th>
                        {roundsConfig.map(r => (
                          <th key={r.roundNumber} className="px-4 py-3.5 text-center">
                            Round {r.roundNumber} Avg
                          </th>
                        ))}
                        <th className="px-5 py-3.5 text-center">Grand Total</th>
                        <th className="px-5 py-3.5 text-center">Final Average</th>
                        <th className="px-5 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-gray-700 dark:text-gray-300">
                      {filteredParticipants.length === 0 ? (
                        <tr>
                          <td colSpan={roundsConfig.length + 5} className="py-10 text-center text-gray-400">
                            No participants matched your search.
                          </td>
                        </tr>
                      ) : (
                        filteredParticipants.map((p) => {
                          const isTop = p.rank <= 3 && p.totalEvaluationsCount > 0;
                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40 ${
                                p.rank === 1 && p.totalEvaluationsCount > 0 ? 'bg-amber-500/5' : ''
                              }`}
                            >
                              <td className="px-5 py-4 font-black">
                                {p.rank === 1 && p.totalEvaluationsCount > 0 ? (
                                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs shadow-xs">
                                    🥇
                                  </span>
                                ) : p.rank === 2 && p.totalEvaluationsCount > 0 ? (
                                  <span className="w-6 h-6 rounded-lg bg-slate-400 text-white flex items-center justify-center text-xs shadow-xs">
                                    🥈
                                  </span>
                                ) : p.rank === 3 && p.totalEvaluationsCount > 0 ? (
                                  <span className="w-6 h-6 rounded-lg bg-amber-700 text-white flex items-center justify-center text-xs shadow-xs">
                                    🥉
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-bold">#{p.rank}</span>
                                )}
                              </td>
                              <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 font-black text-xs flex items-center justify-center">
                                    {p.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold">{p.name}</p>
                                    <p className="text-[10px] text-gray-400">{p.totalEvaluationsCount} evaluations</p>
                                  </div>
                                </div>
                              </td>

                              {/* Round averages */}
                              {roundsConfig.map(r => {
                                const rd = p.roundDetails[r.roundNumber];
                                const hasScore = rd && rd.evaluatorCount > 0;
                                return (
                                  <td key={r.roundNumber} className="px-4 py-4 text-center">
                                    {hasScore ? (
                                      <div>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                          {rd.averageScore.toFixed(1)} pts
                                        </span>
                                        <p className="text-[10px] text-gray-400">
                                          (Total: {rd.totalScore})
                                        </p>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-[11px]">—</span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Grand Total */}
                              <td className="px-5 py-4 text-center font-extrabold text-emerald-600 dark:text-emerald-400">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                  {p.grandTotalMarks} pts
                                </span>
                              </td>

                              {/* Final Average */}
                              <td className="px-5 py-4 text-center">
                                <span className="font-black text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 rounded-lg shadow-xs">
                                  {p.finalAverageMarks} pts
                                </span>
                              </td>

                              {/* Performance Status */}
                              <td className="px-5 py-4 text-right">
                                {p.totalEvaluationsCount === 0 ? (
                                  <span className="text-[10px] text-gray-400">Pending</span>
                                ) : isTop ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Top Performer
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                                    Completed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 2: DETAILED EVALUATOR BREAKDOWN BY ROUND
             =================================================================== */}
          {activeTab === 'breakdown' && (
            <div className="space-y-6">
              {/* Round Selector Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setRoundFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    roundFilter === 'all'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white dark:bg-[#181B28] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  All Rounds
                </button>
                {roundsConfig.map(r => (
                  <button
                    key={r.roundNumber}
                    type="button"
                    onClick={() => setRoundFilter(r.roundNumber.toString())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      roundFilter === r.roundNumber.toString()
                        ? 'bg-violet-600 text-white'
                        : 'bg-white dark:bg-[#181B28] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Round {r.roundNumber}: {r.task || `Task ${r.roundNumber}`}
                  </button>
                ))}
              </div>

              {/* Cards for each participant with evaluator score chips */}
              <div className="space-y-4">
                {filteredParticipants.map(p => {
                  const displayRounds = roundsConfig.filter(r =>
                    roundFilter === 'all' || roundFilter === r.roundNumber.toString()
                  );

                  return (
                    <div
                      key={p.id}
                      className="p-5 rounded-2xl bg-white dark:bg-[#181B28] border border-gray-200 dark:border-gray-800 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs flex items-center justify-center">
                            #{p.rank}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {p.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400">Grand Total:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {p.grandTotalMarks} pts
                          </span>
                          <span className="text-gray-300 dark:text-gray-700">|</span>
                          <span className="text-gray-400">Overall Avg:</span>
                          <span className="font-black text-violet-600 dark:text-violet-400">
                            {p.finalAverageMarks} pts
                          </span>
                        </div>
                      </div>

                      {/* Rounds breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayRounds.map(r => {
                          const rd = p.roundDetails[r.roundNumber];
                          const entries = rd?.entries || [];

                          return (
                            <div
                              key={r.roundNumber}
                              className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#12141F] border border-gray-100 dark:border-gray-800/60 space-y-3"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-800 dark:text-gray-200">
                                  Round {r.roundNumber}: {r.task || 'Task'}
                                </span>
                                {entries.length > 0 && (
                                  <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                                    Round Avg: {rd.averageScore.toFixed(1)} pts
                                  </span>
                                )}
                              </div>

                              {entries.length === 0 ? (
                                <p className="text-[11px] text-gray-400 italic">No ratings logged for this round.</p>
                              ) : (
                                <div className="space-y-2">
                                  {entries.map((sc, scIdx) => (
                                    <div
                                      key={sc.id || scIdx}
                                      className="p-2.5 rounded-lg bg-white dark:bg-[#181B28] border border-gray-200/60 dark:border-gray-800 flex items-center justify-between text-xs"
                                    >
                                      <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
                                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>{sc.evaluator}</span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500 text-[11px]">
                                          Base: <strong className="text-gray-800 dark:text-gray-200">{sc.score}</strong>
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                          +{sc.grace}
                                        </span>
                                        <span className="font-black text-xs text-white bg-violet-600 px-2 py-0.5 rounded shadow-2xs">
                                          {sc.totalScore} pts
                                        </span>
                                      </div>
                                    </div>
                                  ))}

                                  <div className="pt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold border-t border-gray-200/40 dark:border-gray-800/60">
                                    <span>Round Total ({entries.length} evaluator{entries.length === 1 ? '' : 's'}):</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{rd.totalScore} pts</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 3: ALL AUDIT LOG ENTRIES
             =================================================================== */}
          {activeTab === 'audit' && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#181B28] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 dark:bg-[#12141E] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-200/80 dark:border-gray-800">
                    <tr>
                      <th className="px-5 py-3.5">Participant</th>
                      <th className="px-5 py-3.5">Round</th>
                      <th className="px-5 py-3.5">Evaluator</th>
                      <th className="px-5 py-3.5 text-center">Base Score</th>
                      <th className="px-5 py-3.5 text-center">Grace Marks</th>
                      <th className="px-5 py-3.5 text-center">Total Marks</th>
                      <th className="px-5 py-3.5 text-right">Recorded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                    {scores.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-gray-400">
                          No scores have been submitted yet.
                        </td>
                      </tr>
                    ) : (
                      scores.map((sc, idx) => {
                        const base = Number(sc.score) || 0;
                        const grace = Number(
                          sc.grace !== undefined
                            ? sc.grace
                            : (sc.grade && !isNaN(Number(sc.grade)) ? sc.grade : 0)
                        );
                        const total = sc.totalScore !== undefined ? Number(sc.totalScore) : (base + grace);

                        return (
                          <tr key={sc.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                              {sc.studentName}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                                Round {sc.roundNumber}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-medium">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{sc.evaluator}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-center font-bold text-gray-800 dark:text-gray-200">
                              {base} pts
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                +{grace}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="font-black text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 rounded-lg shadow-xs">
                                {total} pts
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right text-gray-400">
                              {sc.createdAt ? new Date(sc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            FOOTER ACTIONS
           ===================================================================== */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#11131D] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 print:hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Official immutable evaluation report generated for {eventName}.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Workbook</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

