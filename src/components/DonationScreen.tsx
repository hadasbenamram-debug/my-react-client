import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HeartShape from './HeartShape';
import { CommentItem } from './CommentParts';
import { LoadingBlock } from './PageParts';
import { useAutoRefresh } from './LiveUpdates';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import { imageUrl } from '../utils/images';
import { DONATION_STATUS_LABELS, MATCH_STATUS_LABELS, formatDateTime, formatPickupWindow, formatTime } from '../utils/format';
import { canConfirmReceipt, confirmDonationReceipt, ratingPath } from '../utils/confirmReceipt';
import type { CommentDto, DonationResponseDto } from '../types/api';
import '../styles/donation-screen.css';

// תיקון 60: מסך תרומה אחד לעמותה ולמתנדב, בסגנון של מסך הזמנה באפליקציה:
// הלוגו, מספר התרומה, ושלושה כפתורים - פרטי תרומה / מעקב תרומה / שיחה (עם המתנדב או העמותה).
// השיחה היא התגובות על התרומה (עץ רקורסיבי, אותו API כמו בעמוד התגובות).
// תיקון 63: גם הספק מקבל את המסך הזה (במקום "פרטי תרומה" ו"תגובות ספק"),
// והעמותה מאשרת כאן את קבלת התרומה (במקום הדף "אישור קבלה").

export type DonationScreenRole = 'ngo' | 'volunteer' | 'supplier';
type Tab = 'details' | 'tracking' | 'chat';

const TABS: { key: Tab; label: string }[] = [
  { key: 'details', label: 'פרטי תרומה' },
  { key: 'tracking', label: 'מעקב תרומה' },
  { key: 'chat', label: 'שיחה' },
];

const ROLE_PARAM: Record<DonationScreenRole, string> = { ngo: 'Ngo', volunteer: 'Volunteer', supplier: 'Supplier' };
// תיקון 62: "תרומות נכנסות" נמחק - העמותה חוזרת לדשבורד (שם רשימת "בדרך אליכם")
const BACK: Record<DonationScreenRole, string> = {
  ngo: '/app/ngo/dashboard',
  volunteer: '/app/volunteer/history',
  supplier: '/app/supplier/dashboard',
};

const FINALE: Record<DonationScreenRole, string> = {
  ngo: 'אישרתם את קבלת המזון. תודה שאתם חלק ממעגל הנתינה!',
  volunteer: 'העמותה אישרה את הקבלה. תודה שיצאת לדרך - בזכותך המזון הגיע!',
  supplier: 'העמותה אישרה את הקבלה. תודה על התרומה - בזכותכם המזון הגיע למי שצריך!',
};

// ── תאריכים: השרת שולח UTC ──
const toDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const shortDate = (d: Date) => d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
const shortTime = (d: Date) => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

const countAll = (c: CommentDto): number => 1 + (c.replies ?? []).reduce((n, r) => n + countAll(r), 0);

interface TimelineStep {
  key: string;
  label: string;
  at: Date | null;
  /** שלב סיום (נמסר / בוטל) - מוצג עם איור ומשפט תודה */
  finale?: string;
  cancelled?: boolean;
}

function buildTimeline(d: DonationResponseDto, role: DonationScreenRole): TimelineStep[] {
  const steps: TimelineStep[] = [
    { key: 'created', label: 'התרומה פורסמה', at: toDate(d.createdAt) },
    { key: 'assigned', label: 'נמצאו מתנדב ועמותה', at: toDate(d.matchAssignedAt) },
    { key: 'confirmed', label: 'המתנדב אישר ויוצא לדרך', at: toDate(d.volunteerConfirmedAt) },
    { key: 'picked', label: 'המזון נאסף מהספק', at: toDate(d.pickedUpAt) },
    { key: 'delivered', label: 'המזון נמסר לעמותה', at: toDate(d.deliveredAt) },
    {
      key: 'received',
      label: 'התרומה הגיעה ליעדה',
      at: toDate(d.receivedAt),
      finale: FINALE[role],
    },
  ];
  if (d.status === 'Cancelled' || d.status === 'Expired') {
    const done = steps.filter((s) => s.at);
    return [...done, {
      key: 'stopped',
      label: d.status === 'Cancelled' ? 'התרומה בוטלה' : 'פג התוקף של התרומה',
      at: null,
      cancelled: true,
      finale: 'התרומה לא תגיע הפעם. תרומות חדשות כבר בדרך.',
    }];
  }
  return steps;
}

