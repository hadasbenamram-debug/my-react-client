import {useCallback, useEffect, useState} from 'react';

export interface UseMenuResult {
    menuOpen: boolean;
    closeMenu: () => void;
    toggleMenu: () => void;
}

export default function useMenu(): UseMenuResult {
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

    useEffect(() => {
        if (!menuOpen) {
            return undefined;
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuOpen]);

    return {menuOpen, closeMenu, toggleMenu};
}
