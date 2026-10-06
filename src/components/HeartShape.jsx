export default function HeartShape({className = 'heart-svg', fill = 'var(--mint)'}) {
    return (
        <svg className={className} viewBox="0 0 100 92" role="img" aria-label="לב">
            <path
                d="M50 88C22 68 4 50 4 30.5 4 15.9 15.4 5 29.4 5 38 5 45.6 9.6 50 16.6 54.4 9.6 62 5 70.6 5 84.6 5 96 15.9 96 30.5 96 50 78 68 50 88Z"
                fill={fill}
            />
        </svg>
    );
}
