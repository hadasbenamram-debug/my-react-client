import { Link } from 'react-router-dom';

export default function SideMenu({ open, onClose }) {
    let currentUser = { role: 'guest' };
    try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
        }
    } catch (e) {
        currentUser = { role: 'guest' };
    }
    
    const role = (currentUser.role || currentUser.type || '').toLowerCase();
    const isGuest = !role || role === 'guest';

    return (
        <aside className={`side-menu ${open ? 'is-open' : ''}`}>
            <button 
                type="button" 
                className="side-menu-close" 
                onClick={onClose} 
                aria-label="סגירת תפריט"
            >
                ✕
            </button>
            <div className="side-menu-content">
                {/* קישורים כלליים */}
                <div className="menu-section">
                    <Link to="/" onClick={onClose} className="side-link">עמוד הבית</Link>
                    <Link to="/contact" onClick={onClose} className="side-link">צור קשר</Link>
                </div>

                {/* אזור אורח */}
                {isGuest && (
                    <div className="menu-section">
                        <h3 className="side-group-title">אזור אישי</h3>
                        <div className="side-group-items">
                            <Link to="/app/login" onClick={onClose} className="side-link">התחברות</Link>
                            <Link to="/app/forgot-password" onClick={onClose} className="side-link">איפוס סיסמה</Link>
                            <Link to="/app/register-volunteer" onClick={onClose} className="side-link">הרשמת מתנדב</Link>
                            <Link to="/app/register-supplier" onClick={onClose} className="side-link">הרשמת ספק / עסק</Link>
                            <Link to="/app/register-ngo" onClick={onClose} className="side-link">הרשמת עמותה</Link>
                        </div>
                    </div>
                )}

                {/* אזור כללי למשתמש מחובר */}
                {!isGuest && (
                    <div className="menu-section">
                        <h3 className="side-group-title">כללי</h3>
                        <div className="side-group-items">
                            <Link to="/app/profile" onClick={onClose} className="side-link">פרופיל אישי</Link>
                            <Link to="/app/notifications" onClick={onClose} className="side-link">התראות</Link>
                            <Link to="/app/support" onClick={onClose} className="side-link">תמיכה וצור קשר</Link>
                        </div>
                    </div>
                )}

                {/* --- אזור מתנדב (למתנדב בלבד, מנהל לא צריך לראות את זה בתפריט שלו) --- */}
                {role.includes('volunt') && (
                    <div className="menu-section">
                        <h3 className="side-group-title">אזור מתנדב</h3>
                        <div className="side-group-items">
                            <Link to="/app/volunteer/dashboard" onClick={onClose} className="side-link">דשבורד מתנדב</Link>
                            <Link to="/app/volunteer/availability" onClick={onClose} className="side-link">זמינות שבועית</Link>
                            <Link to="/app/volunteer/incoming-request" onClick={onClose} className="side-link">בקשה נכנסת</Link>
                            <Link to="/app/volunteer/active-route" onClick={onClose} className="side-link">מסלול פעיל</Link>
                            <Link to="/app/volunteer/complete-delivery" onClick={onClose} className="side-link">סיום משלוח</Link>
                            <Link to="/app/volunteer/history" onClick={onClose} className="side-link">היסטוריית שיבוצים</Link>
                            <Link to="/app/volunteer/ratings" onClick={onClose} className="side-link">דירוגים ותגובות</Link>
                        </div>
                    </div>
                )}

                {/* --- אזור ספק / עסק --- */}
                {(role.includes('suppl') || role.includes('business')) && (
                    <div className="menu-section">
                        <h3 className="side-group-title">אזור ספק / עסק</h3>
                        <div className="side-group-items">
                            <Link to="/app/supplier/dashboard" onClick={onClose} className="side-link">דשבורד ספק</Link>
                            <Link to="/app/supplier/create-donation" onClick={onClose} className="side-link">יצירת תרומה</Link>
                            <Link to="/app/supplier/open-donations" onClick={onClose} className="side-link">תרומות פתוחות</Link>
                            <Link to="/app/supplier/history" onClick={onClose} className="side-link">היסטוריית ספק</Link>
                            <Link to="/app/supplier/comments" onClick={onClose} className="side-link">תגובות ספק</Link>
                        </div>
                    </div>
                )}

                {/* --- אזור עמותה --- */}
                {(role.includes('ngo') || role.includes('org')) && (
                    <div className="menu-section">
                        <h3 className="side-group-title">אזור עמותה</h3>
                        <div className="side-group-items">
                            <Link to="/app/ngo/dashboard" onClick={onClose} className="side-link">דשבורד עמותה</Link>
                            <Link to="/app/ngo/register" onClick={onClose} className="side-link">רישום עמותה</Link>
                            <Link to="/app/ngo/hours" onClick={onClose} className="side-link">שעות פעילות</Link>
                            <Link to="/app/ngo/incoming" onClick={onClose} className="side-link">תרומות נכנסות</Link>
                            <Link to="/app/ngo/confirm" onClick={onClose} className="side-link">אישור קבלה</Link>
                            <Link to="/app/ngo/history" onClick={onClose} className="side-link">היסטוריית עמותה</Link>
                        </div>
                    </div>
                )}

                {/* --- ניהול מערכת (למנהל בלבד) --- */}
                {role === 'admin' && (
                    <div className="menu-section">
                        <h3 className="side-group-title">ניהול מערכת</h3>
                        <div className="side-group-items">
                            <Link to="/app/admin/dashboard" onClick={onClose} className="side-link">דשבורד ניהול</Link>
                            <Link to="/app/admin/approvals" onClick={onClose} className="side-link">אישור משתמשים</Link>
                            <Link to="/app/admin/users" onClick={onClose} className="side-link">ניהול משתמשים</Link>
                            <Link to="/app/admin/volunteers" onClick={onClose} className="side-link">ניהול מתנדבים</Link>
                            <Link to="/app/admin/donations" onClick={onClose} className="side-link">ניהול תרומות</Link>
                            <Link to="/app/admin/matching" onClick={onClose} className="side-link">מנוע שיבוץ</Link>
                            <Link to="/app/admin/routes" onClick={onClose} className="side-link">ניהול מסלולים</Link>
                            <Link to="/app/admin/noshow" onClick={onClose} className="side-link">טיפול באי-הגעה</Link>
                            <Link to="/app/admin/reports" onClick={onClose} className="side-link">דוחות מערכת</Link>
                            <Link to="/app/admin/settings" onClick={onClose} className="side-link">הגדרות מערכת</Link>
                            <Link to="/app/admin/volunteers-directory" onClick={onClose} className="side-link">ספריית מתנדבים</Link>
<Link to="/app/admin/volunteers-availability" onClick={onClose} className="side-link">מעקב זמינות מתנדבים</Link>
<Link to="/app/admin/live-monitor" onClick={onClose} className="side-link">מוניטור פעילות בשטח</Link>
<Link to="/app/admin/suppliers-directory" onClick={onClose} className="side-link">ספריית ספקים ותורמים</Link>
<Link to="/app/admin/ngos-directory" onClick={onClose} className="side-link">ספריית עמותות</Link>
                            <Link to="/app/map" onClick={onClose} className="side-link">מפה כללית</Link>
                            <Link to="/app/vrp-route" onClick={onClose} className="side-link">ויזואליזציית מסלול</Link>
                        </div>
                    </div>
                )}

                {/* כפתור התנתקות */}
                {!isGuest && (
                    <div className="menu-section" style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.16)', paddingTop: '1rem' }}>
                        <button 
                            type="button" 
                            className="side-link" 
                            style={{ width: '100%', textAlign: 'right', color: '#ffb3b3', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('currentUser');
                                onClose();
                                window.location.href = '/app/login';
                            }}
                        >
                            התנתק מהמערכת
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}