import {useEffect, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import type {ReactNode} from 'react';
import {useLocation} from 'react-router-dom';
import useAssistantChat from '../hooks/useAssistantChat';
import type {ChatEntry} from '../hooks/useAssistantChat';
import {useAppSelector} from '../store';
import {selectActiveRole, selectCurrentUser, selectIsLoggedIn} from '../store/authSlice';
import {MAX_MESSAGE_LENGTH} from '../utils/assistantStream';
import AssistantMessageText from './AssistantMessageText';
import '../styles/assistant-chat.css';

// העוזר החכם: כפתור צף בכל מסכי /app/... (למשתמש מחובר), שפותח חלון צ'אט.
// התשובה מגיעה בהזרמה מ-api/chat/stream, והעוזר מכיר את הנתונים של התפקיד הפעיל.
// תיקון 66: עיצוב חדש (כפתור "שאלו את לתת באהבה", חלון כהה-טורקיז וכרטיסי שאלות מהירות).
// הלוגיקה (ההזרמה, ההיסטוריה, העצירה) לא השתנתה - היא ב-useAssistantChat.

type RoleKey = 'admin' | 'volunteer' | 'supplier' | 'ngo' | 'general';
type IconKey = 'route' | 'clock' | 'box' | 'people' | 'car' | 'question' | 'calendar' | 'pulse';

const roleKeyOf = (role: string): RoleKey => {
    if (role === 'admin') return 'admin';
    if (role.includes('volunt')) return 'volunteer';
    if (role.includes('suppl') || role.includes('business')) return 'supplier';
    if (role.includes('ngo') || role.includes('org')) return 'ngo';
    return 'general';
};

interface Suggestion {
    /** השאלה שנשלחת לעוזר */
    question: string;
    /** שורת הסבר קטנה מתחת לשאלה */
    hint: string;
    icon: IconKey;
}

// שאלות לדוגמה בחלון הריק - לחיצה שולחת אותן
const SUGGESTIONS: Record<RoleKey, Suggestion[]> = {
    volunteer: [
        {question: 'מה המסלול שלי עכשיו?', hint: 'המסלול הפעיל שלך', icon: 'route'},
        {question: 'מתי אני זמין/ה השבוע?', hint: 'המשמרות שהגדרת', icon: 'clock'},
        {question: 'כמה משלוחים עשיתי החודש?', hint: 'סיכום הפעילות שלך', icon: 'car'},
    ],
    supplier: [
        {question: 'מה מצב התרומות הפתוחות שלי?', hint: 'מה ממתין ומה בדרך', icon: 'box'},
        {question: 'מי אוסף את התרומה האחרונה שלי ומתי?', hint: 'מתנדב וזמן הגעה', icon: 'car'},
        {question: 'עד מתי אפשר לתרום לפני שבת?', hint: 'זמני שבת', icon: 'clock'},
    ],
    ngo: [
        {question: 'אילו תרומות בדרך אלינו?', hint: 'תרומות שבדרך אליכם', icon: 'box'},
        {question: 'מה שעות הקבלה שלנו?', hint: 'שעות פעילות העמותה', icon: 'clock'},
        {question: 'יש חג בקרוב? מה זה אומר לקבלת תרומות?', hint: 'חגים וקבלת תרומות', icon: 'calendar'},
    ],
    admin: [
        {question: 'מה מצב המערכת עכשיו?', hint: 'תמונת מצב כללית', icon: 'pulse'},
        {question: 'למה תרומות לא שובצו בריצה האחרונה?', hint: 'מנוע השידוכים', icon: 'question'},
        {question: 'מי נמצא בדרך עכשיו?', hint: 'מסלולים פעילים', icon: 'car'},
    ],
    general: [
        {question: 'איך המערכת עובדת?', hint: 'הסבר קצר על האתר', icon: 'question'},
        {question: 'מתי נכנסת השבת?', hint: 'זמני שבת', icon: 'calendar'},
    ],
};

// אייקוני הכרטיסים (קווים, בסגנון הכרטיסים בעיצוב)
const ICONS: Record<IconKey, ReactNode> = {
    box: <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4" />,
    people: (
        <>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
            <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.1.8 3.5 2.7 3.5 5.7" />
        </>
    ),
    car: (
        <>
            <path d="M3 15v-3l2.2-5.5A2 2 0 0 1 7.1 5h9.8a2 2 0 0 1 1.9 1.5L21 12v3" />
            <path d="M3 15h18v3H3zM6 18v2M18 18v2M3 12h18" />
            <circle cx="7.5" cy="15" r=".6" />
            <circle cx="16.5" cy="15" r=".6" />
        </>
    ),
    route: (
        <>
            <circle cx="6" cy="19" r="2" />
            <circle cx="18" cy="5" r="2" />
            <path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    calendar: (
        <>
            <rect x="3.5" y="5" width="17" height="15" rx="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
        </>
    ),
    pulse: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
    question: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01" />
        </>
    ),
};

// תיקון 69: תאריך ושעה בשעון ישראל. באותו יום "היום", ביום שלפני "אתמול", ובשאר ימי השבוע הנוכחי
// (שבוע = מיום א') שם היום - "יום ב'". רק הודעה משבוע שעבר ומעלה מקבלת תאריך מלא: "09.11.2026".
const DAY_NAMES = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'", "יום ו'", 'שבת'];
const DAY_MS = 24 * 60 * 60 * 1000;
const israelParts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jerusalem',
});

