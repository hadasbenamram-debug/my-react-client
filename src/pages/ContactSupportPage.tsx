import { useEffect } from 'react';
import { useContactForm, type ContactFormData } from '../hooks/useContactForm';
import type { StoredUser } from '../types';
import '../styles/contact.css';

// אם המשתמש מחובר - ממלאים מראש שם ואימייל מתוך currentUser
function getLoggedInDefaults(): Partial<ContactFormData> {
  try {
    const stored = localStorage.getItem('currentUser');
    if (!stored) return {};
    const user = JSON.parse(stored) as StoredUser;
    const name = user.name ?? user.fullName;
    return {
      name: typeof name === 'string' ? name : '',
      email: typeof user.email === 'string' ? user.email : '',
    };
  } catch {
    return {};
  }
}

// אותו מספר כמו בתחתית האתר (components/Footer.tsx) - כשמחליפים שם, להחליף גם כאן
const CONTACT_PHONE = '050-000-0000';

// תיקון 57: עמוד צור קשר בעיצוב חדש - בצד אחד עיגול טורקיז עם יד שמחזיקה מגפון שפורצים ממנו פרחים,
// "Contact" באותיות גדולות והמשפט "לרצות להגיע פרושו להיות בחצי הדרך" (תיקון 58),
// ובצד השני טופס עם שדות מעוגלים (רקע לבן): שם, טלפון, דוא"ל ותיבה לכתיבת הפנייה.
// עמוד אחד לכולם (אורחים ומחוברים) - /contact. השליחה עצמה לא השתנתה (useContactForm).
export function ContactSupportPage() {
  const { form, onChange, onSubmit, loading, status } = useContactForm(getLoggedInDefaults());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="contact-page">
      {/* הצד הוויזואלי */}
      <div className="contact-visual" aria-hidden="true">
        <ContactIllustration />
        <span className="contact-word" dir="ltr">Contact</span>
        <span className="contact-motto">לרצות להגיע פרושו להיות בחצי הדרך</span>
      </div>

      {/* הטופס */}
      <form className="contact-form" onSubmit={onSubmit}>
        <h1 className="contact-heading">
          יש לכם שאלה, רעיון לשיתוף פעולה או מזון לתרום? מוזמנים ליצור קשר
        </h1>

        <div className="contact-fields">
          <label className="contact-sr" htmlFor="contact-name">שם</label>
          <input id="contact-name" className="contact-input" name="name" placeholder="שם" autoComplete="name"
            value={form.name} onChange={onChange} required maxLength={100} />

          <label className="contact-sr" htmlFor="contact-phone">טלפון (לא חובה)</label>
          <input id="contact-phone" className="contact-input" name="phone" type="tel" placeholder="טלפון שנוכל לשוחח"
            autoComplete="tel" value={form.phone} onChange={onChange} maxLength={20} />

          <label className="contact-sr" htmlFor="contact-email">דוא"ל</label>
          <input id="contact-email" className="contact-input" name="email" type="email" placeholder='דוא"ל'
            autoComplete="email" value={form.email} onChange={onChange} required />
        </div>

        <p className="contact-details">
          <a href={`tel:${CONTACT_PHONE.replace(/-/g, '')}`} dir="ltr">{CONTACT_PHONE}</a>
          <span>או השאירו פרטים ונחזור אליכם</span>
        </p>

        <hr className="contact-rule" />

        <label className="contact-subheading" htmlFor="contact-message">מה תרצו לספר לנו?</label>
        <textarea id="contact-message" className="contact-input contact-message" name="message"
          placeholder="כתבו כאן את הפנייה שלכם..." value={form.message} onChange={onChange} required maxLength={1000} />

        <div className="contact-actions">
          <span className="contact-count">{form.message.length}/1000</span>
          <button type="submit" className="contact-submit" disabled={loading}>
            {loading ? 'שולח...' : 'תחזרו אלי'}
          </button>
        </div>

        {status && (
          <p className={`contact-status ${status.ok ? 'is-ok' : 'is-error'}`} role="status">{status.text}</p>
        )}
      </form>
    </div>
  );
}

