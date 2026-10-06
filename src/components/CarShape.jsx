export default function CarShape() {
    return (
        <svg className="car-svg" viewBox="0 0 260 100" role="img" aria-label="מכונית">
            <path
                className="car-body"
                d="M12 74Q4 74 4 66V60Q4 52 12 50L60 42 88 20Q93 15 100 15H172Q181 15 185 22L200 44 240 50Q252 52 252 62V68Q252 74 244 74Z"
                fill="var(--teal)"
            />
            <path className="car-glass" d="M74 40 97 22H120V40Z" fill="var(--ink)" />
            <path className="car-glass" d="M128 22H168Q174 22 177 27L186 40H128Z" fill="var(--ink)" />
            <rect x="8" y="52" width="20" height="10" rx="5" fill="#fbfbfb" />
            <rect x="236" y="54" width="14" height="8" rx="4" fill="var(--ink)" opacity="0.75" />
            <rect x="124" y="44" width="2" height="26" fill="var(--ink)" opacity="0.25" />
            <g className="car-wheel">
                <circle cx="68" cy="76" r="17" fill="var(--ink)" />
                <circle cx="68" cy="76" r="7" fill="var(--teal)" />
                <rect x="66" y="62" width="4" height="28" fill="var(--bg)" opacity="0.55" />
            </g>
            <g className="car-wheel">
                <circle cx="196" cy="76" r="17" fill="var(--ink)" />
                <circle cx="196" cy="76" r="7" fill="var(--teal)" />
                <rect x="194" y="62" width="4" height="28" fill="var(--bg)" opacity="0.55" />
            </g>
        </svg>
    );
}
