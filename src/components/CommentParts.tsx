import {useState, type FormEvent, type ReactNode} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined';
import {formatDateTime, formatRelativeTime} from '../utils/format';

// תגובה רקורסיבית (עץ תגובות).
// תיקון 15: עיצוב חדש - במקום קופסאות מקוננות עם מסגרת עבה: אות/ראשי תיבות של הכותב, שם וזמן בשורה אחת,
// הטקסט בבועה רכה, ותשובות בהזחה קלה עם קו שרשור דק (בלי להיכנס עוד ועוד פנימה בשרשורים עמוקים).
//
// inline=true: כפתור "הגבה" פותח שדה תגובה בתוך התגובה, ו-onReply(commentId, text)
// inline=false: כפתור "הגבה" רק מעדכן את הדף (onReply(commentId, authorName)) והשדה נמצא בתחתית הדף
/** תגובה כפי שמגיעה מהשרת - השמות משתנים בין endpoints (camelCase / PascalCase) */
export interface CommentNode {
    id: number;
    author?: string;
    Author?: string;
    authorName?: string;
    content?: string;
    Content?: string;
    text?: string;
    createdAt?: string;
    replies?: CommentNode[];
    children?: CommentNode[];
}

/**
 * inline=true:  value = טקסט התגובה החדשה
 * inline=false: value = שם כותב התגובה שאליה עונים
 */
export type CommentReplyHandler = (commentId: number, value: string) => void;

export interface CommentItemProps {
    comment: CommentNode;
    onReply: CommentReplyHandler;
    inline?: boolean;
    defaultAuthor?: string;
    depth?: number;
}

// גוונים רכים מתוך הפלטה של האתר (טורקיז / מנטה), עם טקסט כהה מספיק לקריאות
const AVATAR_TONES = [
    {bg: '#dcebe9', fg: '#0e6f73'},
    {bg: '#d6ecf3', fg: '#155e75'},
    {bg: '#ece7dc', fg: '#6b5528'},
    {bg: '#e6e6e6', fg: '#33383a'},
];

const toneFor = (name: string) => {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
    return AVATAR_TONES[hash % AVATAR_TONES.length];
};

const initialsOf = (name: string) =>
    name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('') || '?';

/** עיגול עם ראשי התיבות של הכותב - אותו צבע תמיד לאותו שם */
export function CommentAvatar({name, size = 36}: {name: string; size?: number}) {
    const tone = toneFor(name);
    return (
        <Box
            aria-hidden
            sx={{
                width: size, height: size, flexShrink: 0, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                bgcolor: tone.bg, color: tone.fg,
                fontWeight: 700, fontSize: size * 0.4, lineHeight: 1,
            }}
        >
            {initialsOf(name)}
        </Box>
    );
}

/** שורת תגובה: אווטאר, שם וזמן, והטקסט בבועה. children - פעולות מתחת לבועה */
export function CommentRow({authorName, text, createdAt, children}: {
    authorName: string; text?: string; createdAt?: string; children?: ReactNode;
}) {
    return (
        <Box sx={{display: 'flex', gap: 1.5, alignItems: 'flex-start'}}>
            <CommentAvatar name={authorName} />
            <Box sx={{flex: 1, minWidth: 0}}>
                <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap'}}>
                    <Typography component="span" sx={{fontWeight: 600, fontSize: '0.95rem'}}>{authorName}</Typography>
                    {createdAt && (
                        <Typography component="time" variant="caption" color="text.secondary"
                            dateTime={createdAt} title={formatDateTime(createdAt)}>
                            {formatRelativeTime(createdAt)}
                        </Typography>
                    )}
                </Box>
                <Box
                    sx={{
                        mt: 0.5, px: 1.75, py: 1.1,
                        bgcolor: '#f2f7f6',
                        borderRadius: '14px',
                        // הפינה ליד האווטאר חדה - כמו בועת שיחה
                        borderStartStartRadius: '4px',
                    }}
                >
                    <Typography sx={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6}}>{text}</Typography>
                </Box>
                {children}
            </Box>
        </Box>
    );
}

// מעבר לעומק הזה התשובות כבר לא זזות פנימה (שלא יידחקו בטלפון)
const MAX_INDENT_DEPTH = 3;

export function CommentItem({comment, onReply, inline = false, defaultAuthor = 'אורח', depth = 0}: CommentItemProps) {
    const authorName = comment.author || comment.Author || comment.authorName || defaultAuthor;
    const content = comment.content || comment.Content || comment.text;
    const replies: CommentNode[] = comment.replies || comment.children || [];

    const [replyText, setReplyText] = useState<string>('');
    const [showReplyInput, setShowReplyInput] = useState<boolean>(false);

    const handleSendReply = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!replyText.trim()) {
            return;
        }
        onReply(comment.id, replyText);
        setReplyText('');
        setShowReplyInput(false);
    };

    const indent = depth < MAX_INDENT_DEPTH;

    return (
        <Box component="article">
            <CommentRow authorName={authorName} text={content} createdAt={comment.createdAt}>
                {!showReplyInput && (
                    <Button
                        size="small"
                        variant="text"
                        startIcon={<ReplyOutlinedIcon sx={{transform: 'scaleX(-1)'}} />}
                        sx={{mt: 0.25, px: 0.5, py: 0.25, minWidth: 0, letterSpacing: 0, color: 'text.secondary', fontWeight: 500}}
                        onClick={() => (inline ? setShowReplyInput(true) : onReply(comment.id, authorName))}
                    >
                        הגבה
                    </Button>
                )}

                {inline && showReplyInput && (
                    <Box component="form" onSubmit={handleSendReply} sx={{mt: 1}}>
                        <TextField
                            size="small"
                            multiline
                            minRows={1}
                            maxRows={4}
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`תשובה ל${authorName}...`}
                            slotProps={{htmlInput: {maxLength: 1000, 'aria-label': `תשובה ל${authorName}`}}}
                        />
                        <Stack direction="row" spacing={1} sx={{mt: 1}}>
                            <Button type="submit" variant="contained" size="small" disabled={!replyText.trim()} sx={{px: 2.5, py: 0.6}}>
                                שליחה
                            </Button>
                            <Button variant="text" size="small" sx={{px: 1.5, py: 0.6}}
                                onClick={() => { setShowReplyInput(false); setReplyText(''); }}>
                                ביטול
                            </Button>
                        </Stack>
                    </Box>
                )}
            </CommentRow>

            {replies.length > 0 && (
                <Stack
                    spacing={2}
                    sx={{
                        mt: 2,
                        // קו שרשור דק מתחת לאווטאר של התגובה שאליה עונים
                        marginInlineStart: indent ? '17px' : 0,
                        paddingInlineStart: indent ? {xs: '14px', sm: '24px'} : 0,
                        borderInlineStart: indent ? '2px solid #dcebe9' : 'none',
                    }}
                >
                    {replies.map((child, index) => (
                        <CommentItem
                            key={child.id || index}
                            comment={child}
                            onReply={onReply}
                            inline={inline}
                            defaultAuthor={defaultAuthor}
                            depth={depth + 1}
                        />
                    ))}
                </Stack>
            )}
        </Box>
    );
}
