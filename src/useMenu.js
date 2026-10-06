import {useCallback, useEffect, useState} from 'react';

export default function useMenu() {
    const [menuOpen, setMenuOpen] = useState(false);

    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

    useEffect(() => {
        if (!menuOpen) {
            return undefined;
        }
        const onKey = (event) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuOpen]);

    return {menuOpen, closeMenu, toggleMenu};
}
