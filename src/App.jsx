import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './components/HomePage.jsx';
import ContactPage from './components/ContactPage.jsx';
import AppPageLayout from './components/AppPageLayout.jsx';

// --- דפים כלליים (מפרויקט "secound") ---
import {LoginPage} from './pages/LoginPage';
import {ForgotPasswordPage} from './pages/ForgotPasswordPage';
import {VolunteerRegisterPage} from './pages/VolunteerRegisterPage';
import {SupplierRegisterPage} from './pages/SupplierRegisterPage';
import {NgoRegisterPage as GeneralNgoRegisterPage} from './pages/NgoRegisterPage';
import {ProfilePage} from './pages/ProfilePage';
import {NotificationsPage} from './pages/NotificationsPage';
import {ContactSupportPage} from './pages/ContactSupportPage';

// --- מסכי מתנדב ---
import {VolunteerDashboard} from './pages/VolunteerDashboard';
import {WeeklyAvailabilityPage} from './pages/WeeklyAvailabilityPage';
import {IncomingRequestPage} from './pages/IncomingRequestPage';
import {ActiveRoutePage} from './pages/ActiveRoutePage';
import {CompleteDeliveryPage} from './pages/CompleteDeliveryPage';
import {AssignmentHistoryPage} from './pages/AssignmentHistoryPage';
import {VolunteerRatingsPage} from './pages/VolunteerRatingsPage';
import {CommentsSection} from './pages/CommentsSection';

// --- מסכי ארגון תורם (עסק) ---
import {CreateDonationPage} from './pages/CreateDonationPage';
import {OpenDonationsPage} from './pages/OpenDonationsPage';
import {SupplierDashboard} from './pages/SupplierDashboard';
import {DonationDetailsPage} from './pages/DonationDetailsPage';
import {SupplierHistoryPage} from './pages/SupplierHistoryPage';
import {SupplierCommentsPage} from './pages/SupplierCommentsPage';

// --- מסכי עמותה ---
import {NgoDashboard} from './pages/NgoDashboard';
import {NgoRegisterPage} from './pages/NgoRegisterPage';
import {NgoWorkingHoursPage} from './pages/NgoWorkingHoursPage';
import {IncomingDonationsPage} from './pages/IncomingDonationsPage';
import {ConfirmDonationReceiptPage} from './pages/ConfirmDonationReceiptPage';
import {NgoHistoryPage} from './pages/NgoHistoryPage';
import {NgoRatingsPage} from './pages/NgoRatingsPage';
import {NgoCommentsPage} from './pages/NgoCommentsPage';

// --- מסכי ניהול (Admin) ---
import {AdminDashboard} from './pages/AdminDashboard';
import {AdminUserApprovalsPage} from './pages/AdminUserApprovalsPage';
import {AdminUsersManagementPage} from './pages/AdminUsersManagementPage';
import {VolunteersPage} from './pages/VolunteersPage';
import {AdminDonationsManagementPage} from './pages/AdminDonationsManagementPage';
import {AdminMatchingEnginePage} from './pages/AdminMatchingEnginePage';
import {AdminRoutesManagementPage} from './pages/AdminRoutesManagementPage';
import {AdminNoShowPage} from './pages/AdminNoShowPage';
import {AdminReportsPage} from './pages/AdminReportsPage';
import {AdminCommentsManagementPage} from './pages/AdminCommentsManagementPage';
import {AdminSettingsPage} from './pages/AdminSettingsPage';

// --- מסכי מפה ומסלול ---
import {GeneralMapPage} from './pages/GeneralMapPage';
import {VrpRouteVisualizationPage} from './pages/VrpRouteVisualizationPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    {/* דף הבית (מפרויקט "first") */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/contact" element={<ContactPage />} />

                    <Route element={<AppPageLayout />}>
                    {/* כללי */}
                    <Route path="/app/login" element={<LoginPage />} />
                    <Route path="/app/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/app/register-volunteer" element={<VolunteerRegisterPage />} />
                    <Route path="/app/register-supplier" element={<SupplierRegisterPage />} />
                    <Route path="/app/register-ngo" element={<GeneralNgoRegisterPage />} />
                    <Route path="/app/profile" element={<ProfilePage />} />
                    <Route path="/app/notifications" element={<NotificationsPage />} />
                    <Route path="/app/support" element={<ContactSupportPage />} />

                    {/* מתנדב */}
                    <Route path="/app/volunteer/dashboard" element={<VolunteerDashboard />} />
                    <Route path="/app/volunteer/availability" element={<WeeklyAvailabilityPage />} />
                <Route path="/app/volunteer/incoming-request/:id?" element={<IncomingRequestPage />} />
                    <Route path="/app/volunteer/active-route" element={<ActiveRoutePage />} />
                    <Route path="/app/volunteer/complete-delivery" element={<CompleteDeliveryPage />} />
                    <Route path="/app/volunteer/history" element={<AssignmentHistoryPage />} />
                    <Route path="/app/volunteer/ratings" element={<VolunteerRatingsPage />} />
                    <Route path="/app/volunteer/comments" element={<CommentsSection />} />

                    {/* תורם */}
                    <Route path="/app/supplier/dashboard" element={<SupplierDashboard />} />
                    <Route path="/app/supplier/create-donation" element={<CreateDonationPage />} />
                    <Route path="/app/supplier/open-donations" element={<OpenDonationsPage />} />
                    <Route path="/app/supplier/donation-details" element={<DonationDetailsPage />} />
                    <Route path="/app/supplier/history" element={<SupplierHistoryPage />} />
                    <Route path="/app/supplier/comments" element={<SupplierCommentsPage />} />

                    {/* עמותה */}
                    <Route path="/app/ngo/dashboard" element={<NgoDashboard />} />
                    <Route path="/app/ngo/register" element={<NgoRegisterPage />} />
                    <Route path="/app/ngo/hours" element={<NgoWorkingHoursPage />} />
                    <Route path="/app/ngo/incoming" element={<IncomingDonationsPage />} />
                    <Route path="/app/ngo/confirm" element={<ConfirmDonationReceiptPage />} />
                    <Route path="/app/ngo/history" element={<NgoHistoryPage />} />
                    <Route path="/app/ngo/ratings/:id?" element={<NgoRatingsPage />} />
                    <Route path="/app/ngo/comments" element={<NgoCommentsPage />} />

                    {/* ניהול */}
                    <Route path="/app/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/app/admin/approvals" element={<AdminUserApprovalsPage />} />
                    <Route path="/app/admin/users" element={<AdminUsersManagementPage />} />
                    <Route path="/app/admin/volunteers" element={<VolunteersPage />} />
                    <Route path="/app/admin/donations" element={<AdminDonationsManagementPage />} />
                    <Route path="/app/admin/matching" element={<AdminMatchingEnginePage />} />
                    <Route path="/app/admin/routes" element={<AdminRoutesManagementPage />} />
                    <Route path="/app/admin/noshow" element={<AdminNoShowPage />} />
                    <Route path="/app/admin/reports" element={<AdminReportsPage />} />
                    <Route path="/app/admin/comments" element={<AdminCommentsManagementPage />} />
                    <Route path="/app/admin/settings" element={<AdminSettingsPage />} />

                    {/* מפה ומסלול */}
                    <Route path="/app/map" element={<GeneralMapPage />} />
                    <Route path="/app/vrp-route" element={<VrpRouteVisualizationPage />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
