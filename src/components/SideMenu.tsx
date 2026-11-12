import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { StoredUser } from '../types';
import { otherRoles, roleTitle, switchRole } from '../utils/auth';

interface SideMenuProps {
    open: boolean;
    onClose: () => void;
}

// תיקון 41: תפריט המנהל היה רשימה אחת של 19 קישורים. עכשיו: דשבורד, ומתחתיו 5 נושאים שנפתחים ונסגרים
// (נושא אחד פתוח בכל פעם, והנושא של העמוד הנוכחי נפתח לבד)
interface AdminMenuGroup {
    id: string;
    title: string;
    items: { to: string; label: string }[];
}

const ADMIN_MENU: AdminMenuGroup[] = [
    {
        id: 'users',
        title: 'משתמשים ואישורים',
        items: [
            { to: '/app/admin/approvals', label: 'אישור משתמשים' },
            // תיקון 63: כל הרשימות (משתמשים, מתנדבים, ספקים, עמותות) - עמוד אחד עם לשוניות,
            // ולכן גם הנושא "מתנדבים" כבר לא נחוץ - מעקב הזמינות עבר לכאן
            { to: '/app/admin/users', label: 'כל המשתמשים' },
            { to: '/app/admin/volunteers-availability', label: 'מעקב זמינות מתנדבים' },
        ],
    },
    {
        id: 'donations',
        title: 'תרומות ושיבוץ',
        items: [
            { to: '/app/admin/donations', label: 'ניהול תרומות' },
            { to: '/app/admin/matching', label: 'מנוע שיבוץ' },
        ],
    },
    {
        id: 'field',
        title: 'פעילות בשטח ומפות',
        items: [
            { to: '/app/admin/live-map', label: 'חדר בקרה חי' },
            { to: '/app/admin/noshow', label: 'טיפול באי-הגעה' },
            { to: '/app/map', label: 'מפה כללית' },
        ],
    },
    {
        id: 'system',
        title: 'דוחות והגדרות',
        items: [
            { to: '/app/admin/reports', label: 'דוחות מערכת' },
            { to: '/app/admin/comments', label: 'ניהול תגובות' },
            { to: '/app/admin/settings', label: 'הגדרות מערכת' },
        ],
    },
];

const adminGroupOf = (path: string): string | null =>
    ADMIN_MENU.find((group) => group.items.some((item) => path === item.to || path.startsWith(`${item.to}/`)))?.id ?? null;