/** איור קטן: קופסה עם לב (במקום התמונה של החבילה) */
function BoxArt({ done = false }: { done?: boolean }) {
  return (
    <svg className="dscreen-boxart" viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="38" fill="#e6f5f5" />
      <path d="M18 34 L40 26 L62 34 L62 58 L40 66 L18 58 Z" fill="#f2d7a7" />
      <path d="M18 34 L40 42 L62 34 L40 26 Z" fill="#f8e5c2" />
      <path d="M40 42 L40 66" stroke="#d9b375" strokeWidth="2" />
      <path d="M18 34 L40 42 L62 34" fill="none" stroke="#d9b375" strokeWidth="2" />
      <path
        d="M50 88C22 68 4 50 4 30.5 4 15.9 15.4 5 29.4 5 38 5 45.6 9.6 50 16.6 54.4 9.6 62 5 70.6 5 84.6 5 96 15.9 96 30.5 96 50 78 68 50 88Z"
        transform={done ? 'translate(28 6) scale(0.24)' : 'translate(31 12) scale(0.18)'}
        fill="var(--teal)"
      />
      {done && <circle cx="61" cy="18" r="3" fill="#7fd9dc" />}
      {done && <circle cx="18" cy="20" r="2.5" fill="#f2b8c6" />}
    </svg>
  );
}

