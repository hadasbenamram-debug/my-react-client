import type { NotificationDto } from '../../types/api';
import type { DeckLink, DeckNotification, DeckType } from './notificationUtils';

// ==============================================================
// תיקון 72: ממירים התראה מהשרת (NotificationDto) לקלף בחפיסה.
// השרת שומר רק נושא, תוכן וקישור (ה-type נשלח רק בזמן אמת), ולכן הסוג נקבע לפי הנושא והקישור -
// לפי ההתראות שהשרת שולח היום (RouteWorkflowService, MatchCreationService, ApprovalRequestService,
// AdminEscalationService). התראה לא מוכרת מוצגת כ"עדכון".
// ==============================================================

/** "#12" שאחרי המילה "תרומה" (ב-"No-Show במסלול #3" זה מספר מסלול, לא תרומה) */
const donationIdOf = (n: NotificationDto): number | null => {
  const text = `${n.subject ?? ''} ${n.content ?? ''}`;
  const fromText = /תרומה\s*#(\d+)/.exec(text);
  if (fromText) return Number(fromText[1]);
  const fromLink = /\/donation\/(\d+)/.exec(n.link ?? '');
  return fromLink ? Number(fromLink[1]) : null;
};

const roleSegment = (role: string | undefined): 'supplier' | 'ngo' | 'volunteer' | null => {
  const r = String(role ?? '').toLowerCase();
  if (r.includes('suppl') || r.includes('business')) return 'supplier';
  if (r.includes('ngo') || r.includes('org')) return 'ngo';
  if (r.includes('volunt')) return 'volunteer';
  return null;
};

/** טקסט הכפתור לפי לאן הקישור מוביל */
const labelForLink = (to: string): string => {
  if (to.includes('/incoming-request')) return 'לבקשה';
  if (to.includes('/track/')) return 'למעקב חי';
  if (to.includes('/donation/')) return 'לצפייה בתרומה';
  if (to.includes('/admin/noshow')) return 'לטיפול באי-הגעה';
  if (to.includes('/admin/donations')) return 'לניהול תרומות';
  if (to.endsWith('/dashboard')) return 'ללוח הבקרה';
  if (to.startsWith('/app/profile')) return 'לפרופיל';
  return 'מעבר';
};

const classify = (n: NotificationDto): DeckType => {
  const s = n.subject ?? '';
  const link = n.link ?? '';
  if (link.includes('/incoming-request') || s.includes('בקשת התנדבות חדשה')) return 'action';
  if (s.startsWith('אין מתנדב זמין')) return 'action';                       // מנהל: שיבוץ ידני
  if (s.includes('No-Show')) return link ? 'action' : 'warning';              // מנהל: טיפול / מתנדב: עדכון
  if (s.includes('אישרה את קבלת')) return 'confirmed';
  if (s.includes('נמסרה לעמותה')) return 'delivered';
  if (s.includes('נמסרה')) return 'action';                                   // עמותה: נא לאשר קבלה
  if (s.includes('נאספה')) return 'pickup';
  if (s.includes('יצא לדרך')) return 'route';
  if (s.includes('אישר את המסלול') || s.includes('שובץ')) return 'assigned';
  if (s.includes('פורסמה')) return 'published';
  if (s.includes('בקשת ההצטרפות')) return 'account';
  if (s.includes('בוטלה') || s.includes('פג זמן') || n.type === 'warning') return 'warning';
  if (n.type === 'request') return 'action';
  return 'info';
};

/** פעולה ראשית - רק למה שמחכה למשתמש */
const actionFor = (type: DeckType, n: NotificationDto): DeckLink | null => {
  if (type !== 'action' || !n.link?.startsWith('/')) return null;
  const s = n.subject ?? '';
  if (s.includes('נמסרה')) return { label: 'לאישור קבלה', to: n.link };
  if (s.startsWith('אין מתנדב זמין')) return { label: 'לשיבוץ ידני', to: n.link };
  return { label: labelForLink(n.link), to: n.link };
};

export function toDeckNotification(n: NotificationDto, activeRole: string | undefined): DeckNotification {
  const type = classify(n);
  const donationId = donationIdOf(n);
  const action = actionFor(type, n);

  // הקישור המשני: מסך התרומה (לפי התפקיד הפעיל), ואם אין - הקישור מהשרת
  let link: DeckLink | null = null;
  const segment = roleSegment(activeRole);
  if (n.link?.startsWith('/') && n.link !== action?.to) link = { label: labelForLink(n.link), to: n.link };
  else if (donationId && segment && !action?.to.includes('/donation/')) link = { label: 'לצפייה בתרומה', to: `/app/${segment}/donation/${donationId}` };
  else if (type === 'account' && !action) link = { label: 'לפרופיל', to: '/app/profile' };

  const content = n.content?.trim() || null;
  return {
    id: n.id,
    type,
    title: n.subject?.trim() || 'התראת מערכת',
    body: type === 'confirmed' ? null : content,
    // "תודה על התרומה!" מוצג כבועה מהעמותה. שם העמותה מגיע מפרטי התרומה (NotificationsPage)
    quote: type === 'confirmed' && content ? { from: 'העמותה', text: content } : null,
    donationId,
    createdAt: n.createdAt,
    isRead: n.isRead,
    action,
    link,
  };
}
