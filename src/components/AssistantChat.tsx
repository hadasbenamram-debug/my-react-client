import {useEffect, useRef, useState} from 'react';
import type {FormEvent, KeyboardEvent} from 'react';
import {useLocation} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import useAssistantChat from '../hooks/useAssistantChat';
import type {ChatEntry} from '../hooks/useAssistantChat';
import {getCurrentUser, getToken, mustChangePassword} from '../utils/auth';
import {MAX_MESSAGE_LENGTH} from '../utils/assistantStream';
import AssistantMessageText from './AssistantMessageText';

// העוזר החכם: כפתור צף בכל מסכי /app/... (למשתמש מחובר), שפותח חלון צ'אט.
// התשובה מגיעה בהזרמה מ-api/chat/stream, והעוזר מכיר את הנתונים של התפקיד הפעיל.

type RoleKey = 'admin' | 'volunteer' | 'supplier' | 'ngo' | 'general';

const roleKeyOf = (role: string): RoleKey => {
    if (role === 'admin') return 'admin';
    if (role.includes('volunt')) return 'volunteer';
    if (role.includes('suppl') || role.includes('business')) return 'supplier';
    if (role.includes('ngo') || role.includes('org')) return 'ngo';
    return 'general';
};

// שאלות לדוגמה בחלון הריק - לחיצה שולחת אותן
const SUGGESTIONS: Record<RoleKey, string[]> = {
    volunteer: ['מה המסלול שלי עכשיו?', 'מתי אני זמין/ה השבוע?', 'כמה משלוחים עשיתי החודש?'],
    supplier: ['מה מצב התרומות הפתוחות שלי?', 'מי אוסף את התרומה האחרונה שלי ומתי?', 'עד מתי אפשר לתרום לפני שבת?'],
    ngo: ['אילו תרומות בדרך אלינו?', 'מה שעות הקבלה שלנו?', 'יש חג בקרוב? מה זה אומר לקבלת תרומות?'],
    admin: ['מה מצב המערכת עכשיו?', 'למה תרומות לא שובצו בריצה האחרונה?', 'מי נמצא בדרך עכשיו?'],
    general: ['איך המערכת עובדת?', 'מתי נכנסת השבת?'],
};

const SUBTITLES: Record<RoleKey, string> = {
    volunteer: 'מכיר את המסלולים והזמינות שלך',
    supplier: 'מכיר את התרומות שלך',
    ngo: 'מכיר את התרומות שבדרך אליכם',
    admin: 'מכיר את מצב המערכת ומנוע השידוכים',
    general: 'עונה על שאלות על המערכת',
};

function MessageBubble({entry, onNavigate}: {entry: ChatEntry; onNavigate: () => void}) {
    const mine = entry.role === 'user';

    return (
        <Box
            sx={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                px: 1.75,
                py: 1.25,
                borderRadius: '16px',
                bgcolor: mine ? 'primary.main' : '#f6f8f8',
                border: mine ? 'none' : '1px solid #dcebe9',
                fontSize: '0.92rem',
                lineHeight: 1.55,
                whiteSpace: mine ? 'pre-wrap' : 'normal',
                overflowWrap: 'anywhere',
            }}
        >
            {mine ? entry.text : <AssistantMessageText text={entry.text} onNavigate={onNavigate} />}

            {entry.status && (
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: entry.text ? 0.75 : 0, color: 'text.secondary'}}>
                    <CircularProgress size={14} thickness={5} />
                    <Typography variant="caption">{entry.status}</Typography>
                </Box>
            )}

            {entry.stopped && !entry.error && (
                <Typography variant="caption" color="text.secondary" component="div" sx={{mt: 0.5}}>
                    (התשובה נעצרה)
                </Typography>
            )}

            {entry.error && (
                <Alert severity="warning" sx={{mt: entry.text ? 1 : 0, py: 0, fontSize: '0.85rem'}}>
                    {entry.error}
                </Alert>
            )}
        </Box>
    );
}

