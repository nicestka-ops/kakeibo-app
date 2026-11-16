import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthGate } from '@/components/auth/AuthGate';
import { AppLayout } from '@/components/layout/AppLayout';

import { HomePage } from '@/pages/HomePage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { BudgetsPage } from '@/pages/BudgetsPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ForecastPage } from '@/pages/ForecastPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <AppProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <Routes>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="analytics/:tab" element={<AnalyticsPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="forecast" element={<ForecastPage />} />
                  <Route path="budgets" element={<BudgetsPage />} />
                  <Route path="goals" element={<GoalsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="settings/:section" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
