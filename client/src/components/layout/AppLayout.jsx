import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ListOrdered,
  PanelLeft,
  LogOut,
  Menu,
  X,
  HelpCircle,
  Zap,
  Crown,
  Users,
  Globe
} from 'lucide-react';
import EventoraLogo from '../EventoraLogo';
import { useAuth } from '../../context/AuthContext';
import SpecialEventsComingSoonModal from '../common/SpecialEventsComingSoonModal';

export default function AppLayout() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSpecialEventsModalOpen, setIsSpecialEventsModalOpen] = useState(false);

  // Check if current user is admin
  const isAdmin = user?.email === 'admin@gmail.com' || user?.user_metadata?.role === 'admin';

  const navItems = [
    { name: 'Overview', to: '/home', icon: LayoutDashboard, exact: true },
    { name: 'Events', to: '/home/events', icon: CalendarDays },
    { name: 'Special Events', to: '/home/special-events', icon: Crown },
    { name: 'Quiz', to: '/home/quiz', icon: HelpCircle },
    { name: 'Lists', to: '/home/lists', icon: ListOrdered },
    ...(isAdmin ? [{ name: 'Users', to: '/home/users', icon: Users }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Organizer';

  // Check if currently viewing a Special Event (URL, state, or session cache)
  const isSpecialEventPath = (() => {
    if (location.pathname.startsWith('/home/special-events')) return true;
    if (location.state?.fromSpecialEvents) return true;
    if (location.pathname.includes('prathibha-sangamam') || location.pathname.includes('cd396f58-15bc-4c68-bb44-70e0f9d86a9c')) return true;
    try {
      const known = JSON.parse(sessionStorage.getItem('eventora_special_event_ids') || '[]');
      return known.some(k => k && location.pathname.includes(k));
    } catch (_) {
      return false;
    }
  })();

  // Synchronize admin quiz navigation session tracking
  useEffect(() => {
    if (location.pathname === '/home/quiz') {
      try {
        sessionStorage.removeItem('eventora_admin_quiz_active');
      } catch (_) {}
    } else if (location.pathname.startsWith('/home/admin/quizzes') || location.state?.fromAdminAllQuizzes) {
      try {
        sessionStorage.setItem('eventora_admin_quiz_active', 'true');
      } catch (_) {}
    }
  }, [location.pathname, location.state]);

  const isAdminQuizPath = (() => {
    if (!isAdmin) return false;
    if (location.pathname.startsWith('/home/admin/quizzes')) return true;
    if (location.state?.fromAdminAllQuizzes) return true;
    if (location.pathname.startsWith('/home/quiz') && location.pathname !== '/home/quiz') {
      try {
        return sessionStorage.getItem('eventora_admin_quiz_active') === 'true';
      } catch (_) {
        return false;
      }
    }
    return false;
  })();

  const getIsNavItemActive = (item) => {
    if (isSpecialEventPath) {
      if (item.to === '/home/special-events') return true;
      if (item.to === '/home/events') return false;
      return item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
    }
    if (isAdminQuizPath) {
      if (item.to === '/home/admin/quizzes') return true;
      if (item.to === '/home/quiz') return false;
      return item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
    }
    return item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
  };

  return (
    <div
      style={{ '--sidebar-width': sidebarCollapsed ? '5rem' : '16rem' }}
      className="min-h-screen bg-[#F7F8FC] dark:bg-[#0F1117] text-[#171923] dark:text-[#F3F4F8] flex"
    >
      {/* =========================================================================
          DESKTOP SIDEBAR
         ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col sticky top-0 h-screen self-start shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151823] transition-all duration-300 z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top: Logo & Toggle sidebar button */}
        <div className={`h-16 flex items-center border-b border-gray-100 dark:border-gray-800/80 shrink-0 ${
          sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}>
          {!sidebarCollapsed && (
            <Link to="/home" className="flex items-center overflow-hidden">
              <EventoraLogo size="sm" showTagline={false} />
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className={`flex-1 space-y-1 overflow-y-auto min-h-0 ${
          sidebarCollapsed ? 'px-2 py-3 flex flex-col items-center' : 'px-3 py-3'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsNavItemActive(item);

            const activeClass = 'bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF] dark:text-[#8881FF] font-semibold';
            const inactiveClass = 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100 font-medium';

            return (
              <NavLink
                key={item.name}
                to={item.to}
                state={item.to === '/home/special-events' ? { fromSpecialEvents: true } : undefined}
                onClick={(e) => {
                  if (item.name === 'Special Events') {
                    e.preventDefault();
                    setIsSpecialEventsModalOpen(true);
                    return;
                  }
                  if (item.to === '/home/quiz') {
                    try { sessionStorage.removeItem('eventora_admin_quiz_active'); } catch (_) {}
                  } else if (item.to === '/home/admin/quizzes') {
                    try { sessionStorage.setItem('eventora_admin_quiz_active', 'true'); } catch (_) {}
                  }
                }}
                className={`flex items-center rounded-xl text-sm transition-all ${
                  sidebarCollapsed
                    ? 'w-11 h-11 justify-center'
                    : 'gap-3 px-3 py-2.5 w-full'
                } ${isActive ? activeClass : inactiveClass}`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? 'text-[#635BFF] dark:text-[#8881FF]'
                      : 'text-gray-400'
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User profile card */}
        <div className={`border-t border-gray-100 dark:border-gray-800 shrink-0 ${
          sidebarCollapsed ? 'p-2 flex justify-center' : 'p-3'
        }`}>
          <div className={`flex items-center rounded-xl bg-gray-50 dark:bg-[#191D2B] ${
            sidebarCollapsed
              ? 'w-11 h-11 justify-center p-0'
              : 'justify-between gap-2 p-2 w-full'
          }`}>
            <div className={`flex items-center min-w-0 ${sidebarCollapsed ? 'justify-center' : 'gap-2.5 flex-1'}`}>
              <div
                className="w-8 h-8 rounded-full bg-[#635BFF]/10 text-[#635BFF] font-bold text-xs flex items-center justify-center shrink-0 border border-[#635BFF]/20"
                title={sidebarCollapsed ? `${displayName} (${user?.email || profile?.usage_type || 'User'})` : undefined}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {user?.email || profile?.usage_type || 'User'}
                  </p>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
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
        <Link to="/home">
          <EventoraLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
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
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = getIsNavItemActive(item);

                const mobileClass = isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-[#635BFF] dark:text-[#8881FF] font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium';

                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    state={item.to === '/home/special-events' ? { fromSpecialEvents: true } : undefined}
                    onClick={(e) => {
                      if (item.name === 'Special Events') {
                        e.preventDefault();
                        setMobileMenuOpen(false);
                        setIsSpecialEventsModalOpen(true);
                        return;
                      }
                      if (item.to === '/home/quiz') {
                        try { sessionStorage.removeItem('eventora_admin_quiz_active'); } catch (_) {}
                      } else if (item.to === '/home/admin/quizzes') {
                        try { sessionStorage.setItem('eventora_admin_quiz_active', 'true'); } catch (_) {}
                      }
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-base transition-all ${mobileClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-[#635BFF] dark:text-[#8881FF]' : 'text-gray-400'}`} />
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
                <p className="text-xs text-gray-400">{user?.email || profile?.usage_type || 'User'}</p>
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
      {/* Special Events Coming Soon Modal with full background blur */}
      <SpecialEventsComingSoonModal
        isOpen={isSpecialEventsModalOpen}
        onClose={() => setIsSpecialEventsModalOpen(false)}
      />
    </div>
  );
}
