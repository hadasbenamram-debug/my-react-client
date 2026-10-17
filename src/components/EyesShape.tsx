interface Eye {
    cx: number;
    cy: number;
}

const EYES: Eye[] = [
    {cx: 96, cy: 84},
    {cx: 224, cy: 84}
];

interface EyesShapeProps {
    /** -1..1 horizontal gaze offset */
    offset: number;
}

export default function EyesShape({offset}: EyesShapeProps) {
    return (
        <svg className="eyes-svg" viewBox="0 0 320 168" role="img" aria-label="זוג עיניים">
            {EYES.map((eye) => (
                <g key={eye.cx}>
                    <circle
                        cx={eye.cx}
                        cy={eye.cy}
                        r="56"
                        fill="#ffffff"
                        stroke="var(--cyan)"
                        strokeWidth="9"
                    />
                    <circle
                        className="eye-pupil"
                        cx={eye.cx}
                        cy={eye.cy}
                        r="16"
                        fill="var(--charcoal)"
                        style={{transform: `translateX(${offset * 22}px)`}}
                    />
                </g>
            ))}
        </svg>
    );
}