// ───────── האיור: עיגול טורקיז, יד מחזיקה מגפון בגווני אפור, ומהמגפון פורץ זר פרחים טורקיז ─────────

// מחולל מספרים "אקראיים" קבוע - כדי שהפרחים ייראו אותו דבר בכל טעינה
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// מכהה לבהיר
const FLOWER_COLORS = ['#075e64', '#0b7f87', '#0f98a1', '#16aeb7', '#2cc6cd', '#6fdadf', '#b2ecee'];

const FLOWER_CX = 316;
const FLOWER_CY = 160;
const FLOWER_RX = 68;
const FLOWER_RY = 96;
const FLOWER_TILT = (-18 * Math.PI) / 180;

const toFlower = (u: number, v: number) => ({
  x: FLOWER_CX + u * Math.cos(FLOWER_TILT) - v * Math.sin(FLOWER_TILT),
  y: FLOWER_CY + u * Math.sin(FLOWER_TILT) + v * Math.cos(FLOWER_TILT),
});

/** זר "גיפסנית": בסיס כהה צפוף, ועליו מאות פרחים קטנים - בהירים למעלה-שמאלה (האור) וכהים למטה-ימינה */
const FLOWERS = (() => {
  const rand = seeded(58);
  // קו המתאר של הזר - לא עגול לגמרי
  const outline: { x: number; y: number }[] = [];
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    const d = 0.86 + rand() * 0.2;
    outline.push(toFlower(Math.cos(a) * d * FLOWER_RX, Math.sin(a) * d * FLOWER_RY));
  }
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let path = '';
  outline.forEach((pt, k) => {
    const m = mid(pt, outline[(k + 1) % outline.length]);
    path += k === 0 ? `M${mid(outline[outline.length - 1], pt).x.toFixed(1)} ${mid(outline[outline.length - 1], pt).y.toFixed(1)} ` : '';
    path += `Q${pt.x.toFixed(1)} ${pt.y.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)} `;
  });

  const dots: { x: number; y: number; r: number; c: string }[] = [];
  const add = (u: number, v: number, r: number, noise: number) => {
    // האור מגיע מלמעלה-שמאלה
    const light = (-(u / FLOWER_RX) * 0.6 - (v / FLOWER_RY) * 0.8 + 1.4) / 2.8;   // 0..1
    const shade = Math.round(light * (FLOWER_COLORS.length - 1) + noise);
    const { x, y } = toFlower(u, v);
    dots.push({ x, y, r, c: FLOWER_COLORS[Math.max(0, Math.min(FLOWER_COLORS.length - 1, shade))] });
  };
  for (let i = 0; i < 420; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.98;
    add(Math.cos(a) * d * FLOWER_RX, Math.sin(a) * d * FLOWER_RY, 2.2 + rand() * 2.8, (rand() - 0.5) * 2.2);
  }
  // ענפים קטנים שבולטים מהשוליים
  for (let s = 0; s < 24; s++) {
    const a = (s / 24) * Math.PI * 2 + rand() * 0.25;
    const d = 0.98 + rand() * 0.14;
    const su = Math.cos(a) * d * FLOWER_RX;
    const sv = Math.sin(a) * d * FLOWER_RY;
    for (let i = 0; i < 8; i++) {
      add(su + (rand() - 0.5) * 18, sv + (rand() - 0.5) * 18, 1.8 + rand() * 2.4, (rand() - 0.5) * 2);
    }
  }
  return { path, dots };
})();

// המגפון: הפתח ב-(368,185), והציר נוטה 24 מעלות כלפי מטה-ימינה (אל הידית והגב)
const MEGA_X = 368;
const MEGA_Y = 185;
const MEGA_ANGLE = 24;

