import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { CrmLayout } from './components/crm/CrmLayout';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { HomePage } from './pages/HomePage';
import { CallsPage } from './pages/CallsPage';
import { CallDetailPage } from './pages/CallDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { DealerEntryPage } from './pages/DealerEntryPage';
import { HangupsPage } from './pages/HangupsPage';
import { CallbackRequestsPage } from './pages/CallbackRequestsPage';
import { SalesLeadsPage } from './pages/SalesLeadsPage';
import { ServiceAppointmentsPage } from './pages/ServiceAppointmentsPage';
import { PartsRequestsPage } from './pages/PartsRequestsPage';
import { DealershipInfoPage } from './pages/DealershipInfoPage';
import { AiUsageMetricsPage } from './pages/AiUsageMetricsPage';
import { ReportsPage } from './pages/ReportsPage';
import { InboxPage } from './pages/InboxPage';
import { TransfersPage } from './pages/TransfersPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardHome } from './pages/admin/AdminDashboardHome';
import { AdminDealersListPage } from './pages/admin/AdminDealersListPage';
import { AdminAddDealerPage } from './pages/admin/AdminAddDealerPage';
import { AdminDealerDetailPage } from './pages/admin/AdminDealerDetailPage';
import { AdminAddDepartmentPage } from './pages/admin/AdminAddDepartmentPage';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
        <Route path="/" element={<DealerEntryPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            window.sessionStorage.getItem('admin_authenticated') === 'true' ? (
              <AdminLayout />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        >
          <Route index element={<AdminDashboardHome />} />
          <Route path="dealers" element={<AdminDealersListPage />} />
          <Route path="dealers/new" element={<AdminAddDealerPage />} />
          <Route path="dealers/:dealerId" element={<AdminDealerDetailPage />} />
          <Route path="dealers/:dealerId/departments/new" element={<AdminAddDepartmentPage />} />
        </Route>
        <Route path="/crm" element={<CrmLayout />}>
          <Route index element={<HomePage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="calls" element={<CallsPage />} />
          <Route path="calls/:callId" element={<CallDetailPage />} />
          <Route path="callback-requests" element={<CallbackRequestsPage />} />
          <Route path="service-appointments" element={<ServiceAppointmentsPage />} />
          <Route path="sales-leads" element={<SalesLeadsPage />} />
          <Route path="parts-requests" element={<PartsRequestsPage />} />
          <Route
            path="transfers"
            element={<TransfersPage />}
          />
          <Route path="dealership" element={<DealershipInfoPage />} />
          <Route path="ai-metrics" element={<AiUsageMetricsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="hangups" element={<HangupsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
