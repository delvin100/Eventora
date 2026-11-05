import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ListOrdered,
  History,
  FileBox,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  HelpCircle,
  Sparkles,
  Zap,
  Crown,
  Users
} from 'lucide-react';
import EventoraLogo from '../EventoraLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { specialEventService } from '../../services/specialEventService';

export default function AppLayout() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasSpecialEventAccess, setHasSpecialEventAccess] = useState(false);

  // Check if current user is admin
  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';

  // Check if user has access to any special event
  useEffect(() => {
    let isMounted = true;
    if (authLoading) return;

    if (isAdmin) {
      setHasSpecialEventAccess(true);
      return;
    }
    if (user?.id || user?.email) {
      specialEventService.getSpecialEvents(user).then((events) => {
        if (isMounted) {
          setHasSpecialEventAccess(Array.isArray(events) && events.length > 0);
        }
      }).catch(() => {});
    } else {
      setHasSpecialEventAccess(false);
    }
    return () => { isMounted = false; };
  }, [user?.id, user?.email, isAdmin, authLoading]);

  const navItems = [
    { name: 'Overview', to: '/app', icon: LayoutDashboard, exact: true },
    { name: 'My Events', to: '/app/events', icon: CalendarDays },
    { name: 'All Lists', to: '/app/lists', icon: ListOrdered },
    { name: 'Recent Results', to: '/app/results', icon: History },
    { name: 'Templates', to: '/app/templates', icon: FileBox },
    ...((isAdmin || hasSpecialEventAccess) ? [{ name: 'Special Events', to: '/app/special-events', icon: Crown, isSpecial: true }] : []),
    ...(isAdmin ? [{ name: 'Users', to: '/app/users', icon: Users }] : []),
    { name: 'Settings', to: '/app/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Organizer';

  // Check if currently viewing a Special Event (URL, state, or session cache)
  const isSpecialEventPath = (() => {
    if (location.pathname.startsWith('/app/special-events')) return true;
    if (location.state?.fromSpecialEvents) return true;
    if (location.pathname.includes('prathibha-sangamam') || location.pathname.includes('cd396f58-15bc-4c68-bb44-70e0f9d86a9c')) return true;
    try {
      const known = JSON.parse(sessionStorage.getItem('eventora_special_event_ids') || '[]');
      return known.some(k => k && location.pathname.includes(k));
    } catch (_) {
      return false;
    }
  })();

  const getIsNavItemActive = (item) => {
    if (isSpecialEventPath) {
      if (item.to === '/app/special-events') return true;
      if (item.to === '/app/events') return false;
      return item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
    }
    return item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] text-[#171923] dark:text-[#F3F4F8] flex">
      {/* =========================================================================
          DESKTOP SIDEBAR
         ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col sticky top-0 h-screen self-start shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151823] transition-all duration-300 z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top: Logo & Collapse button */}
        <div className="h-18 px-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 shrink-0">
          <Link to="/app" className="flex items-center overflow-hidden">
            {sidebarCollapsed ? (
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#635BFF] text-white">
                <Sparkles className="w-5 h-5" />
              </div>
            ) : (
              <EventoraLogo size="sm" showTagline={false} />
            )}
          </Link>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary CTA: Create Event */}
        <div className="p-3 shrink-0">
          <Link
            to="/app/events/new"
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#635BFF] hover:bg-[#5145E5] text-white font-semibold text-sm shadow-md shadow-[#635BFF]/25 hover:shadow-lg transition-all ${
              sidebarCollapsed ? 'px-0' : ''
            }`}
            title="Create New Event"
          >
            <Plus className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span>New Event</span>}
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsNavItemActive(item);

            let activeClass = 'bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF] dark:text-[#8881FF] font-semibold';
            let inactiveClass = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100';

            if (item.isSpecial) {
              activeClass = 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-500/30 text-violet-700 dark:text-violet-300 font-bold';
              inactiveClass = 'text-violet-700 dark:text-violet-300/90 hover:bg-violet-50/70 dark:hover:bg-violet-950/40 hover:text-violet-800 dark:hover:text-violet-200 font-medium';
            }

            return (
              <NavLink
                key={item.name}
                to={item.to}
                state={item.isSpecial ? { fromSpecialEvents: true } : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? activeClass : inactiveClass
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? item.isSpecial
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-[#635BFF] dark:text-[#8881FF]'
                      : item.isSpecial
                      ? 'text-amber-500/80 dark:text-amber-400/80'
                      : 'text-gray-400'
                  }`}
                />
                {!sidebarCollapsed && (
                  <span>{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User profile card */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-50 dark:bg-[#191D2B]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#635BFF]/10 text-[#635BFF] font-bold text-xs flex items-center justify-center shrink-0 border border-[#635BFF]/20">
                {displayName.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {user?.email || 'Signed In'}
                  </p>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE TOPBAR & DRAWER
         ========================================================================= */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-[#151823] border-b border-gray-200 dark:border-gray-800 px-4 flex items-center justify-between z-40">
        <Link to="/app">
          <EventoraLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white dark:bg-[#151823] z-30 p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <Link
              to="/app/events/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#635BFF] text-white font-semibold text-sm shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Event</span>
            </Link>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = getIsNavItemActive(item);

                let mobileClass = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
                if (isActive) {
                  mobileClass = item.isSpecial
                    ? 'text-violet-700 dark:text-violet-300 bg-violet-100/70 dark:bg-violet-950/60 font-bold border border-violet-500/30'
                    : 'bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF] dark:text-[#8881FF] font-semibold';
                } else if (item.isSpecial) {
                  mobileClass = 'text-violet-700 dark:text-violet-300/90 hover:bg-violet-50/70 dark:hover:bg-violet-950/40 font-medium';
                }

                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    state={item.isSpecial ? { fromSpecialEvents: true } : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-base transition-all ${mobileClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${item.isSpecial ? 'text-amber-500' : isActive ? 'text-[#635BFF] dark:text-[#8881FF]' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-sm">{displayName}</p>
                <p className="text-xs text-gray-400">{user?.email || 'Signed In'}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN APPLICATION CONTENT AREA
         ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 md:pt-0 pt-16">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
