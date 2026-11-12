import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import SideMenu from './SideMenu';
import { LiveUpdatesProvider } from './LiveUpdates';

export default function Layout() {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(prev => !prev);
    };

    const closeMenu = () => {
        setMenuOpen(false);
    };

    // תיקונים 45 + 50: התראות בזמן אמת בכל האתר (חיבור אחד), פעמון בכותרת, ובקשות איסוף למתנדב מכל דף
    return (
        <LiveUpdatesProvider>
            <div className="layout-container">
                <Header menuOpen={menuOpen} onToggle={toggleMenu} />
                <SideMenu open={menuOpen} onClose={closeMenu} />
                {menuOpen && <div className="menu-backdrop" onClick={closeMenu} />}
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </LiveUpdatesProvider>
    );
}