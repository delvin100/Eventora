import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout & Pages
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardOverview from './pages/DashboardOverview';
import EventsListPage from './pages/EventsListPage';
import NewEventPage from './pages/NewEventPage';
import EventWorkspace from './pages/EventWorkspace';
import SavedListsPage from './pages/SavedListsPage';
import ResultsHistoryPage from './pages/ResultsHistoryPage';
import TemplatesPage from './pages/TemplatesPage';
import SpecialEventsPage from './pages/SpecialEventsPage';
import UsersManagementPage from './pages/UsersManagementPage';
import AdminAllEventsPage from './pages/AdminAllEventsPage';
import QuizDashboardPage from './pages/QuizDashboardPage';
import QuizHubPage from './pages/QuizHubPage';
import QuizWorkspacePage from './pages/QuizWorkspacePage';
import QuizPlayPage from './pages/QuizPlayPage';
import SettingsPage from './pages/SettingsPage';

// Prathibha Sangamam Special Event Portal
import PrathibhaSangamamIndex from './pages/ps/PrathibhaSangamamIndex';
import PrathibhaLoginPage from './pages/ps/PrathibhaLoginPage';

import EventParticipantsPage from './pages/EventParticipantsPage';

import WheelWorkspacePage from './pages/WheelWorkspacePage';
import TasksWorkspacePage from './pages/TasksWorkspacePage';
import ShuffleWorkspacePage from './pages/ShuffleWorkspacePage';
import GroupsWorkspacePage from './pages/GroupsWorkspacePage';
import SpecialEventSettingsPage from './pages/SpecialEventSettingsPage';

export default function App() {
  // Pre-warm backend API on initial landing to prevent Render cold starts
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && !apiUrl.includes('localhost')) {
      const healthUrl = apiUrl.endsWith('/health') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/health`;
      fetch(healthUrl).catch(() => {});
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Marketing & Auth */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Prathibha Sangamam Special Event Portal (/ps) */}
            <Route path="/ps" element={<PrathibhaSangamamIndex />} />
            <Route path="/ps/login" element={<PrathibhaLoginPage />} />

            {/* Authenticated Application Shell */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="events" element={<EventsListPage />} />
              <Route path="events/new" element={<NewEventPage />} />
              <Route path="quiz" element={<QuizDashboardPage />} />
              <Route path="quiz/:quizId" element={<QuizHubPage />} />
              <Route path="quiz/:quizId/questions" element={<QuizWorkspacePage />} />
              <Route path="quiz/:quizId/setup" element={<QuizWorkspacePage />} />
              <Route path="quiz/:quizId/play" element={<QuizPlayPage />} />
              <Route path="quiz/:quizId/wheel" element={<QuizPlayPage />} />
              
              {/* Event Workspace with tabs */}
              <Route path="events/:eventId" element={<EventWorkspace />}>
                <Route index element={<EventParticipantsPage />} />
                <Route path="wheel" element={<WheelWorkspacePage />} />
                <Route path="tasks" element={<TasksWorkspacePage />} />
                <Route path="shuffle" element={<ShuffleWorkspacePage />} />
                <Route path="groups" element={<GroupsWorkspacePage />} />
                <Route path="results" element={<ResultsHistoryPage />} />
                <Route path="settings" element={<SpecialEventSettingsPage />} />
              </Route>

              <Route path="lists" element={<SavedListsPage />} />
              <Route path="results" element={<ResultsHistoryPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="special-events" element={<SpecialEventsPage />} />
              <Route path="admin/events" element={<AdminAllEventsPage />} />
              <Route path="users" element={<UsersManagementPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
