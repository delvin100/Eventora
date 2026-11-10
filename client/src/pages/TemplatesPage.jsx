import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Trophy,
  Users,
  Presentation,
  Gift,
  ArrowRight,
  BookOpen,
  Heart,
  Award,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { participantService } from '../services/participantService';
import { eventService } from '../services/eventService';

const TEMPLATES = [
  {
    id: 'catechism-faith',
    title: 'Catechism & Faith Formation',
    desc: 'Pre-configured for Sunday school and Catechism classes. Pair students with Scripture readings, prayer leading, and faith trivia.',
    category: 'Catechism & Faith',
    icon: BookOpen,
    color: '#8B5CF6',
    starterNames: [
      'Gabriel', 'Michael', 'Raphael', 'Miriam',
      'Hannah', 'Samuel', 'David', 'Esther',
      'Ruth', 'Timothy', 'Lydia', 'Joseph',
      'Peter', 'Mary', 'John', 'Paul'
    ]
  },
  {
    id: 'kindness-missions',
    title: 'Acts of Kindness & Feel-Good Missions',
    desc: 'Empowering activities where students complete uplifting kindness challenges, compliments, and gratitude sharing.',
    category: 'Student Tasks & Challenges',
    icon: Heart,
    color: '#EC4899',
    starterNames: [
      'Emma', 'Lucas', 'Maya', 'Noah',
      'Ava', 'Leo', 'Sophia', 'Ethan',
      'Chloe', 'Daniel', 'Grace', 'Oliver'
    ]
  },
  {
    id: 'classroom-stars',
    title: 'Classroom Star Helpers & Duties',
    desc: 'Rotational helper duties that build responsibility: board captain, line leader, prayer leader, and supply distributor.',
    category: 'Classroom',
    icon: Award,
    color: '#F59E0B',
    starterNames: [
      'Liam', 'Olivia', 'Mason', 'Isabella',
      'William', 'Charlotte', 'Benjamin', 'Amelia',
      'Henry', 'Mia', 'Alexander', 'Evelyn'
    ]
  },
  {
    id: 'classroom',
    title: 'Classroom Random Selection',
    desc: 'Pre-configured for calling on students, fair turns, and project group creation.',
    category: 'Classroom',
    icon: GraduationCap,
    color: '#635BFF',
    starterNames: [
      'Emma Watson', 'Liam Davis', 'Sophia Chen', 'Noah Miller',
      'Olivia Jones', 'Ethan Taylor', 'Ava Patel', 'Lucas Garcia',
      'Isabella Rodriguez', 'Mason Brown', 'Mia Wilson', 'Alexander Lee',
      'Charlotte Harris', 'Benjamin Clark', 'Amelia Lewis', 'James Walker'
    ]
  },
  {
    id: 'team-standup',
    title: 'Agile Team Standup Order',
    desc: 'Shuffle daily speaker lists with repeat protection and quick timer view.',
    category: 'Team activity',
    icon: Presentation,
    color: '#3B82F6',
    starterNames: [
      'Alex (Frontend Lead)', 'Jordan (Backend Eng)', 'Taylor (Product Design)',
      'Sam (DevOps)', 'Riley (QA)', 'Morgan (Scrum Master)', 'Casey (Data Eng)'
    ]
  },
  {
    id: 'lucky-draw',
    title: 'Company Lucky Draw & Raffle',
    desc: 'Visual wheel with celebratory animations, winner removal, and prize tier tracking.',
    category: 'Lucky draw',
    icon: Gift,
    color: '#159A72',
    starterNames: [
      'Ticket #1001 - John Doe', 'Ticket #1002 - Jane Smith', 'Ticket #1003 - Mike Ross',
      'Ticket #1004 - Rachel Zane', 'Ticket #1005 - Harvey Specter', 'Ticket #1006 - Donna Paulsen',
      'Ticket #1007 - Louis Litt', 'Ticket #1008 - Jessica Pearson'
    ]
  },
  {
    id: 'tournament',
    title: 'Tournament Bracket Seeding',
    desc: 'Randomize matchup orders and divide competitors into balanced brackets.',
    category: 'Tournament',
    icon: Trophy,
    color: '#F59E0B',
    starterNames: [
      'Player 1 (Apex)', 'Player 2 (Vortex)', 'Player 3 (Titan)', 'Player 4 (Spectre)',
      'Player 5 (Nova)', 'Player 6 (Echo)', 'Player 7 (Rogue)', 'Player 8 (Blaze)'
    ]
  }
];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');

  const handleUseTemplate = async (tpl) => {
    try {
      setErrorMsg('');
      // 1. Create live event in Supabase
      const createdEvent = await eventService.createEvent({
        name: tpl.title,
        description: tpl.desc,
        category: tpl.category,
        accent_color: tpl.color
      });

      // 2. Pre-seed participants in Supabase
      const participants = tpl.starterNames.map((name, i) => ({
        name,
        external_identifier: `TPL-${100 + i}`,
        metadata: { template: tpl.category }
      }));
      await participantService.bulkAddParticipants(createdEvent.id, participants);

      navigate(`/home/events/${createdEvent.id}`);
    } catch (e) {
      console.error('Failed to preseed template in Supabase:', e);
      setErrorMsg('Error creating event from template. Please check your connection and login status.');
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Event Templates</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Kickstart an event with pre-configured settings, sample participants, and customized wheel aesthetics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TEMPLATES.map(tpl => {
          const Icon = tpl.icon;
          return (
            <div
              key={tpl.id}
              className="p-6 rounded-3xl bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between gap-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
            >
              <div className="space-y-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: tpl.color }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{tpl.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tpl.desc}</p>
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-gray-400">
                    Includes {tpl.starterNames.length} themed starter participants
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleUseTemplate(tpl)}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-[#635BFF] hover:text-white text-[#635BFF] dark:text-[#8881FF] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Launch Template Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
