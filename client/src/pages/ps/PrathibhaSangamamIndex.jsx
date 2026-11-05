import React, { useState } from 'react';
import { prathibhaSangamamAuthService } from '../../services/prathibhaSangamamAuthService';
import PrathibhaDashboardPage from './PrathibhaDashboardPage';
import PrathibhaLoginPage from './PrathibhaLoginPage';

export default function PrathibhaSangamamIndex() {
  const [session, setSession] = useState(() => prathibhaSangamamAuthService.getCurrentSession());

  if (session) {
    return <PrathibhaDashboardPage session={session} onLogout={() => setSession(null)} />;
  }

  return <PrathibhaLoginPage onLoginSuccess={(user) => setSession(user)} />;
}

