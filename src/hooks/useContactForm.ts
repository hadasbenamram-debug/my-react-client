import {useState, type ChangeEvent, type FormEvent} from 'react';
import {toErrorPayload} from '../api/http';
import {useAppDispatch} from '../store';
import {sendContactMessage} from '../store/publicSlice';

// לוגיקת השליחה של טופס צור קשר (עמוד ContactSupportPage)
export interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

const EMPTY: ContactFormData = {name: '', email: '', phone: '', subject: '', message: ''};

export function useContactForm(defaults: Partial<ContactFormData> = {}) {
    const dispatch = useAppDispatch();
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
            // השליחה עצמה ב-thunk (store/publicSlice.ts) - POST api/support/contact
            await dispatch(sendContactMessage({
                ...form,
                // תיקון 57: בעמוד החדש אין שדה "נושא" (השרת דורש אותו) - נושא אוטומטי לפי השם
                phone: form.phone || null,
                subject: form.subject.trim() || `פנייה מהאתר - ${form.name.trim()}`,
            })).unwrap();

            setStatus({ok: true, text: 'הפנייה נשלחה בהצלחה! נחזור אליכם בהקדם.'});
            setForm({...EMPTY, ...defaults});
        } catch (err) {
            const error = toErrorPayload(err, 'אירעה שגיאה בשליחת הפנייה. נסו שוב.');
            if (error.status === 0) {
                setStatus({ok: false, text: 'אין תקשורת עם השרת. ודאו שהשרת רץ ונסו שוב.'});
            } else if (error.status === 429) {
                setStatus({ok: false, text: 'נשלחו יותר מדי פניות. נסו שוב בעוד כמה דקות.'});
            } else {
                // שגיאת ולידציה (400) - מציגים את ההודעה הראשונה מהשרת
                const firstError = error.errors ? Object.values(error.errors)[0]?.[0] : undefined;
                setStatus({ok: false, text: firstError || error.message});
            }
        } finally {
            setLoading(false);
        }
    };

    return {form, onChange, onSubmit, loading, status};
}
