import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { useToastStore } from './stores/toast.store';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ClientsPage from './pages/ClientsPage';
import SalesPage from './pages/SalesPage';
import NewSalePage from './pages/NewSalePage';
import QuotesPage from './pages/QuotesPage';
import NewQuotePage from './pages/NewQuotePage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CashboxPage from './pages/CashboxPage';
import ExpensesPage from './pages/ExpensesPage';
import GuidesPage from './pages/GuidesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function ToastManager() {
  const { toasts, removeToast } = useToastStore();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastManager />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/clients" element={<ClientsPage />} />
                      <Route path="/sales" element={<SalesPage />} />
                      <Route path="/sales/new" element={<NewSalePage />} />
                      <Route path="/quotes" element={<QuotesPage />} />
                      <Route path="/quotes/new" element={<NewQuotePage />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/cashbox" element={<CashboxPage />} />
                      <Route path="/expenses" element={<ExpensesPage />} />
                      <Route path="/guides" element={<GuidesPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
