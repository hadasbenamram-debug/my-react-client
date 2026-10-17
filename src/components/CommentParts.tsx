import {useState, type ChangeEvent, type FormEvent} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

// תגובה רקורסיבית (עץ תגובות).
// inline=true: כפתור "הגב" פותח שדה תגובה בתוך התגובה, ו-onReply(commentId, text)
// inline=false: כפתור "הגב" רק מעדכן את הדף (onReply(commentId, authorName)) והשדה נמצא בתחתית הדף
/** תגובה כפי שמגיעה מהשרת - השמות משתנים בין endpoints (camelCase / PascalCase) */
export interface CommentNode {
    id: number;
    author?: string;
    Author?: string;
    authorName?: string;
    content?: string;
    Content?: string;
    text?: string;
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

    return (
        <Box
            sx={{
                mt: 1.5,
                p: 2,
                borderRadius: 3,
                bgcolor: depth % 2 === 0 ? '#f4f9f8' : '#ffffff',
                border: '1px solid',
                borderColor: 'divider',
                borderInlineStart: '3px solid',
                borderInlineStartColor: 'primary.main',
                // הזחה מתונה בלבד, כדי ששרשורים עמוקים לא ייצאו מהמסך
                ml: 0,
                mr: 0,
                marginInlineStart: depth > 0 ? {xs: 1.5, md: 3} : 0,
            }}
        >
            <Typography sx={{fontWeight: 700, fontSize: '0.9rem', mb: 0.5}}>{authorName}</Typography>
            <Typography sx={{color: 'text.primary'}}>{content}</Typography>

            <Button
                size="small"
                variant="text"
                sx={{mt: 0.5, px: 0, minWidth: 0, letterSpacing: 0}}
                onClick={() => (inline ? setShowReplyInput(!showReplyInput) : onReply(comment.id, authorName))}
            >
                {inline && showReplyInput ? 'ביטול' : 'הגב'}
            </Button>

            {inline && showReplyInput ? (
                <Box component="form" onSubmit={handleSendReply} sx={{display: 'flex', gap: 1, mt: 1}}>
                    <TextField
                        size="small"
                        value={replyText}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setReplyText(e.target.value)}
                        placeholder={`הגב ל-${authorName}...`}
                    />
                    <Button type="submit" variant="contained" size="small" sx={{px: 2.5}}>
                        שלח
                    </Button>
                </Box>
            ) : null}

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
        </Box>
    );
}
