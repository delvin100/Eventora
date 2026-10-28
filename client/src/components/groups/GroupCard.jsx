import React, { useState } from 'react';
import { Copy, Check, Edit2, Users, ArrowRightLeft, X } from 'lucide-react';

export default function GroupCard({
  group,
  allGroups = [],
  onRenameGroup,
  onMoveMember,
  onRemoveMember,
  colorIndex = 0
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(group.name);
  const [copied, setCopied] = useState(false);

  const colors = [
    'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 text-[#635BFF]',
    'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 text-emerald-600',
    'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 text-amber-600',
    'border-purple-200 dark:border-purple-900/60 bg-purple-50/20 text-purple-600',
    'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 text-rose-600',
    'border-blue-200 dark:border-blue-900/60 bg-blue-50/20 text-blue-600'
  ];

  const currentTheme = colors[colorIndex % colors.length];

  const handleTitleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onRenameGroup(group.id, title.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCopy = () => {
    const text = `${group.name}:\n` + group.members.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-[#161925] border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      
      {/* Group Card Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            {isEditingTitle ? (
              <form onSubmit={handleTitleSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  className="px-2 py-0.5 rounded border border-[#635BFF] text-xs font-bold text-gray-900 dark:text-white"
                />
              </form>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                  {group.name}
                </h4>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title="Rename team"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#635BFF] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Copy team roster"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="mt-3.5 space-y-2 max-h-72 overflow-y-auto pr-1">
          {group.members.map((member, idx) => (
            <div
              key={member.id}
              className="p-2.5 rounded-xl bg-gray-50/70 dark:bg-[#141722] border border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-white dark:bg-[#181B26] border border-gray-200 dark:border-gray-700 text-gray-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {member.name}
                  </p>
                  {(member.external_identifier || member.metadata?.department) && (
                    <p className="text-[10px] text-gray-400 truncate">
                      {member.external_identifier || member.metadata?.department}
                    </p>
                  )}
                </div>
              </div>

              {/* Move to another group selector */}
              {allGroups.length > 1 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onMoveMember(member.id, group.id, e.target.value);
                    }
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer border-0"
                  title="Move to another group"
                >
                  <option value="" disabled>Move ▾</option>
                  {allGroups.filter(g => g.id !== group.id).map(g => (
                    <option key={g.id} value={g.id}>To {g.name}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          {group.members.length === 0 && (
            <div className="py-6 text-center text-xs text-gray-400 italic">
              No members assigned
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
