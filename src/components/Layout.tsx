import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import SideMenu from './SideMenu';
import { LiveUpdatesProvider } from './LiveUpdates';
import { useAppDispatch, useAppSelector } from '../store';
import { menuClosed, menuToggled, selectMenuOpen } from '../store/uiSlice';

export default function Layout() {
    const dispatch = useAppDispatch();
    const menuOpen = useAppSelector(selectMenuOpen);

    const toggleMenu = () => dispatch(menuToggled());
    const closeMenu = () => dispatch(menuClosed());

    // Escape סוגר את התפריט
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') dispatch(menuClosed());
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuOpen, dispatch]);

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
