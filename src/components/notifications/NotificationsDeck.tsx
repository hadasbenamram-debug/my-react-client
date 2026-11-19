// ==============================================================
// תיקון 72: דף ההתראות - "חפיסה"
// ההתראות החדשות מוצגות כחפיסת קלפים: עוברים עליהן אחת-אחת
// (כפתור, חיצים במקלדת או החלקה בנייד). מה שנקרא יורד לרשימה שמתחת.
//
// Props:
//   notifications  התראות (ממופות מהשרת ב-toDeckNotification)
//   donations      פרטי תרומות לפי donationId: { items, ngo } (לא חובה)
//   now            התאריך הנוכחי (ברירת מחדל: עכשיו)
//   onMarkRead     (id, isRead) => void  - סימון בשרת
//   onOpen         (to, id?) => void     - מעבר למסך באתר (כפתורי הקלף והשורות ברשימה). id = הקלף שממנו לחצו
// ==============================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
import { Icon, dayName, hhmm, parseServerDate, shortWhen, typeOf } from './notificationUtils';
import type { DeckDonation, DeckLink, DeckNotification } from './notificationUtils';
import './NotificationsDeck.css';

const LEAVE_MS = 340;   // משך האנימציה של קלף שיוצא (תואם ל-CSS)
const SWIPE_PX = 110;   // כמה צריך לגרור כדי שהקלף ייחשב כנקרא

type Direction = 'left' | 'right';

// סדר החפיסה: קודם מה שדורש פעולה, אחר כך מהחדש לישן
const time = (n: DeckNotification) => parseServerDate(n.createdAt).getTime();
const priority = (n: DeckNotification) => (n.type === 'action' ? 0 : 1);
const byPriority = (a: DeckNotification, b: DeckNotification) => priority(a) - priority(b) || time(b) - time(a);
const newestFirst = (a: DeckNotification, b: DeckNotification) => time(b) - time(a);

interface NotificationsDeckProps {
  notifications: DeckNotification[];
  donations?: Record<number, DeckDonation | undefined>;
  now?: Date;
  onMarkRead?: (id: number, isRead: boolean) => void;
  onOpen: (to: string, notificationId?: number) => void;
}

