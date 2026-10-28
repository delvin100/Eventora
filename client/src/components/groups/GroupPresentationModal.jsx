import React from 'react';
import { X, Minimize2, Sparkles, Trophy } from 'lucide-react';
import EventoraLogo from '../EventoraLogo';

export default function GroupPresentationModal({ isOpen, onClose, groups = [], eventName = 'Event' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F8FC] dark:bg-[#0E1017] p-6 sm:p-10 flex flex-col justify-between overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <EventoraLogo size="md" />
          <div className="hidden sm:block border-l border-gray-200 dark:border-gray-800 pl-4">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">{eventName}</h2>
            <p className="text-xs text-gray-400">Classroom & Team Presentation View</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-3 rounded-2xl bg-white dark:bg-[#181B26] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 flex items-center gap-2 text-xs font-semibold shadow-sm cursor-pointer"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Exit Presentation</span>
        </button>
      </div>

      {/* Main Groups Grid */}
      <div className="py-8 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {groups.map((group, idx) => (
          <div
            key={group.id || idx}
            className="p-6 rounded-3xl bg-white dark:bg-[#161925] border-2 border-indigo-100 dark:border-indigo-950 shadow-md space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-black text-[#635BFF] dark:text-[#8881FF]">
                {group.name}
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF]">
                {group.members.length}
              </span>
            </div>

            <ol className="space-y-2.5">
              {group.members.map((member, i) => (
                <li
                  key={member.id || i}
                  className="flex items-center gap-3 text-sm font-semibold text-gray-800 dark:text-gray-100"
                >
                  <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate">{member.name}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 text-xs text-gray-400">
        Press Esc or click Exit Presentation to return to the workspace.
      </div>
    </div>
  );
}
