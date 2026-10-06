import {Link, useNavigate, useLocation} from 'react-router-dom';
import {NAV_GROUPS, SOCIALS} from '../data.js';

export default function SideMenu({open, onClose}) {
    const navigate = useNavigate();
    const location = useLocation();

    const goTo = (item) => {
        onClose();
        if (item.to) {
            navigate(item.to);
            return;
        }
        if (location.pathname !== '/') {
            navigate('/', {state: {scrollTo: item.id}});
            return;
        }
        const node = document.getElementById(item.id);
        if (node) {
            node.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    };

    return (
        <aside
            id="side-menu"
            className={`side-menu${open ? ' is-open' : ''}`}
            aria-hidden={!open}
            aria-label="תפריט ראשי"
        >
            <button type="button" className="side-menu-close" onClick={onClose} aria-label="סגירת תפריט">
                ×
            </button>
            <nav className="side-nav">
                {NAV_GROUPS.map((group, groupIndex) => (
                    <details key={group.title} className="side-group" open={groupIndex === 0}>
                        <summary className="side-group-title">{group.title}</summary>
                        <div className="side-group-items">
                            {group.items.map((item) => (
                                <button
                                    key={item.to || item.id}
                                    type="button"
                                    className="side-link"
                                    tabIndex={open ? 0 : -1}
                                    onClick={() => goTo(item)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </details>
                ))}
            </nav>
            <div className="side-socials">
                {SOCIALS.map((social) => (
                    <Link
                        key={social.label}
                        to={social.href}
                        aria-label={social.label}
                        tabIndex={open ? 0 : -1}
                        onClick={onClose}
                    >
                        {social.short}
                    </Link>
                ))}
            </div>
        </aside>
    );
}
