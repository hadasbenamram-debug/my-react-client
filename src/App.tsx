import {BrowserRouter, Route, Routes, Navigate, useSearchParams} from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import AppPageLayout from './components/AppPageLayout';

// --- דפים כלליים ---
import {LoginPage} from './pages/LoginPage';
import {ForgotPasswordPage} from './pages/ForgotPasswordPage';
import {ResetPasswordPage} from './pages/ResetPasswordPage';
import {RespondByLinkPage} from './pages/RespondByLinkPage';
import {WelcomeLinkPage} from './pages/WelcomeLinkPage';
import {ProfilePage} from './pages/ProfilePage';
import {NotificationsPage} from './pages/NotificationsPage';
import {ContactSupportPage} from './pages/ContactSupportPage';
import {AboutPage} from './pages/AboutPage';
import DonationScreen from './components/DonationScreen';

// --- מסכי מתנדב ---
import {VolunteerDashboard} from './pages/VolunteerDashboard';
import {WeeklyAvailabilityPage} from './pages/WeeklyAvailabilityPage';
import {IncomingRequestPage} from './pages/IncomingRequestPage';
import {ActiveRoutePage} from './pages/ActiveRoutePage';
import {AssignmentHistoryPage} from './pages/AssignmentHistoryPage';
import {VolunteerRatingsPage} from './pages/VolunteerRatingsPage';

// --- מסכי ארגון תורם (ספק) ---
import {CreateDonationPage} from './pages/CreateDonationPage';
import {OpenDonationsPage} from './pages/OpenDonationsPage';
import {SupplierDashboard} from './pages/SupplierDashboard';
import {SupplierHistoryPage} from './pages/SupplierHistoryPage';

// --- מסכי עמותה ---
import {NgoDashboard} from './pages/NgoDashboard';
import {NgoRegisterPage} from './pages/NgoRegisterPage';
import {NgoWorkingHoursPage} from './pages/NgoWorkingHoursPage';
import {NgoHistoryPage} from './pages/NgoHistoryPage';
import {NgoRatingsPage} from './pages/NgoRatingsPage';

// --- מסכי ניהול (Admin) ---
import {AdminDashboard} from './pages/AdminDashboard';
import {AdminUserApprovalsPage} from './pages/AdminUserApprovalsPage';
// תיקון 63: ניהול משתמשים + ספריות המתנדבים, הספקים והעמותות - עמוד אחד עם לשוניות
import {AdminPeoplePage} from './pages/AdminPeoplePage';
import {AdminDonationsManagementPage} from './pages/AdminDonationsManagementPage';
import {AdminMatchingEnginePage} from './pages/AdminMatchingEnginePage';
import {AdminNoShowPage} from './pages/AdminNoShowPage';
import {AdminReportsPage} from './pages/AdminReportsPage';
import {AdminCommentsManagementPage} from './pages/AdminCommentsManagementPage';
import {AdminSettingsPage} from './pages/AdminSettingsPage';

// --- עמודי ניהול וחיפוש חדשים ---
import {AdminVolunteersAvailabilityPage} from './pages/AdminVolunteersAvailabilityPage';
// המפה החיה של כל המסלולים שבדרך עכשיו (מנהל)
import {AdminLiveRoutesMapPage} from './pages/AdminLiveRoutesMapPage';

// --- דפי הרשמה (ציבוריים) ---
import {VolunteerRegisterPage} from './pages/VolunteerRegisterPage';
import {SupplierRegisterPage} from './pages/SupplierRegisterPage';

// --- מסכי מפה ומסלול ---
import {GeneralMapPage} from './pages/GeneralMapPage';
// מעקב חי אחרי משלוח (עמותה / ספק / מנהל) - מיומן המשלוח בשרת
import {RouteTrackingPage} from './pages/RouteTrackingPage';
import type {StoredUser} from './types';
import {getCurrentUser} from './utils/auth';
import RoleFallback from './components/RoleFallback';

