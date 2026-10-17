export default function BasketShape() {
    return (
        <svg className="basket-svg" viewBox="0 0 100 100" role="img" aria-label="סל מזון">
            <path
                d="M32 32V26a18 18 0 0 1 36 0v6"
                fill="none"
                stroke="var(--charcoal)"
                strokeWidth="6"
                strokeLinecap="round"
            />
            <rect x="4" y="30" width="92" height="11" rx="5.5" fill="var(--cyan)" />
            <path
                d="M10 41h80l-7 47a9 9 0 0 1-9 8H26a9 9 0 0 1-9-8L10 41Z"
                fill="var(--charcoal)"
            />
            <path d="M16 58h68M19 74h62" stroke="var(--mint)" strokeWidth="3" opacity="0.45" />
            <path d="M34 41l4 55M66 41l-4 55" stroke="var(--mint)" strokeWidth="3" opacity="0.3" />
        </svg>
    );
}
