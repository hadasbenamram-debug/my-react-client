export type CaptionTone = 'dark' | 'light';

interface SceneCaptionProps {
    title: string;
    text?: string;
    /** 0..1 reveal progress */
    progress: number;
    tone?: CaptionTone;
}

export default function SceneCaption({title, text, progress, tone = 'dark'}: SceneCaptionProps) {
    return (
        <div
            className={`scene-caption${tone === 'light' ? ' scene-caption--light' : ''}`}
            style={{
                opacity: progress,
                transform: `translateY(${(1 - progress) * 30}px)`,
                visibility: progress > 0.01 ? 'visible' : 'hidden'
            }}
        >
            <h2>{title}</h2>
            {text ? <p>{text}</p> : null}
        </div>
    );
}
