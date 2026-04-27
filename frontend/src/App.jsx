import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { WizardProvider } from './context/WizardContext'
import ProtectedRoute from './routes/ProtectedRoute'

// Public
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Signup from './pages/public/Signup'
import StaffLogin from './pages/public/StaffLogin'

// Customer
import EventWizard from './pages/customer/EventWizard'
import PriceBreakdown from './pages/customer/PriceBreakdown'
import MeetingScheduler from './pages/customer/MeetingScheduler'
import Confirmation from './pages/customer/Confirmation'
import CustomerDashboard from './pages/customer/CustomerDashboard'

// Manager
import ManagerDashboard from './pages/manager/ManagerDashboard'
import BookingDetail from './pages/manager/BookingDetail'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import VenueManagement from './pages/admin/VenueManagement'
import ContentManagement from './pages/admin/ContentManagement'

// Shared
import NotFound from './pages/NotFound'

function WizardLayout() {
  return (
    <WizardProvider>
      <Outlet />
    </WizardProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/staff/login" element={<StaffLogin />} />

        {/* Customer (protected) */}
        <Route element={<ProtectedRoute role="customer" />}>
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/plan" element={<WizardLayout />}>
            <Route index element={<EventWizard />} />
            <Route path="summary" element={<PriceBreakdown />} />
            <Route path="schedule" element={<MeetingScheduler />} />
            <Route path="confirmation" element={<Confirmation />} />
          </Route>
        </Route>

        {/* Manager (protected) */}
        <Route element={<ProtectedRoute role="manager" />}>
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/booking/:id" element={<BookingDetail />} />
        </Route>

        {/* Admin (protected) */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/venues" element={<VenueManagement />} />
          <Route path="/admin/content" element={<ContentManagement />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App