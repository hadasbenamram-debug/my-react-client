import type {MouseEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import HeartShape from './HeartShape';
import {useLiveUpdates} from './LiveUpdates';
import {getCurrentUser, getToken} from '../utils/auth';

interface HeaderProps {
    menuOpen: boolean;
    onToggle: () => void;
}

// תיקון 50: פעמון ההתראות - בכל דף באתר, עם מספר ההתראות שלא נקראו (מתעדכן בזמן אמת)
function NotificationBell() {
    const navigate = useNavigate();
    const {unread} = useLiveUpdates();
    const label = unread > 0 ? `${unread} התראות חדשות` : 'התראות';

    return (
        <Tooltip title={label} arrow>
            <IconButton className="header-bell" color="inherit" aria-label={label} onClick={() => navigate('/app/notifications')}>
                <Badge badgeContent={unread} color="error" max={99} overlap="circular">
                    {unread > 0 ? <NotificationsActiveIcon /> : <NotificationsNoneIcon />}
                </Badge>
            </IconButton>
        </Tooltip>
    );
}

export default function Header({menuOpen, onToggle}: HeaderProps) {
    const navigate = useNavigate();
    const loggedIn = !!getToken() && String(getCurrentUser().role || 'guest').toLowerCase() !== 'guest';

    const goHome = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        navigate('/');
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    return (
        <header className="site-header">
            <Link className="logo" to="/" aria-label="לתת באהבה" onClick={goHome}>
                <span className="logo-row">
                    <span className="logo-text" dir="rtl">
                        לתת
                        <span className="accent"> באהבה</span>
                    </span>
                    <HeartShape className="logo-heart" fill="var(--teal)" />
                </span>
                <span className="logo-tag">הצלת מזון · קהילה · ערבות הדדית</span>
            </Link>
            <div className="header-actions">
                {loggedIn && <NotificationBell />}
                <button
                    type="button"
                    className="menu-toggle"
                    aria-expanded={menuOpen}
                    aria-controls="side-menu"
                    onClick={onToggle}
                >
                    <span className="menu-word">
                        <span>ME</span>
                        <span>NU</span>
                    </span>
                    <span className="menu-bars" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                </button>
            </div>
        </header>
    );
}
