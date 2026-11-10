import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Edit2, Users, ArrowRightLeft, X, ChevronDown } from 'lucide-react';

function MoveMemberDropdown({ memberId, currentGroupId, allGroups, onMoveMember }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const targetGroups = allGroups.filter(g => g.id !== currentGroupId);
  if (targetGroups.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-[#1E2235] hover:bg-gray-100 dark:hover:bg-[#282D44] border border-gray-200 dark:border-gray-700/80 transition-all cursor-pointer shadow-xs"
        title="Move to another team"
      >
        <span>Move</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-[#635BFF]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 max-h-52 overflow-y-auto rounded-xl bg-white dark:bg-[#1A1D2D] border border-gray-200 dark:border-gray-800 shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800/80 mb-1">
            Move to team
          </div>
          <div className="space-y-0.5">
            {targetGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveMember(memberId, currentGroupId, g.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-violet-50 dark:hover:bg-violet-950/60 hover:text-[#635BFF] dark:hover:text-violet-300 transition-colors text-left cursor-pointer"
              >
                <span className="truncate">{g.name}</span>
                <ArrowRightLeft className="w-3 h-3 text-violet-400 opacity-70 shrink-0 ml-1.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isEditingTitle ? (
              <form onSubmit={handleTitleSubmit} className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  type="text"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setTitle(group.name);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="w-full max-w-[150px] px-2.5 py-1 rounded-lg border-2 border-[#635BFF] bg-white dark:bg-[#12141D] text-xs font-bold text-gray-900 dark:text-white focus:outline-none shadow-xs"
                />
              </form>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h4
                  onClick={() => setIsEditingTitle(true)}
                  className="font-extrabold text-sm text-gray-900 dark:text-white truncate cursor-pointer hover:text-[#635BFF] transition-colors"
                  title="Click to rename team"
                >
                  {group.name}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                  title="Rename team"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0 leading-none">
              {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#635BFF] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
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

              {/* Stylish Move to another group dropdown */}
              {allGroups.length > 1 && (
                <MoveMemberDropdown
                  memberId={member.id}
                  currentGroupId={group.id}
                  allGroups={allGroups}
                  onMoveMember={onMoveMember}
                />
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
