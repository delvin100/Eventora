import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Award,
  Sparkles,
  BookOpen,
  Heart,
  Users,
  CheckCircle2,
  Plus,
  RefreshCw,
  Star,
  Zap,
  HelpCircle,
  Smile,
  ShieldCheck
} from 'lucide-react';
import WinnerDialog from '../components/wheel/WinnerDialog';
import { participantService } from '../services/participantService';
import { resultService } from '../services/resultService';
import { TASK_PACKS, ENCOURAGING_AFFIRMATIONS } from '../utils/taskBank';

export default function TasksWorkspacePage() {
  const { eventId: paramId } = useParams();
  const outletCtx = useOutletContext();
  const eventId = outletCtx?.eventId || outletCtx?.event?.id || paramId;

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active task pack & custom tasks
  const [activePackId, setActivePackId] = useState('catechism_faith');
  const [customTasks, setCustomTasks] = useState([]);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newCategory, setNewCategory] = useState('Catechism Q&A');

  // Spotlight Dialog State
  const [spotlightStudent, setSpotlightStudent] = useState(null);
  const [spotlightTask, setSpotlightTask] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Star & Participation tracker (session state)
  const [studentStars, setStudentStars] = useState({});

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await participantService.getParticipants(eventId);
        setParticipants(data);
      } catch (err) {
        console.error('Failed to load participants for tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  const activePack = TASK_PACKS.find(p => p.id === activePackId) || TASK_PACKS[0];
  const allCurrentTasks = [...activePack.tasks, ...customTasks.filter(t => t.packId === activePackId)];

  const handlePickRandomStudentAndTask = (presetTask = null) => {
    if (participants.length === 0) return;

    // Pick student
    const randomStudent = participants[Math.floor(Math.random() * participants.length)];
    // Pick task
    const taskToAssign = presetTask || allCurrentTasks[Math.floor(Math.random() * allCurrentTasks.length)];

    setSpotlightStudent(randomStudent);
    setSpotlightTask(taskToAssign);
    setIsDialogOpen(true);

    confetti({
      particleCount: 80,
      spread: 75,
      origin: { y: 0.5 },
      colors: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
    });

    // Award participation star
    setStudentStars(prev => ({
      ...prev,
      [randomStudent.id]: (prev[randomStudent.id] || 0) + 1
    }));

    // Log to Supabase results
    resultService.saveResult({
      event_id: eventId,
      result_name: `Task Spotlight: ${randomStudent.name} (${taskToAssign.title})`,
      operation_type: 'task',
      settings: { pack: activePack.name },
      result_snapshot: {
        student: randomStudent.name,
        student_id: randomStudent.id,
        task: taskToAssign
      }
    }).catch(err => {
      console.error('Failed to log task result to Supabase:', err);
    });
  };

  const handleDrawAnotherTask = () => {
    if (allCurrentTasks.length > 0) {
      const newTask = allCurrentTasks[Math.floor(Math.random() * allCurrentTasks.length)];
      setSpotlightTask(newTask);
    }
  };

  const handleAddCustomTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const task = {
      id: 'custom-' + Date.now(),
      packId: activePackId,
      title: newTitle.trim(),
      category: newCategory,
      instruction: newInstruction.trim() || newTitle.trim(),
      points: 15
    };

    setCustomTasks(prev => [task, ...prev]);
    setNewTitle('');
    setNewInstruction('');
    setShowAddCustomModal(false);
  };

  const handleAddStar = (studentId) => {
    setStudentStars(prev => ({
      ...prev,
      [studentId]: (prev[studentId] || 0) + 1
    }));
    confetti({
      particleCount: 25,
      spread: 40,
      origin: { y: 0.8 },
      colors: ['#F59E0B', '#FBBF24']
    });
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400">Loading tasks workspace...</div>
      ) : participants.length === 0 ? (
        <div className="py-20 px-4 text-center bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">No students in this event yet</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Add your students or group members in the Participants tab to begin assigning tasks and questions!
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
          
          {/* Header Action Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#635BFF]/90 via-[#7952E0] to-[#9333EA] text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Student Engagement & Faith Missions</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Engage Students & Assign Missions
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100 max-w-xl">
                Call on students fairly, give them meaningful questions, prayers, or duties, and celebrate their participation with encouraging affirmations.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => handlePickRandomStudentAndTask()}
                className="py-3.5 px-6 rounded-2xl bg-white text-[#635BFF] hover:bg-indigo-50 font-black text-sm shadow-lg shadow-black/10 flex items-center gap-2.5 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Pick Student + Task 🎯</span>
              </button>
            </div>
          </div>

          {/* Pack Selector & Custom Task CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {TASK_PACKS.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => setActivePackId(pack.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    activePackId === pack.id
                      ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/25'
                      : 'bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pack.id === 'catechism_faith' && <BookOpen className="w-3.5 h-3.5 text-purple-300" />}
                  {pack.id === 'acts_of_kindness' && <Heart className="w-3.5 h-3.5 text-pink-300" />}
                  {pack.id === 'classroom_helpers' && <Award className="w-3.5 h-3.5 text-amber-300" />}
                  {pack.id === 'quick_challenges' && <Zap className="w-3.5 h-3.5 text-emerald-300" />}
                  <span>{pack.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddCustomModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 hover:border-purple-300 text-[#635BFF] dark:text-[#8881FF] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Question / Task</span>
            </button>
          </div>

          {/* Grid Layout: Task Cards (Left) + Star / Participation Leaderboard (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Task Cards Deck */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{activePack.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {allCurrentTasks.length} Activities
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {activePack.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allCurrentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {task.category}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>+{task.points || 10} pts</span>
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#635BFF] transition-colors">
                        {task.title}
                      </h4>

                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {task.instruction}
                      </p>
                    </div>

                    <button
                      onClick={() => handlePickRandomStudentAndTask(task)}
                      className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-[#635BFF] text-purple-700 hover:text-white dark:bg-purple-950/40 dark:text-purple-300 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Assign to a Random Student</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Star / Feel-Good Tracker (Right) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
                      Participation Stars ⭐
                    </h4>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {participants.length} Students
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Tap <span className="font-bold text-amber-500">+1 Star</span> to encourage positive answers, good deeds, and active listening.
                </p>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {participants.map((student) => {
                    const stars = studentStars[student.id] || 0;
                    return (
                      <div
                        key={student.id}
                        className="p-3 rounded-xl bg-gray-50 dark:bg-[#12141D] border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {student.name}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold mt-0.5">
                            {stars > 0 ? (
                              <>
                                <span>{'⭐'.repeat(Math.min(stars, 5))}</span>
                                {stars > 5 && <span className="text-xs">+{stars - 5}</span>}
                                <span className="text-gray-400 text-[10px]">({stars} pts)</span>
                              </>
                            ) : (
                              <span className="text-gray-400 text-[10px]">Ready for spotlight</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddStar(student.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                          title="Reward star"
                        >
                          +1 ⭐
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Add Custom Task Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              Add Custom Question or Task
            </h3>

            <form onSubmit={handleAddCustomTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-semibold text-gray-900 dark:text-white"
                >
                  <option value="Catechism Q&A">Catechism Q&A</option>
                  <option value="Scripture Reading">Scripture Reading</option>
                  <option value="Prayer">Prayer</option>
                  <option value="Acts of Kindness">Acts of Kindness</option>
                  <option value="Classroom Helper">Classroom Helper</option>
                  <option value="Brain Break">Brain Break</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Task / Question Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read Today's Gospel verse"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-semibold text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Instructions / Details
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Turn to Luke 15 and read verse 11-14 aloud"
                  value={newInstruction}
                  onChange={(e) => setNewInstruction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#12141D] text-xs font-semibold text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-bold shadow-md shadow-[#635BFF]/25 cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spotlight & Task Reveal Dialog */}
      <WinnerDialog
        isOpen={isDialogOpen}
        winner={spotlightStudent}
        onClose={() => setIsDialogOpen(false)}
        onRemoveWinner={() => {}}
        onSpinAgain={() => handlePickRandomStudentAndTask()}
        canRemove={false}
        assignedTask={spotlightTask}
        onDrawAnotherTask={handleDrawAnotherTask}
      />
    </div>
  );
}

