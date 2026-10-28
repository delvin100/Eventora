import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Users, RotateCw, Trophy, Sparkles } from 'lucide-react';

import WheelCanvas from '../components/wheel/WheelCanvas';
import WheelControls from '../components/wheel/WheelControls';
import WinnerDialog from '../components/wheel/WinnerDialog';
import WheelHistoryDrawer from '../components/wheel/WheelHistoryDrawer';
import { playVictorySound } from '../components/wheel/audio/wheelAudio';
import { participantService } from '../services/participantService';
import { resultService } from '../services/resultService';
import { TASK_PACKS } from '../utils/taskBank';

export default function WheelWorkspacePage() {
  const { eventId } = useParams();
  const wheelRef = useRef(null);

  const [allParticipants, setAllParticipants] = useState([]);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Wheel configuration
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [celebrationEnabled, setCelebrationEnabled] = useState(true);
  const [removeWinnerOnDraw, setRemoveWinnerOnDraw] = useState(false);
  const [duration, setDuration] = useState(5);

  // Student Task Assignment mode
  const [assignTaskMode, setAssignTaskMode] = useState(false);
  const [selectedTaskPack, setSelectedTaskPack] = useState('catechism_faith');
  const [assignedTask, setAssignedTask] = useState(null);

  // Winner dialog & history
  const [currentWinner, setCurrentWinner] = useState(null);
  const [isWinnerDialogOpen, setIsWinnerDialogOpen] = useState(false);
  const [history, setHistory] = useState([]);

  // Load participants
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await participantService.getParticipants(eventId);
        setAllParticipants(data);
      } catch (err) {
        console.error('Failed to load participants for wheel:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  // Eligible participants (excluding temporary removals)
  const eligibleParticipants = allParticipants.filter(p => !removedIds.has(p.id));

  // Spin trigger
  const handleTriggerSpin = () => {
    if (wheelRef.current && eligibleParticipants.length > 0) {
      wheelRef.current.spin();
    }
  };

  const handleSpinStart = () => {
    setIsSpinning(true);
    setCurrentWinner(null);
  };

  const pickTaskFromPack = (packId) => {
    const pack = TASK_PACKS.find(p => p.id === packId) || TASK_PACKS[0];
    if (!pack || !pack.tasks || pack.tasks.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * pack.tasks.length);
    return pack.tasks[randomIndex];
  };

  const handleDrawAnotherTask = () => {
    const newTask = pickTaskFromPack(selectedTaskPack);
    setAssignedTask(newTask);
  };

  const handleSpinEnd = (winner) => {
    setIsSpinning(false);
    setCurrentWinner(winner);

    let currentTask = null;
    if (assignTaskMode) {
      currentTask = pickTaskFromPack(selectedTaskPack);
      setAssignedTask(currentTask);
    } else {
      setAssignedTask(null);
    }

    setIsWinnerDialogOpen(true);

    // Audio victory chime
    if (soundEnabled) {
      playVictorySound();
    }

    // Confetti explosion
    if (celebrationEnabled) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#635BFF', '#159A72', '#F59E0B', '#EC4899', '#3B82F6']
      });
    }

    // Save result to local history drawer
    const entry = {
      id: 'spin-' + Date.now(),
      winner,
      assignedTask: currentTask,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString()
    };
    const updated = [entry, ...history];
    setHistory(updated);

    // Save snapshot record directly into Supabase results table
    resultService.saveResult({
      event_id: eventId,
      result_name: currentTask ? `Task Spotlight: ${winner.name} (${currentTask.title})` : `Wheel Winner: ${winner.name}`,
      operation_type: 'wheel',
      settings: { duration, removeWinnerOnDraw, soundEnabled, assignTaskMode, selectedTaskPack },
      result_snapshot: {
        winner: winner.name,
        winner_id: winner.id,
        participant_count: eligibleParticipants.length,
        task: currentTask
      }
    }).catch(err => {
      console.error('Failed to log wheel result to Supabase:', err);
    });

    // Auto-remove if configured
    if (removeWinnerOnDraw) {
      setRemovedIds(prev => new Set([...prev, winner.id]));
    }
  };

  const handleRemoveWinner = (winner) => {
    setRemovedIds(prev => new Set([...prev, winner.id]));
  };

  const handleResetExclusions = () => {
    setRemovedIds(new Set());
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all recorded spin results for this session?')) {
      setHistory([]);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400">Loading wheel workspace...</div>
      ) : allParticipants.length === 0 ? (
        <div className="py-20 px-4 text-center bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">No participants in this event</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            The wheel needs at least one participant. Add names or import a spreadsheet to start spinning!
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Wheel Stage (Left / Main) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 sm:p-10 bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-sm relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-violet-500/5 to-transparent rounded-3xl pointer-events-none" />

            <WheelCanvas
              ref={wheelRef}
              participants={eligibleParticipants}
              duration={duration}
              soundEnabled={soundEnabled}
              onSpinStart={handleSpinStart}
              onSpinEnd={handleSpinEnd}
            />

            {/* Quick Status Subtitle */}
            <div className="mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
              {eligibleParticipants.length} of {allParticipants.length} participants eligible
            </div>
          </div>

          {/* Controls & History (Right Sidebar) */}
          <div className="lg:col-span-5 space-y-5">
            <WheelControls
              isSpinning={isSpinning}
              onSpin={handleTriggerSpin}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              celebrationEnabled={celebrationEnabled}
              onToggleCelebration={() => setCelebrationEnabled(!celebrationEnabled)}
              removeWinner={removeWinnerOnDraw}
              onToggleRemoveWinner={setRemoveWinnerOnDraw}
              duration={duration}
              onChangeDuration={setDuration}
              onResetParticipants={handleResetExclusions}
              removedCount={removedIds.size}
              eligibleCount={eligibleParticipants.length}
              assignTaskMode={assignTaskMode}
              onToggleAssignTaskMode={setAssignTaskMode}
              selectedTaskPack={selectedTaskPack}
              onSelectTaskPack={setSelectedTaskPack}
            />

            <WheelHistoryDrawer
              history={history}
              onClearHistory={handleClearHistory}
            />
          </div>

        </div>
      )}

      {/* Winner Reveal Modal */}
      <WinnerDialog
        isOpen={isWinnerDialogOpen}
        winner={currentWinner}
        onClose={() => setIsWinnerDialogOpen(false)}
        onRemoveWinner={handleRemoveWinner}
        onSpinAgain={handleTriggerSpin}
        canRemove={!removedIds.has(currentWinner?.id)}
        assignedTask={assignedTask}
        onDrawAnotherTask={handleDrawAnotherTask}
      />
    </div>
  );
}
