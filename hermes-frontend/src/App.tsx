import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lightTheme, darkTheme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeModeContext';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Placeholder from './pages/Placeholder';
import Customers from './pages/Customers';
import EmailApp from './pages/EmailApp';
import Login from './pages/Login';
import Register from './pages/Register';
import Leads from './pages/Leads';
import EmailQueue from './pages/EmailQueue';
import SearchPage from './pages/Search';
import TasksPage from './pages/Tasks';
import UsersPage from './pages/Users';
import SettingsPage from './pages/Settings';
import AgentPanel from './pages/AgentPanel';
import { DialogProvider } from './components';
import './i18n';

/** Redirect to /login when no token */
const ProtectedRoute: React.FC = () => {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

/** Inner shell reads the mode context to pick the right styled-components theme */
const ThemedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useThemeMode();
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <GlobalStyles />
      <DialogProvider>
        {children}
      </DialogProvider>
    </ThemeProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeModeProvider>
        <ThemedApp>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  {/* MAIN */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/app-calendar" element={<Calendar />} />
                  <Route path="/app-calendar-tui" element={<Placeholder />} />
                  <Route path="/app-email" element={<EmailApp />} />
                  <Route path="/app-chat" element={<Placeholder />} />
                  <Route path="/app-campaigns" element={<Placeholder />} />
                  <Route path="/app-social" element={<Placeholder />} />
                  <Route path="/app-file-manager" element={<Placeholder />} />
                  <Route path="/app-todo" element={<Placeholder />} />
                  <Route path="/app-contacts" element={<Customers />} />
                  <Route path="/app-tasks" element={<Placeholder />} />
                  <Route path="/app-kanban" element={<Placeholder />} />
                  <Route path="/app-blog" element={<Placeholder />} />
                  <Route path="/account-settings" element={<Placeholder />} />
                  <Route path="/account-invoices" element={<Placeholder />} />
                  <Route path="/account-create-invoice" element={<Placeholder />} />
                  <Route path="/account-billing" element={<Placeholder />} />
                  <Route path="/transactions" element={<Placeholder />} />
                  <Route path="/portfolio" element={<Placeholder />} />
                  <Route path="/coin-details" element={<Placeholder />} />
                  <Route path="/market-capital" element={<Placeholder />} />
                  <Route path="/bank-accounts" element={<Placeholder />} />
                  {/* CMS */}
                  <Route path="/cms-leads" element={<Leads />} />
                  <Route path="/cms-search" element={<SearchPage />} />
                  <Route path="/cms-email-queue" element={<EmailQueue />} />
                  <Route path="/cms-tasks" element={<TasksPage />} />
                  <Route path="/cms-users" element={<UsersPage />} />
                  <Route path="/cms-agents" element={<AgentPanel />} />
                  <Route path="/cms-settings" element={<SettingsPage />} />
                  {/* RESOURCES */}
                  <Route path="/auth-404" element={<Placeholder />} />
                  <Route path="/auth-403" element={<Placeholder />} />
                  <Route path="/auth-500" element={<Placeholder />} />
                  <Route path="/auth-signin" element={<Placeholder />} />
                  <Route path="/auth-signup" element={<Placeholder />} />
                  <Route path="/auth-password-reset" element={<Placeholder />} />
                  <Route path="/auth-two-step" element={<Placeholder />} />
                  <Route path="/auth-lockscreen" element={<Placeholder />} />
                  <Route path="/auth-maintenance" element={<Placeholder />} />
                  <Route path="/docs" element={<Placeholder />} />
                  <Route path="/changelog" element={<Placeholder />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemedApp>
        </ThemeModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