export default function NotificationsDeck({ notifications, donations = {}, now = new Date(), onMarkRead, onOpen }: NotificationsDeckProps) {
  const byId = new Map(notifications.map((n) => [n.id, n]));

  const [queue, setQueue] = useState<number[]>(() => notifications.filter((n) => !n.isRead).sort(byPriority).map((n) => n.id));
  const [seen, setSeen] = useState<number[]>([]);                         // מה שנקרא בביקור הזה (בשביל "לקודמת")
  const [leaving, setLeaving] = useState<Record<number, Direction>>({});  // קלפים שבאמצע יציאה
  const [returningId, setReturningId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const known = useRef<Set<number> | null>(null);                         // כל הקלפים שנכנסו לחפיסה, בסדר קבוע
  if (known.current === null) known.current = new Set(queue);
  const cardEls = useRef(new Map<number, HTMLElement>());
  const timers = useRef<Record<number, number>>({});
  const lastDir = useRef<Record<number, Direction>>({});
  const drag = useRef<{ el: HTMLElement; startX: number; dx: number } | null>(null);

  // התראות חדשות שמגיעות בזמן אמת נכנסות לסוף החפיסה
  useEffect(() => {
    const knownIds = known.current!;
    const fresh = notifications.filter((n) => !n.isRead && !knownIds.has(n.id)).sort(byPriority);
    if (!fresh.length) return;
    fresh.forEach((n) => knownIds.add(n.id));
    setQueue((q) => [...q, ...fresh.map((n) => n.id)]);
  }, [notifications]);

  // ---------- פעולות ----------
  function next(direction: Direction = 'left') {
    if (!queue.length) return;
    const id = queue[0];
    lastDir.current[id] = direction;
    setQueue(queue.slice(1));
    setSeen((s) => [...s, id]);
    setLeaving((l) => ({ ...l, [id]: direction }));
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => {
      setLeaving((l) => {
        const { [id]: _, ...rest } = l;
        return rest;
      });
    }, LEAVE_MS);
    onMarkRead?.(id, true);
  }

  function back() {
    if (!seen.length) return;
    const id = seen[seen.length - 1];
    const stillOnScreen = id in leaving;
    window.clearTimeout(timers.current[id]);
    setSeen((s) => s.slice(0, -1));
    setLeaving((l) => {
      const { [id]: _, ...rest } = l;
      return rest;
    });
    setQueue((q) => [id, ...q]);
    if (!stillOnScreen) setReturningId(id);   // הקלף כבר ירד מהמסך - נכנס מהמקום שאליו יצא
    onMarkRead?.(id, false);
  }

  // קלף שחוזר: מציירים אותו במקום היציאה, ובפריים הבא משחררים אותו כדי שיחליק פנימה
  useLayoutEffect(() => {
    if (returningId == null) return;
    void cardEls.current.get(returningId)?.offsetWidth;
    const raf = requestAnimationFrame(() => setReturningId(null));
    return () => cancelAnimationFrame(raf);
  }, [returningId]);

  // רק הקלף העליון זמין למקלדת ולקורא מסך
  const frontId = returningId == null ? queue[0] : undefined;
  useLayoutEffect(() => {
    cardEls.current.forEach((el, id) => el.toggleAttribute('inert', id !== frontId));
  });

  // חיצים: שמאלה = הבאה, ימינה = חזרה (כיוון קריאה מימין לשמאל)
  const actions = useRef({ next, back });
  actions.current = { next, back };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); actions.current.next(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); actions.current.back(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  // ---------- החלקה בנייד / גרירה בעכבר ----------
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const target = e.target as Element;
    const el = target.closest<HTMLElement>('.dk-card.is-front');
    if (!el || target.closest('a, button')) return;
    drag.current = { el, startX: e.clientX, dx: 0 };
    el.setPointerCapture(e.pointerId);
    setDraggingId(frontId ?? null);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.startX;
    d.el.style.transform = `translateX(${d.dx}px) rotate(${d.dx / 28}deg)`;
  }
  function endDrag() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    d.el.style.transform = '';
    setDraggingId(null);
    if (Math.abs(d.dx) > SWIPE_PX) next(d.dx > 0 ? 'right' : 'left');
  }

  // ---------- נתונים לתצוגה ----------
  const total = queue.length + seen.length;
  const cardIds = [...known.current].filter((id) => byId.has(id) && (queue.includes(id) || id in leaving));
  const seenSet = new Set(seen);
  const history = [
    ...[...seen].reverse().map((id) => ({ n: byId.get(id), isNew: true })),
    ...notifications
      .filter((n) => n.isRead && !seenSet.has(n.id) && !queue.includes(n.id))
      .sort(newestFirst)
      .map((n) => ({ n, isNew: false })),
  ].filter((h): h is { n: DeckNotification; isNew: boolean } => !!h.n);

  return (
    // div ולא main: ה-Layout כבר עוטף ב-<main>, וגם הכלל הגלובלי main > section (sections.css) היה מוסיף ריווח וקו
    <div className="dk-page" dir="rtl">
      <header className="dk-head">
        <h1>התראות</h1>
        <p>
          {queue.length > 1 ? `${queue.length} חדשות לעבור עליהן`
            : queue.length === 1 ? 'התראה חדשה אחת לעבור עליה'
            : 'אין התראות חדשות'}
        </p>
      </header>

      <section aria-label="התראות חדשות">
        <div className="dk-progress" aria-hidden="true">
          {/* נקודה לכל התראה חדשה (לפי המזהה שלה) - מסומנת כשכבר עברו עליה */}
          {[...seen, ...queue].map((id) => <i key={id} className={seenSet.has(id) ? 'is-done' : undefined} />)}
        </div>

        <div
          className="dk-deck"
          aria-live="polite"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {cardIds.map((id) => {
            const n = byId.get(id)!;
            const k = queue.indexOf(id);
            const isReturning = id === returningId;
            const isLeaving = id in leaving || isReturning;
            const dir = leaving[id] ?? lastDir.current[id];
            const className = [
              'dk-card',
              k === 0 && !isLeaving && 'is-front',
              k === 1 && 'is-k1',
              k === 2 && 'is-k2',
              k > 2 && 'is-hidden',
              isLeaving && 'is-leaving',
              isLeaving && dir === 'right' && 'to-right',
              isReturning && 'is-returning',
              id === draggingId && 'is-dragging',
            ].filter(Boolean).join(' ');
            return (
              <article
                key={id}
                ref={(el) => {
                  if (el) cardEls.current.set(id, el);
                  else cardEls.current.delete(id);
                }}
                className={className}
                style={{ '--k': Math.min(Math.max(k, 0), 3) } as CSSProperties}
              >
                <DeckCard n={n} donation={n.donationId ? donations[n.donationId] : undefined} now={now} onOpen={(to) => onOpen(to, n.id)} />
              </article>
            );
          })}

          {!queue.length && (
            <div className="dk-done">
              <div>
                <h2>כל ההתראות החדשות נקראו</h2>
                <p>עדכונים חדשים יופיעו כאן ברגע שיקרו.</p>
              </div>
            </div>
          )}
        </div>

        <div className="dk-nav">
          <button className="dk-nav-btn" type="button" onClick={back} disabled={!seen.length}>
            <Icon name="chevronRight" size={16} strokeWidth={2} />
            לקודמת
          </button>
          <span className="dk-pos">{queue.length ? `${seen.length + 1} מתוך ${total}` : ''}</span>
          <button className="dk-nav-btn is-main" type="button" onClick={() => next()} disabled={!queue.length}>
            להתראה הבאה
            <Icon name="chevronLeft" size={16} strokeWidth={2} />
          </button>
        </div>
        <p className="dk-keys">אפשר גם עם החיצים במקלדת</p>
      </section>

      <section className="dk-history">
        <h2>התראות שנקראו</h2>
        {history.length === 0 ? (
          <p className="dk-empty">עדיין אין כאן התראות.</p>
        ) : (
          <ul className="dk-hlist">
            {history.map(({ n, isNew }) => {
              const target = n.action ?? n.link;
              const when = parseServerDate(n.createdAt);
              const row = (
                <>
                  <Icon name={typeOf(n).icon} size={18} />
                  <p>{n.title}</p>
                  <time dateTime={when.toISOString()}>{shortWhen(when, now)}</time>
                </>
              );
              return (
                <li key={n.id} className={`dk-hrow${isNew ? ' is-new' : ''}${target ? ' is-link' : ''}`}>
                  {target ? <SiteLink to={target.to} onOpen={onOpen} title={target.label}>{row}</SiteLink> : row}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** קישור בתוך האתר: href אמיתי (לחיצה אמצעית / פתיחה בלשונית), ובלחיצה רגילה - ניווט של האפליקציה */
interface SiteLinkProps {
  to: string;
  onOpen: (to: string) => void;
  className?: string;
  title?: string;
  children: ReactNode;
}

function SiteLink({ to, onOpen, className, title, children }: SiteLinkProps) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpen(to);
  };
  return <a className={className} href={to} title={title} onClick={onClick}>{children}</a>;
}

// תוכן של קלף אחד
interface DeckCardProps {
  n: DeckNotification;
  donation?: DeckDonation;
  now: Date;
  onOpen: (to: string) => void;
}

function DeckCard({ n, donation, now, onOpen }: DeckCardProps) {
  const t = typeOf(n);
  const d = parseServerDate(n.createdAt);
  const buttons: Array<DeckLink & { primary: boolean }> = [
    ...(n.action ? [{ ...n.action, primary: true }] : []),
    ...(n.link ? [{ ...n.link, primary: false }] : []),
  ];
  return (
    <>
      <div className="dk-card-top">
        <span className={`dk-icon tone-${t.tone}`}><Icon name={t.icon} size={22} /></span>
        <span className={`dk-label tone-${t.tone}`}>{t.label}</span>
        <time dateTime={d.toISOString()}>{dayName(d, now)}, {hhmm(d)}</time>
      </div>

      <h2>{n.title}</h2>

      {n.quote ? (
        // שם העמותה מפרטי התרומה, כשיש
        <p className="dk-quote"><b>{donation?.ngo || n.quote.from}</b>{n.quote.text}</p>
      ) : n.body ? (
        <p className="dk-text">{n.body}</p>
      ) : null}

      <div className="dk-foot">
        {n.donationId && donation && (
          <div className="dk-don">
            <b>#{n.donationId}</b>
            <span>{donation.items}{donation.ngo ? `, ${ngoPhrase(donation.ngo)}` : ''}</span>
          </div>
        )}
        {buttons.length > 0 && (
          <div className="dk-card-actions">
            {buttons.map((b) => (
              <SiteLink key={b.to + b.label} to={b.to} onOpen={onOpen}
                className={`dk-btn ${b.primary ? 'dk-btn-primary' : 'dk-btn-quiet'}`}>
                {b.label}
              </SiteLink>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// "לעמותת סל חסד" - בלי "לעמותת עמותת..." כששם העמותה כבר מתחיל במילה עמותה
const ngoPhrase = (name: string) => (/^עמות(ת|ה)\s/.test(name) ? `ל${name}` : `לעמותת ${name}`);
