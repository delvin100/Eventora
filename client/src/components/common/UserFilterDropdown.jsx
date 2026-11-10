import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, User, ChevronDown, Check, X, Search } from 'lucide-react';

export default function UserFilterDropdown({
  value = 'ALL',
  onChange,
  items = [],
  registeredUsers = [],
  currentUserId = null,
  itemLabel = 'items',
  allLabel = 'All Users'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setUserSearch('');
    }
  }, [isOpen]);

  // Compute users map and list with counts
  const usersWithCounts = useMemo(() => {
    const userMap = new Map();

    // 1. Seed with registered users if provided
    (registeredUsers || []).forEach(u => {
      if (!u.id) return;
      userMap.set(u.id, {
        id: u.id,
        displayName: u.displayName || u.email?.split('@')[0] || 'User',
        email: u.email || '',
        count: 0
      });
    });

    // 2. Count items per user & capture owners from items
    (items || []).forEach(item => {
      const ownerId = item.owner_id || item.owner?.id;
      if (!ownerId) return;

      if (!userMap.has(ownerId)) {
        const displayName = item.owner?.displayName || item.owner?.email?.split('@')[0] || 'Organizer';
        const email = item.owner?.email || '';
        userMap.set(ownerId, {
          id: ownerId,
          displayName,
          email,
          count: 0
        });
      }

      userMap.get(ownerId).count += 1;
    });

    // 3. Convert to sorted array: sort by count descending, then display name
    return Array.from(userMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [items, registeredUsers]);

  const totalItemsCount = items.length;
  const isAll = !value || value === 'ALL';
  const selectedUser = usersWithCounts.find(u => u.id === value);

  // Filter users inside dropdown by search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return usersWithCounts;
    const query = userSearch.toLowerCase().trim();
    return usersWithCounts.filter(u =>
      (u.displayName && u.displayName.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query))
    );
  }, [usersWithCounts, userSearch]);

  const handleSelect = (userId) => {
    onChange(userId);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('ALL');
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-[42px] px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#635BFF]/25 whitespace-nowrap min-w-[190px] sm:min-w-[210px] ${
            !isAll
              ? 'border-violet-400 dark:border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200'
              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161925] text-gray-700 dark:text-gray-300 hover:border-violet-500/50'
          }`}
          title={!isAll ? `Filtering by ${selectedUser?.displayName || 'User'}` : 'Filter by specific user'}
        >
          <div className="flex items-center gap-2 truncate">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              !isAll
                ? 'bg-violet-600 text-white dark:bg-violet-500'
                : 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300'
            }`}>
              {isAll ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
            </div>

            <span className="truncate max-w-[120px] sm:max-w-[150px]">
              {isAll ? allLabel : selectedUser?.displayName || 'User'}
            </span>

            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              !isAll
                ? 'bg-violet-200/80 dark:bg-violet-900/60 text-violet-900 dark:text-violet-200'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {isAll ? totalItemsCount : (selectedUser?.count ?? 0)}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isAll && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e); }}
                className="p-0.5 rounded-md text-violet-600 dark:text-violet-400 hover:bg-violet-200/70 dark:hover:bg-violet-900/60 transition-colors"
                title="Clear user filter"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-violet-500' : ''}`} />
          </div>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-80 overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-[#161925] border border-gray-200 dark:border-gray-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* User Search Input (if multiple users) */}
          {usersWithCounts.length > 3 && (
            <div className="p-1 pb-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users by name or email..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-64 space-y-0.5 pr-0.5">
            {/* "All Users" Option */}
            <button
              type="button"
              onClick={() => handleSelect('ALL')}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                isAll
                  ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold">{allLabel}</p>
                  <p className="text-[10px] text-gray-400">View all items across everyone</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {totalItemsCount}
                </span>
                {isAll && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
              </div>
            </button>

            <div className="my-1 border-t border-gray-100 dark:border-gray-800/80" />

            {/* Individual Users */}
            {filteredUsers.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400">
                No users match &ldquo;{userSearch}&rdquo;
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = value === u.id;
                const isCurrent = currentUserId && u.id === currentUserId;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelect(u.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {u.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-gray-900 dark:text-white flex items-center gap-1">
                          <span className="truncate">{u.displayName}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 font-semibold">
                              You
                            </span>
                          )}
                        </p>
                        {u.email && (
                          <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" title={`${u.count} ${u.count === 1 ? itemLabel.replace(/s$/, '') : itemLabel}`}>
                        {u.count}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

