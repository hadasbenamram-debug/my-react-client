import React from 'react';
import CarShape from './CarShape.jsx';
import SceneCaption from './SceneCaption.jsx';
import useScrollProgress from '../hooks/useScrollProgress.js';
import { range } from '../utils/motion.js';
import { SCENES } from '../data.js';

export default function CarDrive() {
    const [ref, progress] = useScrollProgress();
    const drive = range(progress, 0.06, 0.5);
    const exit = range(progress, 0.5, 0.58);
    // הכיתוב מופיע מיד אחרי שהרכב והנוף נעלמים - בלי רגע ריק באמצע
    const reveal = range(progress, 0.54, 0.7);

    // תנועה אופקית עדינה לרקע
    const bgTranslateX = (drive - 0.5) * 40;

    return (
        <section className="scene car-scene" ref={ref}>
            <div className="scene-sticky">
                {/* 1. איור הרקע העשיר - מיושר לתחתית המסך */}
                <div
                    className="car-scene-background"
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        // רוחב נוסף בצדדים כדי שהתזוזה האופקית לא תחשוף שוליים
                        left: -30,
                        right: -30,
                        zIndex: 0,
                        pointerEvents: 'none',
                        opacity: 1 - exit,
                        transform: `translateX(${bgTranslateX}px)`,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center'
                    }}
                    aria-hidden="true"
                >
                    <svg
                        viewBox="0 0 1400 600"
                        preserveAspectRatio="xMidYMax slice"
                        style={{ width: '100%', height: '100%' }}
                    >
                        {/* בשמיים: כדור פורח ומטוס */}
                        <g fill="#aab0b7" opacity="0.6">
                            <path d="M1250,110 C1250,95 1262,85 1275,85 C1288,85 1300,95 1300,110 C1300,122 1288,135 1275,140 C1262,135 1250,122 1250,110 Z" />
                            <rect x="1272" y="143" width="6" height="5" rx="1" />
                            <path d="M370,120 L420,95 L415,90 L375,110 L340,112 Z" />
                        </g>

                        {/* קו הרים רחוק בטורקיז-אפור עדין ברקע */}
                        <g opacity="0.4">
                            <polygon points="900,500 1020,380 1140,500" fill="#2bacc1" />
                            <polygon points="1000,500 1100,350 1200,500" fill="#1b8698" />
                            <polygon points="-50,500 80,360 210,500" fill="#2bacc1" />
                        </g>

                        {/* צלליות בניינים צפופות ברקע */}
                        <g fill="#e0e2e8" opacity="0.85">
                            <rect x="40" y="260" width="50" height="240" />
                            <rect x="100" y="200" width="60" height="300" />
                            <rect x="170" y="280" width="45" height="220" />
                            <rect x="225" y="210" width="65" height="290" />
                            <rect x="300" y="270" width="55" height="230" />
                            <rect x="365" y="180" width="60" height="320" />
                            <rect x="435" y="290" width="50" height="210" />
                            <rect x="495" y="230" width="55" height="270" />
                            <rect x="560" y="200" width="65" height="300" />
                            <rect x="635" y="260" width="45" height="240" />
                            <rect x="880" y="220" width="60" height="280" />
                            <rect x="950" y="180" width="70" height="320" />
                            <rect x="1030" y="250" width="50" height="250" />
                            <rect x="1090" y="210" width="60" height="290" />
                            <rect x="1160" y="270" width="55" height="230" />
                            <rect x="1225" y="190" width="65" height="310" />
                            <rect x="1300" y="240" width="70" height="260" />
                        </g>

                        {/* אלמנטים קדמיים מפורטים (בתים, עץ דקל, עציצים ותחנה) */}
                        <g>
                            {/* בתים משמאל */}
                            <rect x="80" y="410" width="55" height="90" fill="#ffffff" stroke="#2bacc1" strokeWidth="3" />
                            <polygon points="70,410 107,370 145,410" fill="#2bacc1" />
                            <rect x="98" y="450" width="20" height="50" fill="#1b8698" />

                            <rect x="150" y="410" width="65" height="90" fill="#ffffff" stroke="#2bacc1" strokeWidth="3" />
                            <polygon points="140,410 182,370 225,410" fill="#2bacc1" />

                            {/* עץ דקל משמאל */}
                            <g transform="translate(240, 0)">
                                <path d="M40,500 Q45,360 40,260" stroke="#0f8188" strokeWidth="7" fill="none" />
                                <path
                                    d="M40,260 C10,240 -20,260 -30,280 M40,260 C70,240 100,260 110,280 M40,260 C20,220 40,200 50,190 M40,260 C60,220 40,200 30,190"
                                    stroke="#2bacc1"
                                    strokeWidth="4"
                                    fill="none"
                                />
                            </g>

                            {/* עץ עגול, עציץ נוסף ותחנת אוטובוס עם ספסל */}
                            <g transform="translate(680, 368)">
                                {/* עציץ קטן נוסף משמאל לעץ */}
                                <rect x="-50" y="102" width="20" height="30" fill="#2bacc1" rx="2" />
                                <circle cx="-40" cy="90" r="18" fill="#10808a" />

                                {/* העץ המרכזי */}
                                <circle cx="20" cy="50" r="42" fill="#0f8188" />
                                <rect x="15" y="88" width="10" height="44" fill="#5a3d28" />

                                {/* תחנת האוטובוס והספסל */}
                                <rect x="80" y="32" width="120" height="100" fill="none" stroke="#0f8188" strokeWidth="6" />
                                <rect x="95" y="92" width="70" height="8" fill="#0f8188" />
                                <rect x="105" y="100" width="6" height="32" fill="#0f8188" />
                                <rect x="145" y="100" width="6" height="32" fill="#0f8188" />
                            </g>

                            {/* הרים ימינה בסוף המסלול */}
                            <polygon points="1200,500 1280,390 1360,500" fill="#2bacc1" />
                            <polygon points="1270,500 1340,410 1410,500" fill="#1b8698" />
                        </g>

                        {/* קו הכביש המקווקו הראשי */}
                        <g transform="translate(0, 500)">
                            <line x1="0" y1="0" x2="1400" y2="0" stroke="#777777" strokeWidth="8" strokeDasharray="30 20" />
                        </g>
                    </svg>
                </div>

                {/* 2. הרכב - ממוקם במדויק על הכביש החדש */}
                <div
                    className="car-holder"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        transform: `translateX(${65 - drive * 150}vw) translateY(22vh)`,
                        opacity: 1 - exit,
                        '--spin': `${drive * 1440}deg`,
                        zIndex: 10
                    }}
                >
                    <CarShape />
                </div>

                {/* 3. הכיתוב של הסצנה */}
                <SceneCaption title={SCENES.car.title} text={SCENES.car.text} progress={reveal} />
            </div>
        </section>
    );
}