export default function SideMenu({ open, onClose }: SideMenuProps) {
    const { pathname } = useLocation();
    const [openAdminGroup, setOpenAdminGroup] = useState<string | null>(() => adminGroupOf(pathname));

    // מעבר לעמוד מנושא אחר (גם לא דרך התפריט) - הנושא שלו נפתח
    useEffect(() => {
        const group = adminGroupOf(pathname);
        if (group) setOpenAdminGroup(group);
    }, [pathname]);

    let currentUser: StoredUser = { role: 'guest' };
    try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser) as StoredUser;
        }
    } catch (e) {
        currentUser = { role: 'guest' };
    }
    
    const role = (currentUser.role || currentUser.type || '').toLowerCase();
    const isGuest = !role || role === 'guest';
    // תיקון 10: לחשבון יכולים להיות כמה תפקידים (למשל ספק שהוא גם מתנדב) - מעבר ביניהם מכאן
    const switchable = isGuest ? [] : otherRoles();

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
                    <Link to="/about" onClick={onClose} className="side-link">אודות</Link>
                    {/* מנהל המערכת הוא זה שמקבל את הפניות - אין לו צורך בקישור */}
                    {role !== 'admin' && (
                        <Link to="/contact" onClick={onClose} className="side-link">צור קשר</Link>
                    )}
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
                            <Link to="/app/profile" onClick={onClose} className="side-link">פרופיל אישי ושינוי סיסמה</Link>
                            <Link to="/app/notifications" onClick={onClose} className="side-link">התראות</Link>
                        </div>
                    </div>
                )}

                {/* --- מעבר בין התפקידים של אותו חשבון --- */}
                {switchable.length > 0 && (
                    <div className="menu-section">
                        <h3 className="side-group-title">התפקידים שלי</h3>
                        <div className="side-group-items">
                            <span className="side-link" aria-current="true" style={{ cursor: 'default', opacity: 0.75 }}>
                                ✓ עכשיו: {roleTitle(role)}
                            </span>
                            {switchable.map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    className="side-link"
                                    style={{ width: '100%', fontFamily: 'inherit' }}
                                    onClick={() => { onClose(); switchRole(r); }}
                                >
                                    מעבר לאזור {roleTitle(r)}
                                </button>
                            ))}
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
                            {/* תיקון 62: "בקשה נכנסת" יצאה מהתפריט - בקשה חדשה קופצת לבד ומופיעה בדשבורד */}
                            <Link to="/app/volunteer/active-route" onClick={onClose} className="side-link">מסלול פעיל</Link>
                            <Link to="/app/volunteer/history" onClick={onClose} className="side-link">היסטוריית שיבוצים</Link>
                            <Link to="/app/volunteer/ratings" onClick={onClose} className="side-link">דירוגים</Link>
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
                            {/* תיקון 63: "תגובות ספק" אוחד למסך התרומה (לשונית "שיחה") */}
                        </div>
                    </div>
                )}

                {/* --- אזור עמותה --- */}
                {(role.includes('ngo') || role.includes('org')) && (
                    <div className="menu-section">
                        <h3 className="side-group-title">אזור עמותה</h3>
                        <div className="side-group-items">
                            <Link to="/app/ngo/dashboard" onClick={onClose} className="side-link">דשבורד עמותה</Link>
                            {/* תיקון 52: הוסר "רישום עמותה" - מי שבאזור העמותה כבר רשום ומאושר כעמותה */}
                            <Link to="/app/ngo/hours" onClick={onClose} className="side-link">שעות פעילות</Link>
                            <Link to="/app/ngo/history" onClick={onClose} className="side-link">היסטוריית עמותה</Link>
                            {/* תיקון 62: "תרומות נכנסות" ו"תגובות" אוחדו לדשבורד ולמסך התרומה (לשונית "שיחה") */}
                            {/* תיקון 63: גם "אישור קבלה" - כפתור בדשבורד ובמסך התרומה */}
                        </div>
                    </div>
                )}

                {/* --- ניהול מערכת (למנהל בלבד) --- */}
                {role === 'admin' && (
                    <div className="menu-section">
                        <h3 className="side-group-title">ניהול מערכת</h3>
                        <div className="side-group-items">
                            <Link
                                to="/app/admin/dashboard"
                                onClick={onClose}
                                className={`side-link ${pathname === '/app/admin/dashboard' ? 'is-active' : ''}`}
                                aria-current={pathname === '/app/admin/dashboard' ? 'page' : undefined}
                            >
                                דשבורד ניהול
                            </Link>
                        </div>

                        {ADMIN_MENU.map((group) => {
                            const isOpen = openAdminGroup === group.id;
                            const itemsId = `admin-menu-${group.id}`;
                            return (
                                <div key={group.id} className={`admin-group ${isOpen ? 'is-open' : ''}`}>
                                    <button
                                        type="button"
                                        className="admin-group-toggle"
                                        aria-expanded={isOpen}
                                        aria-controls={itemsId}
                                        onClick={() => setOpenAdminGroup(isOpen ? null : group.id)}
                                    >
                                        <span>{group.title}</span>
                                    </button>
                                    {isOpen && (
                                        <div id={itemsId} className="side-group-items admin-group-items">
                                            {group.items.map((item) => {
                                                const active = pathname === item.to;
                                                return (
                                                    <Link
                                                        key={item.to}
                                                        to={item.to}
                                                        onClick={onClose}
                                                        className={`side-link ${active ? 'is-active' : ''}`}
                                                        aria-current={active ? 'page' : undefined}
                                                    >
                                                        {item.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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