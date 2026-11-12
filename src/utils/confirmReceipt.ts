import { authHeaders } from './auth';
import { readErrorMessage } from './apiError';

// תיקון 63: אישור קבלה של תרומה - מהדשבורד של העמותה וממסך התרומה (הדף הנפרד "אישור קבלה" נמחק).
// השרת מחזיר את מזהה השידוך, ואיתו עוברים לדירוג המסירה.

/** אפשר לאשר קבלה לתרומה שנאספה (בדרך) או שהמתנדב סימן שמסר */
export const canConfirmReceipt = (status: string | null | undefined): boolean =>
  status === 'PickedUp' || status === 'Delivered';

/** מאשר שהתרומה הגיעה לעמותה. מחזיר את מזהה השידוך (לדירוג), או זורק שגיאה עם הודעה בעברית */
export async function confirmDonationReceipt(donationId: number): Promise<number> {
  const res = await fetch(`/api/donations/${donationId}/confirm-receipt`, { method: 'POST', headers: authHeaders(true) });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'שגיאה באישור קבלת התרומה.'));
  const body = (await res.json()) as { matchId: number };
  return body.matchId;
}

/** לאן עוברים אחרי אישור הקבלה: דירוג המסירה */
export const ratingPath = (matchId: number): string => `/app/ngo/ratings/${matchId}`;