// תיקון 63: "פרטי תרומה" של הספק (?id=) הוחלף במסך התרומה - קישורים ישנים עוברים אליו
function LegacySupplierDonationRedirect() {
    const [params] = useSearchParams();
    const id = Number(params.get('id'));
    return <Navigate to={id > 0 ? `/app/supplier/donation/${id}` : '/app/supplier/open-donations'} replace />;
}

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
                        {/* תיקון 59: עמוד אודות */}
                        <Route path="/about" element={<AboutPage />} />
                        {/* כתובת ישנה - מפנה לעמוד המאוחד כדי שקישורים קיימים לא יישברו */}
                        <Route path="/app/support" element={<Navigate to="/contact" replace />} />

                        <Route path="/app/login" element={<LoginPage />} />
                        <Route path="/app/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/app/reset-password" element={<ResetPasswordPage />} />
                        {/* קישור מהמייל לבקשת התנדבות - עובד גם בלי התחברות (טוקן חד-פעמי למסלול) */}
                        <Route path="/app/respond" element={<RespondByLinkPage />} />
                        {/* קישור מהמייל "הבקשה שלך אושרה" - נכנסים ישר למערכת בלי מסך התחברות (טוקן חד-פעמי) */}
                        <Route path="/app/welcome" element={<WelcomeLinkPage />} />
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
                                <Route path="/app/admin/users" element={<AdminPeoplePage />} />
                                <Route path="/app/admin/donations" element={<AdminDonationsManagementPage />} />
                                <Route path="/app/admin/matching" element={<AdminMatchingEnginePage />} />
                                <Route path="/app/admin/noshow" element={<AdminNoShowPage />} />
                                <Route path="/app/admin/reports" element={<AdminReportsPage />} />
                                <Route path="/app/admin/comments" element={<AdminCommentsManagementPage />} />
                                <Route path="/app/admin/settings" element={<AdminSettingsPage />} />

                                <Route path="/app/admin/volunteers-availability" element={<AdminVolunteersAvailabilityPage />} />
                                <Route path="/app/admin/live-map" element={<AdminLiveRoutesMapPage />} />

                                <Route path="/app/map" element={<GeneralMapPage />} />
                                <Route path="/app/track/:routeId" element={<RouteTrackingPage />} />

                                {/* תיקון 62: דפים שאוחדו לדפים אחרים - הכתובות הישנות מפנות לדף החדש, כדי שקישורים ישנים לא יישברו */}
                                <Route path="/app/admin/volunteers" element={<Navigate to="/app/admin/users?tab=volunteers" replace />} />
                                <Route path="/app/admin/live-monitor" element={<Navigate to="/app/admin/live-map" replace />} />
                                <Route path="/app/vrp-route" element={<Navigate to="/app/admin/live-map" replace />} />
                                {/* תיקון 63: הספריות הן עכשיו לשוניות בעמוד "משתמשים", והמסלולים שעוד לא יצאו - בחדר הבקרה */}
                                <Route path="/app/admin/volunteers-directory" element={<Navigate to="/app/admin/users?tab=volunteers" replace />} />
                                <Route path="/app/admin/suppliers-directory" element={<Navigate to="/app/admin/users?tab=suppliers" replace />} />
                                <Route path="/app/admin/ngos-directory" element={<Navigate to="/app/admin/users?tab=ngos" replace />} />
                                <Route path="/app/admin/routes" element={<Navigate to="/app/admin/live-map" replace />} />

                                <Route path="*" element={<RoleFallback home="/app/admin/dashboard" />} />
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
                                <Route path="/app/volunteer/history" element={<AssignmentHistoryPage />} />
                                <Route path="/app/volunteer/ratings" element={<VolunteerRatingsPage />} />
                                {/* תיקון 60: מסך תרומה - פרטים / מעקב / שיחה */}
                                <Route path="/app/volunteer/donation/:id" element={<DonationScreen role="volunteer" />} />
                                {/* תיקון 62: כתובות ישנות - התגובות נמצאות עכשיו בלשונית "שיחה" במסך התרומה */}
                                <Route path="/app/volunteer/complete-delivery" element={<Navigate to="/app/volunteer/active-route" replace />} />
                                <Route path="/app/volunteer/comments" element={<Navigate to="/app/volunteer/history" replace />} />

                                <Route path="*" element={<RoleFallback home="/app/volunteer/dashboard" />} />
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
                                <Route path="/app/supplier/history" element={<SupplierHistoryPage />} />
                                <Route path="/app/track/:routeId" element={<RouteTrackingPage />} />
                                {/* תיקון 63: מסך תרומה לספק - פרטים / מעקב / שיחה (במקום "פרטי תרומה" ו"תגובות ספק") */}
                                <Route path="/app/supplier/donation/:id" element={<DonationScreen role="supplier" />} />
                                <Route path="/app/supplier/donation-details" element={<LegacySupplierDonationRedirect />} />
                                <Route path="/app/supplier/comments" element={<Navigate to="/app/supplier/dashboard" replace />} />

                                <Route path="*" element={<RoleFallback home="/app/supplier/dashboard" />} />
                            </>
                        )}

                        {/* --- עמותה --- */}
                        {(role.includes('ngo') || role.includes('org')) && (
                            <>
                                <Route path="/app/profile" element={<ProfilePage />} />
                                <Route path="/app/notifications" element={<NotificationsPage />} />

                                <Route path="/app/ngo/dashboard" element={<NgoDashboard />} />
                                <Route path="/app/ngo/hours" element={<NgoWorkingHoursPage />} />
                                <Route path="/app/ngo/history" element={<NgoHistoryPage />} />
                                <Route path="/app/ngo/ratings/:id?" element={<NgoRatingsPage />} />
                                <Route path="/app/ngo/donation/:id" element={<DonationScreen role="ngo" />} />
                                {/* תיקון 62: כתובות ישנות - "תרומות נכנסות" והתגובות נמצאות עכשיו בדשבורד ובמסך התרומה */}
                                <Route path="/app/ngo/incoming" element={<Navigate to="/app/ngo/dashboard" replace />} />
                                <Route path="/app/ngo/comments" element={<Navigate to="/app/ngo/dashboard" replace />} />
                                {/* תיקון 63: "אישור קבלה" נמצא עכשיו בדשבורד ובמסך התרומה */}
                                <Route path="/app/ngo/confirm" element={<Navigate to="/app/ngo/dashboard" replace />} />
                                <Route path="/app/track/:routeId" element={<RouteTrackingPage />} />

                                <Route path="*" element={<RoleFallback home="/app/ngo/dashboard" />} />
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