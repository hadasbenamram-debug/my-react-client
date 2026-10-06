import {useState} from 'react';

const EMPTY = {name: '', phone: '', email: ''};

export default function Contact() {
    const [form, setForm] = useState(EMPTY);
    const [sent, setSent] = useState(false);

    const onChange = (event) => {
        const {name, value} = event.target;
        setForm((prev) => ({...prev, [name]: value}));
    };

    const onSubmit = (event) => {
        event.preventDefault();
        setSent(true);
        setForm(EMPTY);
    };

    return (
        <section className="contact" id="contact">
            <div>
                <p className="eyebrow">עדיין מתלבטים?</p>
                <h2>דברו איתנו ונחזור עם הצעה מדויקת</h2>
            </div>
            <form className="contact-form" onSubmit={onSubmit}>
                <label>
                    שם
                    <input name="name" value={form.name} onChange={onChange} required />
                </label>
                <label>
                    טלפון
                    <input name="phone" value={form.phone} onChange={onChange} required />
                </label>
                <label>
                    אימייל
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={onChange}
                        required
                    />
                </label>
                <button type="submit">תחזרו אלי</button>
                {sent ? <p className="form-ok">קיבלנו. נחזור אליכם בהקדם.</p> : null}
            </form>
        </section>
    );
}
