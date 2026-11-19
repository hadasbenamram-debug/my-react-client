// העוזר החכם: שליחת השיחה לשרת וקריאת התשובה בהזרמה (Server-Sent Events).
// ספריית HTTP רגילה (XHR) מחזירה את התשובה רק כשהיא נגמרת, ו-EventSource של הדפדפן תומך רק ב-GET,
// ואנחנו שולחים POST עם ההיסטוריה - לכן fetch, שמאפשר לקרוא את גוף התשובה חלק אחרי חלק.
// הבקשה עצמה נשלחת מה-thunk streamAssistantReply (store/publicSlice.ts) דרך apiFetchRaw, שמוסיף את הטוקן;
// כאן נשאר רק הפענוח של ההזרמה.

export type AssistantRole = 'user' | 'assistant';

export interface AssistantMessage {
    role: AssistantRole;
    text: string;
}

export interface AssistantStreamHandlers {
    /** חלק נוסף מהתשובה */
    onText: (chunk: string) => void;
    /** הודעת מצב בזמן שהשרת מריץ כלי ("בודק את התרומות שלך...") */
    onStatus: (status: string) => void;
}

export const ASSISTANT_STREAM_URL = '/api/chat/stream';

/** כמו בשרת: כל הודעה עד 2000 תווים (תשובה ארוכה של העוזר נחתכת בהיסטוריה) */
export const MAX_MESSAGE_LENGTH = 2000;

interface StreamPayload {
    text?: string;
    message?: string;
}

/**
 * מטפל בהודעה אחת מההזרמה. מחזיר true כשהגיע הסוף ([DONE]).
 * פורמט ההודעה: שורות "event: ..." (לא חובה) ו-"data: {json}", ואחריהן שורה ריקה.
 */
const handleBlock = (block: string, handlers: AssistantStreamHandlers): boolean => {
    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }

    const data = dataLines.join('\n');
    if (!data) return false;
    if (data === '[DONE]') return true;

    const payload = JSON.parse(data) as StreamPayload;

    // שגיאה באמצע ההזרמה: השרת כבר שלח 200, ולכן השגיאה מגיעה כהודעה בתוך ההזרמה
    if (eventName === 'error') throw new Error(payload.message || 'התשובה נקטעה באמצע. נסו לשאול שוב.');

    if (eventName === 'status') {
        if (payload.text) handlers.onStatus(payload.text);
    } else if (payload.text) {
        handlers.onText(payload.text);
    }
    return false;
};

/**
 * קורא את גוף התשובה בהזרמה וקורא ל-handlers על כל חלק. מסתיים ב-[DONE] או בסוף הזרם.
 * ביטול הבקשה (signal) מפסיק את הקריאה עם AbortError.
 */
export async function readAssistantStream(body: ReadableStream<Uint8Array>, handlers: AssistantStreamHandlers): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const {value, done} = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, {stream: true});
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? ''; // החלק האחרון עוד לא נגמר

        for (const block of blocks) {
            if (handleBlock(block, handlers)) {
                await reader.cancel().catch(() => undefined);
                return;
            }
        }
    }
}
