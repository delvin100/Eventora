import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Users, Shuffle, RotateCcw } from 'lucide-react';

import ShuffleToolbar from '../components/shuffle/ShuffleToolbar';
import ShuffleOrderList from '../components/shuffle/ShuffleOrderList';
import RandomPickDisplay from '../components/shuffle/RandomPickDisplay';
import { fisherYatesShuffle, pickRandomItems } from '../utils/shuffleUtils';
import { exportParticipantsToExcel } from '../utils/excelUtils';
import { participantService } from '../services/participantService';
import { resultService } from '../services/resultService';

export default function ShuffleWorkspacePage() {
  const { eventId: paramId } = useParams();
  const outletCtx = useOutletContext();
  const eventId = outletCtx?.eventId || outletCtx?.event?.id || paramId;

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shuffle state
  const [mode, setMode] = useState('order'); // 'order' or 'pick'
  const [pickCount, setPickCount] = useState(1);
  const [shuffledList, setShuffledList] = useState([]);
  const [pickedWinners, setPickedWinners] = useState([]);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await participantService.getParticipants(eventId);
        setParticipants(data);
      } catch (err) {
        console.error('Failed to load participants for shuffle:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  const handleExecute = () => {
    if (participants.length === 0) return;
    setIsShuffling(true);

    setTimeout(() => {
      if (mode === 'order') {
        const result = fisherYatesShuffle(participants);
        setShuffledList(result);
        setPickedWinners([]);

        // Save result snapshot
        logShuffleResult('Full List Shuffle', `${result.length} participants randomized`);
      } else {
        const winners = pickRandomItems(participants, pickCount);
        setPickedWinners(winners);

        // Confetti for pick mode
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });

        // Save result snapshot
        logShuffleResult(`Random Pick (${winners.length})`, winners.map(w => w.name).join(', '));
      }
      setIsShuffling(false);
    }, 400);
  };

  const logShuffleResult = (name, details) => {
    resultService.saveResult({
      event_id: eventId,
      result_name: name,
      operation_type: 'shuffle',
      settings: { mode, pickCount },
      result_snapshot: {
        summary: details,
        count: mode === 'order' ? participants.length : pickedWinners.length,
        items: mode === 'order' ? shuffledList.map(p => p.name) : pickedWinners.map(p => p.name)
      }
    }).catch(err => {
      console.error('Failed to log shuffle result to Supabase:', err);
    });
  };

  const handleReset = () => {
    setShuffledList([]);
    setPickedWinners([]);
  };

  const handleExport = () => {
    const listToExport = mode === 'order' && shuffledList.length > 0
      ? shuffledList
      : pickedWinners.length > 0
      ? pickedWinners
      : participants;

    exportParticipantsToExcel(listToExport, `Shuffled_${mode}`);
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400">Loading shuffle workspace...</div>
      ) : participants.length === 0 ? (
        <div className="py-20 px-4 text-center bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] flex items-center justify-center mx-auto">
            <Shuffle className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">No participants to shuffle</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Add participants or import an Excel spreadsheet before shuffling.
          </p>
          <div className="pt-2">
            <Link
              to={`/app/events/${eventId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25"
            >
              <Users className="w-4 h-4" />
              <span>Go to Participants Tab</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <ShuffleToolbar
            mode={mode}
            onModeChange={setMode}
            pickCount={pickCount}
            onPickCountChange={setPickCount}
            maxCount={participants.length}
            onExecute={handleExecute}
            onReset={handleReset}
            onExport={handleExport}
            hasResults={shuffledList.length > 0 || pickedWinners.length > 0}
            isShuffling={isShuffling}
          />

          {mode === 'pick' && pickedWinners.length > 0 && (
            <RandomPickDisplay winners={pickedWinners} />
          )}

          <ShuffleOrderList
            originalList={participants}
            shuffledList={shuffledList}
          />
        </div>
      )}
    </div>
  );
}