const partsOf = (at: number) => {
    const p: Record<string, string> = {};
    for (const part of israelParts.formatToParts(new Date(at))) p[part.type] = part.value;
    // מספר הימים מאז 1970 לפי תאריך ישראל, ויום בשבוע (0 = יום א')
    const dayNumber = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / DAY_MS;
    return {
        year: p.year ?? '',
        month: p.month ?? '',
        day: p.day ?? '',
        hour: p.hour ?? '',
        minute: p.minute ?? '',
        dayNumber,
        weekday: new Date(dayNumber * DAY_MS).getUTCDay(),
    };
};

const formatSentAt = (at: number, now: number = Date.now()): string => {
    const msg = partsOf(at);
    const today = partsOf(now);
    const time = `${msg.hour}:${msg.minute}`;
    const daysAgo = today.dayNumber - msg.dayNumber;
    const weekStart = today.dayNumber - today.weekday;

    let day: string;
    if (daysAgo === 0) day = 'היום';
    else if (daysAgo === 1) day = 'אתמול';
    else if (msg.dayNumber >= weekStart && daysAgo > 0) day = DAY_NAMES[msg.weekday];
    else day = `${msg.day}.${msg.month}.${msg.year}`;

    return `${day}, ${time}`;
};

// הודעה שלך: V אחד = נשלחה. שני V = העוזר קרא אותה והתחיל לענות
// (או שסיים / נעצר בלי שגיאה). אם השליחה נכשלה - נשאר V אחד.
// הודעה של העוזר: V אחד = התשובה הגיעה (או עוד מוקרנת / החלון סגור).
// שני V = התשובה הסתיימה והחלון פתוח, כלומר ראית אותה (ראו seenIds ב-AssistantChat).
const wasSeen = (next: ChatEntry | undefined): boolean =>
    !!next && (next.text !== '' || (!next.streaming && !next.error));

interface TicksProps {
    seen: boolean;
}

function Ticks({seen}: TicksProps) {
    return (
        <svg
            className={`lb-ticks${seen ? ' seen' : ''}`}
            viewBox="0 0 20 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label={seen ? 'נקרא' : 'נשלח'}
        >
            <title>{seen ? 'נקרא' : 'נשלח'}</title>
            <path d="M1.5 6.5l3.5 3.5L11.5 2" />
            {seen && <path d="M8 9.2l1 .8L15.5 2" />}
        </svg>
    );
}

