import {useCallback, useEffect, useRef, useState} from 'react';
import {getCurrentUser} from '../utils/auth';
import {MAX_MESSAGE_LENGTH, streamAssistantAnswer} from '../utils/assistantStream';
import type {AssistantMessage, AssistantRole} from '../utils/assistantStream';

/** הודעה כפי שהיא מוצגת בחלון הצ'אט */
export interface ChatEntry {
    id: number;
    role: AssistantRole;
    text: string;
    /** "חושב..." / "בודק את התרומות שלך..." - בזמן שהתשובה עוד לא התחילה או שכלי רץ */
    status?: string;
    error?: string;
    streaming?: boolean;
    stopped?: boolean;
}

export interface UseAssistantChatResult {
    entries: ChatEntry[];
    busy: boolean;
    send: (question: string) => void;
    stop: () => void;
    reset: () => void;
}

/** כמה הודעות אחרונות נשלחות לשרת (כל ההיסטוריה נשלחת למודל בכל שאלה, ועולה כסף) */
const HISTORY_LIMIT = 20;

/** ההיסטוריה שנשלחת לשרת: רק הודעות עם טקסט, האחרונות, ומתחילה בשאלה של המשתמש */
const toHistory = (entries: ChatEntry[]): AssistantMessage[] => {
    const messages = entries
        .filter((e) => e.text.trim() !== '')
        .map((e) => ({role: e.role, text: e.text.slice(0, MAX_MESSAGE_LENGTH)}))
        .slice(-HISTORY_LIMIT);

    while (messages.length > 0 && messages[0].role !== 'user') messages.shift();
    return messages;
};

const isAbort = (err: unknown): boolean => err instanceof DOMException && err.name === 'AbortError';

export default function useAssistantChat(): UseAssistantChatResult {
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [busy, setBusy] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const nextId = useRef(1);

    // יציאה מהדף באמצע תשובה - מבטלים את הבקשה (השרת מקבל CancellationToken ומפסיק)
    useEffect(() => () => abortRef.current?.abort(), []);

    const send = useCallback((question: string) => {
        const text = question.trim().slice(0, MAX_MESSAGE_LENGTH);
        if (!text || busy) return;

        const userEntry: ChatEntry = {id: nextId.current++, role: 'user', text};
        const answerId = nextId.current++;
        const history = toHistory([...entries, userEntry]);

        // הודעה ריקה של העוזר - כל חלק שמגיע מתווסף אליה
        setEntries((list) => [
            ...list,
            userEntry,
            {id: answerId, role: 'assistant', text: '', status: 'חושב...', streaming: true},
        ]);
        setBusy(true);

        const update = (patch: (entry: ChatEntry) => ChatEntry) =>
            setEntries((list) => list.map((e) => (e.id === answerId ? patch(e) : e)));

        const controller = new AbortController();
        abortRef.current = controller;

        streamAssistantAnswer(
            history,
            getCurrentUser().role,
            {
                onText: (chunk) => update((e) => ({...e, text: e.text + chunk, status: undefined})),
                onStatus: (status) => update((e) => ({...e, status})),
            },
            controller.signal,
        )
            .catch((err: unknown) => {
                if (isAbort(err)) {
                    update((e) => ({...e, stopped: true}));
                } else {
                    update((e) => ({...e, error: err instanceof Error ? err.message : 'משהו השתבש. נסו שוב.'}));
                }
            })
            .finally(() => {
                update((e) => ({...e, streaming: false, status: undefined}));
                if (abortRef.current === controller) abortRef.current = null;
                setBusy(false);
            });
    }, [busy, entries]);

    const stop = useCallback(() => abortRef.current?.abort(), []);

    const reset = useCallback(() => {
        abortRef.current?.abort();
        setEntries([]);
    }, []);

    return {entries, busy, send, stop, reset};
}