function ContactIllustration() {
  return (
    <svg className="contact-art" viewBox="0 0 760 760">
      <defs>
        <linearGradient id="contact-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfbfb" />
          <stop offset="0.55" stopColor="#e9e9e9" />
          <stop offset="1" stopColor="#bdbdbd" />
        </linearGradient>
        <linearGradient id="contact-sleeve" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a9a9a" />
          <stop offset="1" stopColor="#6e6e6e" />
        </linearGradient>
        {/* השרוול נחתך בקו ישר מתחת למילה, כמו בצילום */}
        <clipPath id="contact-sleeve-cut">
          <rect x="0" y="0" width="760" height="440" />
        </clipPath>
      </defs>

      <circle cx="380" cy="430" r="250" fill="var(--teal)" />

      <g className="contact-hand">
        {/* השרוול והזרוע */}
        <g clipPath="url(#contact-sleeve-cut)">
          <path d="M442 352 Q468 320 498 291 Q560 330 612 378 Q628 398 620 430 L608 470 L566 470 Q510 410 442 352 Z" fill="url(#contact-sleeve)" />
          <path d="M478 336 Q536 372 584 440" stroke="#5c5c5c" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round" />
          <path d="M506 312 Q556 344 600 396" stroke="#b3b3b3" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
          {/* חפת סרוג ליד שורש כף היד */}
          <path d="M440 350 Q466 318 496 290 L516 306 Q488 334 460 368 Z" fill="#a5a5a5" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${446 + i * 5} ${355 + i * 4} Q${472 + i * 5} ${324 + i * 4} ${500 + i * 5} ${296 + i * 4}`}
              stroke="#8a8a8a" strokeWidth="1.2" fill="none" />
          ))}
        </g>

        <g transform={`translate(${MEGA_X} ${MEGA_Y}) rotate(${MEGA_ANGLE})`}>
          {/* ידית */}
          <rect x="118" y="18" width="24" height="86" rx="9" fill="#e6e6e6" stroke="#9c9c9c" strokeWidth="1.2" />
          {/* גוף אחורי עם חריצים */}
          <rect x="116" y="-21" width="58" height="42" fill="#eeeeee" />
          <rect x="146" y="-21" width="5" height="42" fill="#c2c2c2" />
          <rect x="172" y="-24" width="30" height="48" rx="4" fill="#d6d6d6" />
          {[178, 185, 192].map((x) => <rect key={x} x={x} y="-24" width="2.5" height="48" fill="#b3b3b3" />)}
          <ellipse cx="202" cy="0" rx="6" ry="24" fill="#9a9a9a" />
          {/* הפעמון */}
          <path d="M120 -21 L0 -60 L0 60 L120 21 Z" fill="url(#contact-cone)" />
          <path d="M120 10 L0 42 L0 60 L120 21 Z" fill="#000" opacity="0.08" />
          <ellipse cx="0" cy="0" rx="13" ry="62" fill="#1d1f20" />
          <ellipse cx="2" cy="0" rx="6" ry="52" fill="#3a3d3f" />
          {/* האגרוף: כף יד, ארבע אצבעות מקופלות ואגודל מעל */}
          <path d="M112 40 Q150 30 166 50 L170 92 Q168 110 146 112 L120 108 Q106 100 108 80 Z" fill="#bdbdbd" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={95 + (i === 0 || i === 3 ? 4 : 0)} y={40 + i * 16} width={44 - (i === 3 ? 6 : 0)} height="17" rx="8.5"
                fill={['#d9d9d9', '#d2d2d2', '#d6d6d6', '#cdcdcd'][i]} stroke="#8a8a8a" strokeWidth="1.1" />
              <path d={`M${103 + (i === 0 || i === 3 ? 4 : 0)} ${44 + i * 16} q3 4 0 9`} stroke="#a0a0a0" strokeWidth="1" fill="none" />
            </g>
          ))}
          <path d="M116 38 Q128 22 158 24 Q170 26 168 34 Q160 40 140 40 Z" fill="#d4d4d4" stroke="#8a8a8a" strokeWidth="1.1" />
        </g>
      </g>

      {/* הזר שפורץ מהמגפון */}
      <g className="contact-flowers">
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${MEGA_X - 4} ${MEGA_Y + (i - 1) * 18} Q${345 - i * 6} ${178 + (i - 1) * 10} ${322 - i * 10} ${150 + i * 26}`}
            stroke="#0b6f76" strokeWidth="2" fill="none" />
        ))}
        <path d={FLOWERS.path} fill="#0a737a" />
        {FLOWERS.dots.map((d, i) => <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(1)} fill={d.c} />)}
      </g>
    </svg>
  );
}