interface MessageBubbleProps {
    entry: ChatEntry;
    onNavigate: () => void;
    seen: boolean;
}

function MessageBubble({entry, onNavigate, seen}: MessageBubbleProps) {
    const mine = entry.role === 'user';

    const showMeta = mine || entry.text || entry.error;

    return (
        <div className={`lb-item ${mine ? 'user' : 'bot'}`}>
        <div className={`lb-msg ${mine ? 'user' : 'bot'}`}>
            {mine ? (
                entry.text
            ) : (
                entry.text && (
                    <div className="lb-msg-text">
                        <AssistantMessageText text={entry.text} onNavigate={onNavigate} />
                    </div>
                )
            )}

            {entry.status && (
                <div className="lb-status">
                    <span className="lb-spinner" aria-hidden="true" />
                    <span>{entry.status}</span>
                </div>
            )}

            {entry.stopped && !entry.error && <div className="lb-stopped">(התשובה נעצרה)</div>}

            {entry.error && <div className="lb-error" role="alert">{entry.error}</div>}

        </div>

            {/* תיקון 69: תאריך ושעה, ו-V אחד (נשלח / הגיע) או שניים (נקרא) - צמוד מתחת לבועה, על רקע הצ'אט */}
            {showMeta && (
                <div className="lb-meta">
                    <time dateTime={new Date(entry.at).toISOString()}>{formatSentAt(entry.at)}</time>
                    <Ticks seen={seen} />
                </div>
            )}
        </div>
    );
}

