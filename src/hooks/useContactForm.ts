import {useState, type ChangeEvent, type FormEvent} from 'react';

// לוגיקת השליחה של טופס צור קשר (עמוד ContactSupportPage)
export interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

const EMPTY: ContactFormData = {name: '', email: '', phone: '', subject: '', message: ''};

// הנתיב יחסי - עובר דרך ה-proxy של Vite אל https://localhost:7295
const CONTACT_URL = '/api/support/contact';

export function useContactForm(defaults: Partial<ContactFormData> = {}) {
    const [form, setForm] = useState<ContactFormData>({...EMPTY, ...defaults});
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setForm((prev) => ({...prev, [name]: value}));
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch(CONTACT_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({...form, phone: form.phone || null}),
            });

            if (res.ok) {
                setStatus({ok: true, text: 'הפנייה נשלחה בהצלחה! נחזור אליכם בהקדם.'});
                setForm({...EMPTY, ...defaults});
                return;
            }

            if (res.status === 429) {
                setStatus({ok: false, text: 'נשלחו יותר מדי פניות. נסו שוב בעוד כמה דקות.'});
                return;
            }

            // שגיאת ולידציה (400) - מציגים את ההודעה הראשונה מהשרת
            const body = await res.json().catch(() => null);
            const firstError = body?.errors ? Object.values(body.errors as Record<string, string[]>)[0]?.[0] : null;
            setStatus({ok: false, text: firstError || body?.message || 'אירעה שגיאה בשליחת הפנייה. נסו שוב.'});
        } catch {
            setStatus({ok: false, text: 'אין תקשורת עם השרת. ודאו שהשרת רץ ונסו שוב.'});
        } finally {
            setLoading(false);
        }
    };

    return {form, onChange, onSubmit, loading, status};
}
