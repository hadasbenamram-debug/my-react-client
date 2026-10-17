import {BrowserRouter, Route, Routes, Navigate} from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import AppPageLayout from './components/AppPageLayout';

// --- דפים כלליים ---
import {LoginPage} from './pages/LoginPage';
import {ForgotPasswordPage} from './pages/ForgotPasswordPage';
import {ResetPasswordPage} from './pages/ResetPasswordPage';
import {RespondByLinkPage} from './pages/RespondByLinkPage';
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

// --- מסכי ארגון תורם (ספק) ---
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

// --- עמודי ניהול וחיפוש חדשים ---
import {AdminVolunteersDirectoryPage} from './pages/AdminVolunteersDirectoryPage';
import {AdminVolunteersAvailabilityPage} from './pages/AdminVolunteersAvailabilityPage';
import {AdminLiveMonitorPage} from './pages/AdminLiveMonitorPage';
import {AdminSuppliersDirectoryPage} from './pages/AdminSuppliersDirectoryPage';
import {AdminNgosDirectoryPage} from './pages/AdminNgosDirectoryPage';

// --- דפי הרשמה (ציבוריים) ---
import {VolunteerRegisterPage} from './pages/VolunteerRegisterPage';
import {SupplierRegisterPage} from './pages/SupplierRegisterPage';

// --- מסכי מפה ומסלול ---
import {GeneralMapPage} from './pages/GeneralMapPage';
import {VrpRouteVisualizationPage} from './pages/VrpRouteVisualizationPage';
import type {StoredUser} from './types';
import {getCurrentUser} from './utils/auth';

export default function App() {
    const currentUser: StoredUser = getCurrentUser();

    const role = (currentUser.role || currentUser.type || 'guest').toLowerCase();

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route element={<AppPageLayout />}>
                        {/* צור קשר - עמוד אחד לכולם (אורחים ומחוברים) */}
                        <Route path="/contact" element={<ContactSupportPage />} />
                        {/* כתובת ישנה - מפנה לעמוד המאוחד כדי שקישורים קיימים לא יישברו */}
                        <Route path="/app/support" element={<Navigate to="/contact" replace />} />

                        <Route path="/app/login" element={<LoginPage />} />
                        <Route path="/app/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/app/reset-password" element={<ResetPasswordPage />} />
                        {/* קישור מהמייל לבקשת התנדבות - עובד גם בלי התחברות (טוקן חד-פעמי למסלול) */}
                        <Route path="/app/respond" element={<RespondByLinkPage />} />
                        <Route path="/app/register-volunteer" element={<VolunteerRegisterPage />} />
                        <Route path="/app/register-supplier" element={<SupplierRegisterPage />} />
                        <Route path="/app/register-ngo" element={<NgoRegisterPage />} />

                        {/* --- מנהל מערכת (Admin) --- */}
                        {role === 'admin' && (
                            <>
                                <Route path="/app/profile" element={<ProfilePage />} />
                                <Route path="/app/notifications" element={<NotificationsPage />} />

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

                                <Route path="/app/admin/volunteers-directory" element={<AdminVolunteersDirectoryPage />} />
                                <Route path="/app/admin/volunteers-availability" element={<AdminVolunteersAvailabilityPage />} />
                                <Route path="/app/admin/live-monitor" element={<AdminLiveMonitorPage />} />
                                <Route path="/app/admin/suppliers-directory" element={<AdminSuppliersDirectoryPage />} />
                                <Route path="/app/admin/ngos-directory" element={<AdminNgosDirectoryPage />} />

                                <Route path="/app/map" element={<GeneralMapPage />} />
                                <Route path="/app/vrp-route" element={<VrpRouteVisualizationPage />} />

                                <Route path="*" element={<Navigate to="/app/admin/dashboard" replace />} />
                            </>
                        )}

                        {/* --- מתנדב --- */}
                        {role.includes('volunt') && (
                            <>
                                <Route path="/app/profile" element={<ProfilePage />} />
                                <Route path="/app/notifications" element={<NotificationsPage />} />

                                <Route path="/app/volunteer/dashboard" element={<VolunteerDashboard />} />
                                <Route path="/app/volunteer/availability" element={<WeeklyAvailabilityPage />} />
                                <Route path="/app/volunteer/incoming-request/:id?" element={<IncomingRequestPage />} />
                                <Route path="/app/volunteer/active-route" element={<ActiveRoutePage />} />
                                <Route path="/app/volunteer/complete-delivery" element={<CompleteDeliveryPage />} />
                                <Route path="/app/volunteer/history" element={<AssignmentHistoryPage />} />
                                <Route path="/app/volunteer/ratings" element={<VolunteerRatingsPage />} />
                                <Route path="/app/volunteer/comments" element={<CommentsSection />} />

                                <Route path="*" element={<Navigate to="/app/volunteer/dashboard" replace />} />
                            </>
                        )}

                        {/* --- ספק / ארגון תורם --- */}
                        {(role.includes('suppl') || role.includes('business')) && (
                            <>
                                <Route path="/app/profile" element={<ProfilePage />} />
                                <Route path="/app/notifications" element={<NotificationsPage />} />

                                <Route path="/app/supplier/dashboard" element={<SupplierDashboard />} />
                                <Route path="/app/supplier/create-donation" element={<CreateDonationPage />} />
                                <Route path="/app/supplier/open-donations" element={<OpenDonationsPage />} />
                                <Route path="/app/supplier/donation-details" element={<DonationDetailsPage />} />
                                <Route path="/app/supplier/history" element={<SupplierHistoryPage />} />
                                <Route path="/app/supplier/comments" element={<SupplierCommentsPage />} />

                                <Route path="*" element={<Navigate to="/app/supplier/dashboard" replace />} />
                            </>
                        )}

                        {/* --- עמותה --- */}
                        {(role.includes('ngo') || role.includes('org')) && (
                            <>
                                <Route path="/app/profile" element={<ProfilePage />} />
                                <Route path="/app/notifications" element={<NotificationsPage />} />

                                <Route path="/app/ngo/dashboard" element={<NgoDashboard />} />
                                <Route path="/app/ngo/register" element={<NgoRegisterPage />} />
                                <Route path="/app/ngo/hours" element={<NgoWorkingHoursPage />} />
                                <Route path="/app/ngo/incoming" element={<IncomingDonationsPage />} />
                                <Route path="/app/ngo/confirm" element={<ConfirmDonationReceiptPage />} />
                                <Route path="/app/ngo/history" element={<NgoHistoryPage />} />
                                <Route path="/app/ngo/ratings/:id?" element={<NgoRatingsPage />} />
                                <Route path="/app/ngo/comments" element={<NgoCommentsPage />} />

                                <Route path="*" element={<Navigate to="/app/ngo/dashboard" replace />} />
                            </>
                        )}

                        {/* --- אורח / לא מחובר --- */}
                        {role === 'guest' && (
                            <Route path="*" element={<Navigate to="/app/login" replace />} />
                        )}
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}