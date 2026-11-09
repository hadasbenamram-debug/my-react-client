import type {ReactNode} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

// תצוגת תשובה של העוזר: שורות, רשימות ("- "), הדגשה (**...**) וקישורים למסכים ([שם](/app/...)).
// בלי dangerouslySetInnerHTML: הטקסט מהמודל אף פעם לא נכנס לדף כ-HTML.
// קישור הופך ללחיץ רק אם הוא למסך פנימי באתר (מתחיל ב-/ ולא ב-//). כל קישור אחר מוצג כטקסט רגיל.

interface AssistantMessageTextProps {
    text: string;
    /** נקרא כשלוחצים על קישור למסך (למשל לסגירת החלון בטלפון) */
    onNavigate?: () => void;
}

const INLINE = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*/g;
// רשימה עם תבליטים. רשימה ממוספרת ("1. ...") נשארת שורה רגילה, כדי לא לאבד את המספרים
const BULLET = /^\s*[-*•]\s+/;
const HEADING = /^\s*#{1,6}\s+/;

const isInternalPath = (href: string) => href.startsWith('/') && !href.startsWith('//');

function renderInline(line: string, keyPrefix: string, onNavigate?: () => void): ReactNode[] {
    const parts: ReactNode[] = [];
    let last = 0;
    let index = 0;

    for (const match of line.matchAll(INLINE)) {
        const start = match.index ?? 0;
        if (start > last) parts.push(line.slice(last, start));

        const [, label, href, bold] = match;
        const key = `${keyPrefix}-${index++}`;

        if (bold !== undefined) {
            parts.push(<strong key={key}>{bold}</strong>);
        } else if (label !== undefined && href !== undefined && isInternalPath(href)) {
            parts.push(
                <Link key={key} component={RouterLink} to={href} onClick={onNavigate} sx={{fontWeight: 500}}>
                    {label}
                </Link>,
            );
        } else {
            parts.push(label ?? match[0]);
        }

        last = start + match[0].length;
    }

    if (last < line.length) parts.push(line.slice(last));
    return parts;
}

export default function AssistantMessageText({text, onNavigate}: AssistantMessageTextProps) {
    const blocks: ReactNode[] = [];
    let bullets: ReactNode[] = [];

    const flushBullets = () => {
        if (bullets.length === 0) return;
        blocks.push(
            <Box component="ul" key={`ul-${blocks.length}`} sx={{m: 0, mb: 0.5, paddingInlineStart: 2.5}}>
                {bullets}
            </Box>,
        );
        bullets = [];
    };

    text.split('\n').forEach((rawLine, i) => {
        const line = rawLine.trimEnd();

        if (BULLET.test(line)) {
            bullets.push(<li key={`li-${i}`}>{renderInline(line.replace(BULLET, ''), `li-${i}`, onNavigate)}</li>);
            return;
        }

        flushBullets();
        if (line.trim() === '') return;

        const isHeading = HEADING.test(line);
        const content = renderInline(line.replace(HEADING, ''), `p-${i}`, onNavigate);
        blocks.push(
            <Box component="p" key={`p-${i}`} sx={{m: 0, mb: 0.5}}>
                {isHeading ? <strong>{content}</strong> : content}
            </Box>,
        );
    });

    flushBullets();
    return <>{blocks}</>;
}