export default function DonationScreen({ role }: { role: DonationScreenRole }) {
  const { id } = useParams();
  const donationId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  // הספק מגיע לכאן מיד אחרי פרסום התרומה (CreateDonationPage)
  const justPublished = role === 'supplier' && (location.state as { justPublished?: boolean } | null)?.justPublished === true;
  const tab: Tab = (['details', 'tracking', 'chat'] as Tab[]).includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'details';

  const [donation, setDonation] = useState<DonationResponseDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/comments/tree?role=${ROLE_PARAM[role]}`, { headers: authHeaders() });
    if (!res.ok) return;
    const all = (await res.json()) as CommentDto[];
    setComments(all.filter((c) => c.donationId === donationId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)));
  }, [role, donationId]);

  const load = useCallback(() => {
    if (!Number.isFinite(donationId)) {
      setError('מספר התרומה לא תקין.');
      return;
    }
    fetch(`/api/donations/${donationId}`, { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readErrorMessage(res, 'לא הצלחנו לטעון את התרומה.'));
        return (await res.json()) as DonationResponseDto;
      })
      .then((data) => { setDonation(data); setError(null); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'שגיאת תקשורת מול השרת.'));
    void loadComments();
  }, [donationId, loadComments]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const timeline = useMemo(() => (donation ? buildTimeline(donation, role) : []), [donation, role]);
  const chatCount = comments.reduce((n, c) => n + countAll(c), 0);

  const post = async (body: { content: string; donationId?: number; parentCommentId?: number }) => {
    setChatError(null);
    const res = await fetch('/api/comments', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(body) });
    if (!res.ok) {
      setChatError(await readErrorMessage(res, 'לא הצלחנו לשלוח את ההודעה.'));
      return false;
    }
    await loadComments();
    return true;
  };

  // תיקון 63: העמותה מאשרת שהתרומה הגיעה, ועוברת לדרג את המסירה
  const confirmReceipt = async () => {
    setConfirmError(null);
    setConfirming(true);
    try {
      navigate(ratingPath(await confirmDonationReceipt(donationId)));
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : 'שגיאת תקשורת מול השרת.');
      setConfirming(false);
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    if (await post({ content: text.trim(), donationId })) setText('');
    setSending(false);
  };

  if (!donation && !error) return <LoadingBlock text="טוען את התרומה..." />;

  // עם מי השיחה: העמותה - עם המתנדב; המתנדב והספק - עם העמותה (הספק רואה גם את המתנדב בשורה נפרדת)
  const partnerName = role === 'ngo' ? donation?.volunteerName : donation?.ngoName;
  const partnerTitle = role === 'ngo' ? 'המתנדב/ת' : 'העמותה';
  const chatWith = role === 'supplier' ? 'העמותה והמתנדב/ת' : partnerTitle;
  const chatNote = role === 'supplier'
    ? 'העמותה והמתנדב/ת רואים את השיחה ויכולים להגיב. אפשר להגיב לכל הודעה.'
    : 'גם הספק רואה את השיחה ויכול להגיב. אפשר להגיב לכל הודעה.';
  const showConfirm = role === 'ngo' && !!donation && canConfirmReceipt(donation.status);
  const created = toDate(donation?.createdAt);
  const photo = imageUrl(donation?.image);
  const lastDoneIndex = timeline.reduce((last, s, i) => (s.at ? i : last), -1);
  const statusLabel = donation
    ? (donation.matchStatus && donation.status === 'Matched'
      ? MATCH_STATUS_LABELS[donation.matchStatus] ?? DONATION_STATUS_LABELS[donation.status]
      : DONATION_STATUS_LABELS[donation.status] ?? donation.status)
    : '';

  let body: ReactNode = null;
  if (donation && tab === 'details') {
    body = (
      <div className="dscreen-panel">
        <div className="dscreen-summary">
          <BoxArt />
          <div>
            <p>תאריך התרומה: <span dir="ltr">{created ? `${shortDate(created)}, ${shortTime(created)}` : '—'}</span></p>
            {role === 'supplier'
              ? <p>בתוקף עד: <strong>{formatDateTime(donation.expirationTime)}</strong></p>
              : <p>מסופק ע״י: <strong>{donation.supplierName ?? '—'}</strong></p>}
          </div>
        </div>

        <div className="dscreen-row">
          <div>
            <p className="dscreen-row-title">{partnerTitle}: {partnerName ?? 'עוד לא שובץ'}</p>
            <p className="dscreen-row-sub">איסוף {formatPickupWindow(donation.earliestPickupTime, donation.latestPickupTime)}</p>
          </div>
          <span className="dscreen-status">{statusLabel}</span>
        </div>

        {role === 'supplier' && (
          <div className="dscreen-row">
            <div>
              <p className="dscreen-row-title">המתנדב/ת: {donation.volunteerName ?? 'עוד לא שובץ'}</p>
              <p className="dscreen-row-sub">
                {donation.pickedUpAt
                  ? 'המזון נאסף ממכם'
                  : donation.estimatedArrival ? `מגיע/ה לאיסוף בערך ב-${formatTime(donation.estimatedArrival)}` : 'נעדכן כשיימצא מתנדב'}
              </p>
            </div>
          </div>
        )}

        <h3 className="dscreen-h3">מה בתרומה</h3>
        <ul className="dscreen-items">
          {(donation.categories ?? []).map((c, i) => (
            <li key={`${c.categoryId}-${i}`}>
              <span>{c.categoryName ?? 'פריט'}</span>
              <span className="dscreen-qty">×{c.quantity}{c.weightKg ? ` · ${c.weightKg.toLocaleString('he-IL', { maximumFractionDigits: 1 })} ק״ג` : ''}</span>
            </li>
          ))}
          <li className="dscreen-total">
            <span>סה״כ</span>
            <span>{(donation.totalWeightKg ?? 0).toLocaleString('he-IL', { maximumFractionDigits: 1 })} ק״ג</span>
          </li>
        </ul>

        {photo && <img className="dscreen-photo" src={photo} alt={`תמונה של תרומה ${donation.id}`} loading="lazy" />}

        {donation.volunteerRouteId != null && (
          <button type="button" className="dscreen-pill" onClick={() => navigate(`/app/track/${donation.volunteerRouteId}`)}>
            <MyLocationIcon fontSize="small" />
            {role === 'volunteer' ? 'המסלול שלי במפה' : role === 'ngo' ? 'מעקב חי אחרי המתנדב' : 'מעקב חי אחרי המשלוח'}
          </button>
        )}
      </div>
    );
  } else if (donation && tab === 'tracking') {
    body = (
      <ol className="dscreen-timeline">
        {timeline.map((step, i) => {
          const done = !!step.at;
          const current = i === lastDoneIndex;
          const next = i === lastDoneIndex + 1 && !step.cancelled;
          const finaleShown = step.finale && (done || step.cancelled);
          return (
            <li key={step.key} className={`dscreen-step ${done ? 'is-done' : ''} ${current ? 'is-current' : ''} ${next ? 'is-next' : ''} ${step.cancelled ? 'is-cancelled' : ''}`}>
              <div className="dscreen-step-when">
                {step.at ? (<><strong>{shortDate(step.at)}</strong><span>{shortTime(step.at)}</span></>) : next ? <span>בקרוב</span> : null}
              </div>
              <span className="dscreen-step-dot" aria-hidden="true">
                {step.cancelled ? '✕' : done ? '✓' : ''}
              </span>
              <div className="dscreen-step-what">
                {finaleShown && <BoxArt done={!step.cancelled} />}
                <div>
                  <p className="dscreen-step-label">{step.label}</p>
                  {finaleShown && <p className="dscreen-step-finale">{step.finale}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    );
  } else if (donation && tab === 'chat') {
    body = (
      <div className="dscreen-chat">
        <div className="dscreen-chat-head">
          <span className="dscreen-avatar" aria-hidden="true">{(partnerName ?? '?').trim().charAt(0) || '?'}</span>
          <div>
            <p className="dscreen-row-title">שיחה עם {chatWith}{role !== 'supplier' && partnerName ? ` – ${partnerName}` : ''}</p>
            <p className="dscreen-row-sub">{chatNote}</p>
          </div>
        </div>

        <div className="dscreen-chat-body">
          {comments.length === 0 ? (
            <p className="dscreen-empty">עוד אין הודעות על התרומה הזו. כתבו את הראשונה - למשל איפה התרומה מחכה או מתי מגיעים.</p>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} inline
                onReply={(parentId, value) => { void post({ content: value.trim(), parentCommentId: parentId }); }} />
            ))
          )}
        </div>

        {chatError && <p className="dscreen-error" role="alert">{chatError}</p>}

        <form className="dscreen-composer" onSubmit={send}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="כתבו הודעה..." rows={1}
            maxLength={1000} aria-label="הודעה חדשה על התרומה"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(e); } }} />
          <button type="submit" disabled={sending || !text.trim()} aria-label="שליחה">
            <SendRoundedIcon />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="dscreen-wrap">
      <Link to={BACK[role]} className="dscreen-back"><ArrowForwardIcon fontSize="small" /> חזרה</Link>
      <article className="dscreen">
        <div className="dscreen-logo" aria-label="לתת באהבה">
          <span>לתת <span className="dscreen-logo-accent">באהבה</span></span>
          <HeartShape className="dscreen-logo-heart" fill="var(--teal)" />
        </div>
        <p className="dscreen-number">תרומה מספר: <strong>{Number.isFinite(donationId) ? donationId : '—'}</strong></p>

        {justPublished && (
          <div className="dscreen-note is-success" role="status">
            <p>התרומה פורסמה בהצלחה! מנוע השידוכים יחפש לה מתנדב ועמותה.</p>
            <button type="button" className="dscreen-note-btn" onClick={() => navigate('/app/supplier/create-donation')}>תרומה נוספת</button>
          </div>
        )}

        {showConfirm && (
          <div className="dscreen-note is-confirm">
            <p>
              <strong>{donation?.status === 'Delivered' ? 'המתנדב/ת סימן/ה שהתרומה נמסרה.' : 'התרומה בדרך אליכם.'}</strong>
              {' '}הגיעה? אשרו את הקבלה, ואז תוכלו לדרג את המסירה.
            </p>
            <button type="button" className="dscreen-note-btn is-primary" disabled={confirming} onClick={() => void confirmReceipt()}>
              <FactCheckIcon fontSize="small" /> {confirming ? 'מאשר...' : 'אישור קבלה'}
            </button>
            {confirmError && <p className="dscreen-error" role="alert">{confirmError}</p>}
          </div>
        )}

        <div className="dscreen-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`dscreen-tab ${tab === t.key ? 'is-active' : ''}`}
              onClick={() => setParams({ tab: t.key }, { replace: true })}>
              {t.label}
              {t.key === 'chat' && chatCount > 0 && <span className="dscreen-badge">{chatCount}</span>}
            </button>
          ))}
        </div>

        {error ? <p className="dscreen-error" role="alert">{error}</p> : body}
      </article>
    </div>
  );
}
