import {Outlet} from 'react-router-dom';
import Header from './Header.jsx';
import SideMenu from './SideMenu.jsx';
import Footer from './Footer.jsx';
import useMenu from '../useMenu.js';

export default function Layout() {
    const {menuOpen, closeMenu, toggleMenu} = useMenu();

    return (
        <div className="page">
            <Header menuOpen={menuOpen} onToggle={toggleMenu} />
            {menuOpen ? (
                <button
                    type="button"
                    className="menu-scrim"
                    aria-label="סגירת תפריט"
                    onClick={closeMenu}
                />
            ) : null}
            <SideMenu open={menuOpen} onClose={closeMenu} />
            <main>
                <Outlet />
            </main>
            <Footer />
            <span className="edge-strip" aria-hidden="true" />
            {menuOpen ? <span className="esc-hint">ESC</span> : null}
        </div>
    );
}
