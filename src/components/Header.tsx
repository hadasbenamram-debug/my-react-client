import type {MouseEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import HeartShape from './HeartShape';

interface HeaderProps {
    menuOpen: boolean;
    onToggle: () => void;
}

export default function Header({menuOpen, onToggle}: HeaderProps) {
    const navigate = useNavigate();

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
        </header>
    );
}
