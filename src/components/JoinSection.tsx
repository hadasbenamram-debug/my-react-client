import {useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {getCurrentUser, getToken} from '../utils/auth';
import useHeaderOverScene from '../hooks/useHeaderOverScene';

// תיקון 56: סוף דף הבית - "אנו מזמינים אתכם להצטרף לקהילה שלנו".
// רקע טורקיז בהיר, עיגול גדול בקו דק (הקשתות שלו מתחילות כבר מתחת לכיפה של "ההשפעה שלנו בשטח"),
// כותרת בין שני קווים, טקסט ממורכז וכפתורים מעוגלים (pills) להרשמה לכל תפקיד.
// מעבר עם העכבר על כפתור של תפקיד מציג מתחת לכפתורים הסבר קצר עליו.
// לאורחים בלבד - משתמש מחובר כבר רשום.

interface JoinLink {
    key: string;
    label: string;
    to: string;
    /** הסבר קצר שמוצג במעבר עם העכבר (רק לכפתורי התפקידים) */
    text?: string;
}

const ROLE_LINKS: JoinLink[] = [
    {
        key: 'supplier',
        label: 'ספקים ותורמים',
        to: '/app/register-supplier',
        text: 'מסעדה, מאפייה, קייטרינג או מכולת? מפרסמים בדקה מה נשאר (אפשר גם לצלם), והמערכת מוצאת מתנדב ועמותה.',
    },
    {
        key: 'volunteer',
        label: 'מתנדבים עם רכב',
        to: '/app/register-volunteer',
        text: 'בוחרים שעות פנויות בשבוע ומקבלים בקשת איסוף קרובה, עם מסלול מוכן וניווט בלחיצה.',
    },
    {
        key: 'ngo',
        label: 'עמותות',
        to: '/app/register-ngo',
        text: 'מגדירים שעות קבלה וקיבולת יומית, ומקבלים מזון טרי עם מעקב חי אחרי המתנדב שבדרך.',
    },
];

const MORE_LINKS: JoinLink[] = [
    {key: 'login', label: 'כבר רשומים? כניסה', to: '/app/login'},
    {key: 'contact', label: 'יש שאלה? צרו קשר', to: '/contact'},
];

const HINT = 'העבירו את העכבר על אחד התפקידים כדי לשמוע עוד - ולחצו כדי להירשם.';

export default function JoinSection() {
    const loggedIn = !!getToken() && String(getCurrentUser().role || 'guest').toLowerCase() !== 'guest';
    const ref = useRef<HTMLElement>(null);
    const [active, setActive] = useState<string | null>(null);

    useHeaderOverScene(ref, 'on-sky-join', !loggedIn);

    if (loggedIn) return null;

    const activeRole = ROLE_LINKS.find((link) => link.key === active);

    const pill = (link: JoinLink) => (
        <Link
            key={link.key}
            to={link.to}
            className={`join-pill ${link.key === active ? 'is-active' : ''}`}
            onMouseEnter={link.text ? () => setActive(link.key) : undefined}
            onMouseLeave={link.text ? () => setActive(null) : undefined}
            onFocus={link.text ? () => setActive(link.key) : undefined}
            onBlur={link.text ? () => setActive(null) : undefined}
        >
            {link.label}
        </Link>
    );

    return (
        <section className="join" id="join" ref={ref}>
            <span className="join-ring" aria-hidden="true" />

            <div className="join-content">
                <div className="join-heading">
                    <h2 className="join-title">אנו מזמינים אתכם להצטרף לקהילה שלנו</h2>
                </div>

                <p className="join-lead">עשייה מרגשת מכל כיוון</p>
                <p className="join-text">
                    מסעדה שנשאר לה אוכל טוב בסוף היום, מתנדב עם רכב ושעה פנויה, ועמותה שמחלקת מזון למשפחות -
                    <br />
                    כל אחד מגיע מכיוון אחר, וכולם נפגשים באותה מטרה.
                    <br />
                    <strong>ההצטרפות לוקחת דקה, והמערכת דואגת לשאר: התאמה, מסלול ומעקב חי.</strong>
                    <br />
                    בחרו איך אתם רוצים לקחת חלק:
                </p>

                <nav className="join-pills" aria-label="הצטרפות">
                    <div className="join-pills-row">{ROLE_LINKS.map(pill)}</div>
                    <div className="join-pills-row">{MORE_LINKS.map(pill)}</div>
                </nav>

                <p className={`join-detail ${activeRole ? 'is-active' : ''}`} aria-live="polite">
                    {activeRole ? <><strong>{activeRole.label}:</strong> {activeRole.text}</> : HINT}
                </p>
            </div>
        </section>
    );
}
