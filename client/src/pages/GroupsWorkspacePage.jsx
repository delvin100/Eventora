import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { UsersRound, Users, Plus } from 'lucide-react';

import GroupConfigToolbar from '../components/groups/GroupConfigToolbar';
import GroupCard from '../components/groups/GroupCard';
import GroupPresentationModal from '../components/groups/GroupPresentationModal';
import { createGroupsByCount, createGroupsBySize, exportGroupsToExcel } from '../utils/groupUtils';
import { participantService } from '../services/participantService';
import { resultService } from '../services/resultService';

export default function GroupsWorkspacePage() {
  const { eventId: paramId } = useParams();
  const outletCtx = useOutletContext();
  const eventId = outletCtx?.eventId || outletCtx?.event?.id || paramId;

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Group config
  const [mode, setMode] = useState('count'); // 'count' or 'size'
  const [targetValue, setTargetValue] = useState(4);
  const [groups, setGroups] = useState([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await participantService.getParticipants(eventId);
        setParticipants(data);
      } catch (err) {
        console.error('Failed to load participants for groups:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  const handleGenerate = () => {
    if (participants.length === 0) return;
    setIsGenerating(true);

    setTimeout(() => {
      let result = [];
      if (mode === 'count') {
        result = createGroupsByCount(participants, targetValue, 'standard');
      } else {
        result = createGroupsBySize(participants, targetValue, 'standard');
      }

      setGroups(result);

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Save snapshot directly into Supabase results table
      resultService.saveResult({
        event_id: eventId,
        result_name: `Formed ${result.length} Balanced Teams`,
        operation_type: 'groups',
        settings: { mode, targetValue },
        result_snapshot: {
          summary: `${participants.length} participants divided into ${result.length} groups`,
          groups: result.map(g => ({
            name: g.name,
            count: g.members?.length || 0,
            members: (g.members || []).map(m => m.name)
          }))
        }
      }).catch(err => {
        console.error('Failed to log groups result to Supabase:', err);
      });

      setIsGenerating(false);
    }, 400);
  };

  const handleRenameGroup = (groupId, newName) => {
    const updated = groups.map(g => g.id === groupId ? { ...g, name: newName } : g);
    setGroups(updated);
  };

  const handleMoveMember = (memberId, fromGroupId, toGroupId) => {
    let movedMember = null;
    const nextGroups = groups.map(g => {
      if (g.id === fromGroupId) {
        const remaining = g.members.filter(m => {
          if (m.id === memberId) {
            movedMember = m;
            return false;
          }
          return true;
        });
        return { ...g, members: remaining };
      }
      return g;
    });

    if (movedMember) {
      const finalGroups = nextGroups.map(g => {
        if (g.id === toGroupId) {
          return { ...g, members: [...g.members, movedMember] };
        }
        return g;
      });
      setGroups(finalGroups);
    }
  };

  const handleExport = () => {
    exportGroupsToExcel(groups, 'Balanced_Teams');
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400">Loading groups workspace...</div>
      ) : participants.length === 0 ? (
        <div className="py-20 px-4 text-center bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] flex items-center justify-center mx-auto">
            <UsersRound className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">No participants to group</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Add participants or import an Excel spreadsheet before forming groups.
          </p>
          <div className="pt-2">
            <Link
              to={`/home/events/${eventId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white text-xs font-semibold shadow-md shadow-[#635BFF]/25"
            >
              <Users className="w-4 h-4" />
              <span>Go to Participants Tab</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <GroupConfigToolbar
            mode={mode}
            onModeChange={setMode}
            targetValue={targetValue}
            onTargetValueChange={setTargetValue}
            totalParticipants={participants.length}
            onGenerate={handleGenerate}
            onExport={handleExport}
            onOpenPresentation={() => setIsPresentationOpen(true)}
            hasGroups={groups.length > 0}
            isGenerating={isGenerating}
          />

          {groups.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl space-y-2">
              <UsersRound className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">No groups generated yet</h4>
              <p className="text-xs text-gray-400">
                Choose the number of groups or members per group above and click "Create Groups".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {groups.map((group, idx) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  allGroups={groups}
                  colorIndex={idx}
                  onRenameGroup={handleRenameGroup}
                  onMoveMember={handleMoveMember}
                />
              ))}
            </div>
          )}

          <GroupPresentationModal
            isOpen={isPresentationOpen}
            onClose={() => setIsPresentationOpen(false)}
            groups={groups}
            eventName="Team Groups"
          />
        </div>
      )}
    </div>
  );
}