export default function AssistantChat() {
    // מתעדכן בכל מעבר מסך (למשל אחרי התחברות או החלפת סיסמה)
    useLocation();

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const {entries, busy, send, stop, reset} = useAssistantChat();
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const list = listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [entries, open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const user = getCurrentUser();
    const role = String(user.role || user.type || 'guest').toLowerCase();

    // רק למשתמש מחובר שכבר החליף את הסיסמה הזמנית (השרת ממילא דוחה אחרים)
    if (!getToken() || role === 'guest' || mustChangePassword()) return null;

    const roleKey = roleKeyOf(role);
    const closeOnSmallScreen = () => {
        if (window.matchMedia('(max-width: 600px)').matches) setOpen(false);
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

    // Enter שולח, Shift+Enter שורה חדשה
    const onInputKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            ask(input);
        }
    };

    if (!open) {
        return (
            <Tooltip title="העוזר החכם" placement="top">
                <Fab
                    color="primary"
                    aria-label="פתיחת העוזר החכם"
                    onClick={() => setOpen(true)}
                    sx={{position: 'fixed', bottom: {xs: 16, md: 24}, insetInlineEnd: {xs: '16px', md: '24px'}, zIndex: 40}}
                >
                    <AutoAwesomeIcon />
                </Fab>
            </Tooltip>
        );
    }

    return (
        <Paper
            elevation={8}
            role="dialog"
            aria-label="העוזר החכם"
            onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false);
            }}
            sx={{
                position: 'fixed',
                bottom: {xs: 12, md: 24},
                insetInlineEnd: {xs: '12px', md: '24px'},
                width: {xs: 'calc(100vw - 24px)', sm: 390},
                height: {xs: 'min(72vh, 560px)', sm: 'min(76vh, 600px)'},
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 40,
                border: '1px solid #dcebe9',
            }}
        >
            {/* כותרת */}
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: '#dcebe9'}}>
                <AutoAwesomeIcon sx={{color: 'primary.dark'}} />
                <Box sx={{flex: 1, minWidth: 0}}>
                    <Typography sx={{fontWeight: 500, lineHeight: 1.2}}>העוזר של לתת באהבה</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {SUBTITLES[roleKey]}
                    </Typography>
                </Box>
                <Tooltip title="שיחה חדשה">
                    <span>
                        <IconButton size="small" onClick={reset} disabled={entries.length === 0} aria-label="שיחה חדשה">
                            <RestartAltIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <IconButton size="small" onClick={() => setOpen(false)} aria-label="סגירת העוזר">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* ההודעות */}
            <Box
                ref={listRef}
                aria-live="polite"
                sx={{flex: 1, overflowY: 'auto', px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25}}
            >
                {entries.length === 0 ? (
                    <Box sx={{textAlign: 'center', mt: 3, px: 1}}>
                        <Typography sx={{mb: 0.5}}>שלום! במה אפשר לעזור?</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                            אפשר לשאול על הנתונים שלך במערכת, על שבת וחגים, ואיך עושים דברים באתר.
                        </Typography>
                        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
                            {SUGGESTIONS[roleKey].map((question) => (
                                <Chip key={question} label={question} variant="outlined" onClick={() => ask(question)} />
                            ))}
                        </Box>
                    </Box>
                ) : (
                    entries.map((entry) => <MessageBubble key={entry.id} entry={entry} onNavigate={closeOnSmallScreen} />)
                )}
            </Box>

            {/* שדה השאלה */}
            <Box component="form" onSubmit={onSubmit} sx={{borderTop: '1px solid #dcebe9', px: 1.5, pt: 1.25, pb: 1}}>
                <Box sx={{display: 'flex', alignItems: 'flex-end', gap: 1}}>
                    <TextField
                        inputRef={inputRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={onInputKeyDown}
                        placeholder="כתבו שאלה..."
                        multiline
                        maxRows={4}
                        size="small"
                        slotProps={{htmlInput: {maxLength: MAX_MESSAGE_LENGTH, 'aria-label': 'שאלה לעוזר'}}}
                    />
                    {busy ? (
                        <Tooltip title="עצירת התשובה">
                            <IconButton onClick={stop} color="primary" aria-label="עצירת התשובה">
                                <StopCircleIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <IconButton type="submit" color="primary" disabled={!input.trim()} aria-label="שליחה">
                            <SendIcon sx={{transform: 'scaleX(-1)'}} />
                        </IconButton>
                    )}
                </Box>
                <Typography variant="caption" color="text.secondary" component="div" sx={{mt: 0.75, textAlign: 'center'}}>
                    העוזר רק מציג מידע ויכול לטעות. פעולות עושים במסכים עצמם.
                </Typography>
            </Box>
        </Paper>
    );
}