export default function AssistantChat() {
    // מתעדכן בכל מעבר מסך ובכל שינוי בסשן (Redux) - למשל אחרי התחברות או החלפת סיסמה
    useLocation();
    const loggedIn = useAppSelector(selectIsLoggedIn);
    const role = useAppSelector(selectActiveRole);
    const mustChangePassword = useAppSelector(selectCurrentUser).mustChangePassword === true;

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const {entries, busy, send, stop, reset} = useAssistantChat();
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const wasOpen = useRef(false);
    // תיקון 68: תשובות של העוזר שכבר הסתיימו בזמן שהחלון היה פתוח - אלה מסומנות "נקראו" (שני V)
    const [seenIds, setSeenIds] = useState<ReadonlySet<number>>(() => new Set());

    useEffect(() => {
        const list = listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [entries, open]);

    useEffect(() => {
        if (!open) return;
        const finished = entries.filter((e) => e.role === 'assistant' && !e.streaming && !seenIds.has(e.id));
        if (finished.length > 0) setSeenIds(new Set([...seenIds, ...finished.map((e) => e.id)]));
    }, [entries, open, seenIds]);

    // פתיחה - הפוקוס לשדה הכתיבה. סגירה - הפוקוס חוזר לכפתור (לא בטעינה הראשונה של הדף)
    useEffect(() => {
        if (open) inputRef.current?.focus();
        else if (wasOpen.current) launcherRef.current?.focus();
        wasOpen.current = open;
    }, [open]);

    // רק למשתמש מחובר שכבר החליף את הסיסמה הזמנית (השרת ממילא דוחה אחרים)
    if (!loggedIn || mustChangePassword) return null;

    const roleKey = roleKeyOf(role);
    const closeOnSmallScreen = () => {
        if (window.matchMedia('(max-width: 480px)').matches) setOpen(false);
    };

    const ask = (question: string) => {
        if (!question.trim() || busy) return;
        send(question);
        setInput('');
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        ask(input);
    };

    return (
        <div className="lb-root">
            {/* הכפתור הצף */}
            <button
                ref={launcherRef}
                type="button"
                className={`lb-launcher${open ? ' hide' : ''}`}
                aria-label="פתיחת העוזר החכם של לתת באהבה"
                aria-expanded={open}
                tabIndex={open ? -1 : 0}
                onClick={() => setOpen(true)}
            >
                <span className="lb-launcher-texts">
                    <span className="lb-launcher-title">שאלו את לתת באהבה</span>
                    <span className="lb-launcher-sub">כאן כדי לחבר ולעזור</span>
                </span>
                <span className="lb-launcher-icon">
                    {/* בועת דיבור עם לב */}
                    <svg viewBox="0 0 32 32" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M16 4C9.4 4 4.5 8.4 4.5 13.8c0 2.6 1.1 4.8 2.9 6.5L5.6 26l5.9-2.6c1.4.4 2.9.6 4.5.6 6.6 0 11.5-4.4 11.5-9.8S22.6 4 16 4z" />
                        <path d="M16 18.3l-3.4-3.3a2.3 2.3 0 0 1 3.4-3.1 2.3 2.3 0 0 1 3.4 3.1z" fill="#fff" stroke="none" />
                    </svg>
                </span>
            </button>

            {/* חלון הצ'אט */}
            <section
                className={`lb-panel${open ? ' open' : ''}`}
                role="dialog"
                aria-label="העוזר החכם של לתת באהבה"
                aria-hidden={!open}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') setOpen(false);
                }}
            >
                <header className="lb-head">
                    <div className="lb-bot-icon">
                        <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
                        </svg>
                    </div>
                    <div className="lb-head-texts">
                        <div className="lb-head-name">לתת באהבה AI</div>
                        <div className="lb-head-status"><i /> זמין עכשיו</div>
                    </div>
                    <button
                        type="button"
                        className="lb-head-btn"
                        onClick={reset}
                        disabled={entries.length === 0}
                        aria-label="שיחה חדשה"
                        title="שיחה חדשה"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4.5H8" />
                        </svg>
                    </button>
                    <button type="button" className="lb-head-btn" onClick={() => setOpen(false)} aria-label="סגירת העוזר">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </header>

                <div className="lb-msgs" ref={listRef} aria-live="polite">
                    {entries.length === 0 ? (
                        <>
                            <div className="lb-msg bot">
                                שלום! אני העוזר של לתת באהבה. אפשר לשאול אותי על הנתונים שלך במערכת, על שבת וחגים, ואיך עושים דברים באתר. במה אפשר לעזור?
                            </div>
                            <div className="lb-options">
                                {SUGGESTIONS[roleKey].map((item) => (
                                    <button key={item.question} type="button" className="lb-opt" onClick={() => ask(item.question)}>
                                        <span className="lb-opt-icon">
                                            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[item.icon]}</svg>
                                        </span>
                                        <span className="lb-opt-texts">
                                            <div className="lb-opt-title">{item.question}</div>
                                            <div className="lb-opt-sub">{item.hint}</div>
                                        </span>
                                        <svg className="lb-opt-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        entries.map((entry, index) => (
                            <MessageBubble
                                key={entry.id}
                                entry={entry}
                                onNavigate={closeOnSmallScreen}
                                seen={entry.role === 'user' ? wasSeen(entries[index + 1]) : seenIds.has(entry.id)}
                            />
                        ))
                    )}
                </div>

                <form className="lb-form" autoComplete="off" onSubmit={onSubmit}>
                    <input
                        ref={inputRef}
                        className="lb-input"
                        type="text"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="כתבו לי כאן..."
                        aria-label="שאלה לעוזר"
                        maxLength={MAX_MESSAGE_LENGTH}
                    />
                    {busy ? (
                        <button type="button" className="lb-send stop" onClick={stop} aria-label="עצירת התשובה" title="עצירת התשובה">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3" /></svg>
                        </button>
                    ) : (
                        <button type="submit" className="lb-send" disabled={!input.trim()} aria-label="שליחה">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3L3 10.5l7 3 3 7z" /><path d="M10 13.5L21 3" /></svg>
                        </button>
                    )}
                </form>
                <div className="lb-note">העוזר רק מציג מידע ויכול לטעות. פעולות עושים במסכים עצמם.</div>
            </section>
        </div>
    );
}
