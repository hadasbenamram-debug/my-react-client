// תיקון 63: אישור קבלה של תרומה - מהדשבורד של העמותה וממסך התרומה (הדף הנפרד "אישור קבלה" נמחק).
// השרת מחזיר את מזהה השידוך, ואיתו עוברים לדירוג המסירה.
// הקריאה לשרת עצמה היא ה-thunk confirmDonationReceipt ב-store/donationsSlice.ts - כאן רק פונקציות עזר.

/** אפשר לאשר קבלה לתרומה שנאספה (בדרך) או שהמתנדב סימן שמסר */
export const canConfirmReceipt = (status: string | null | undefined): boolean =>
  status === 'PickedUp' || status === 'Delivered';

/** לאן עוברים אחרי אישור הקבלה: דירוג המסירה */
export const ratingPath = (matchId: number): string => `/app/ngo/ratings/${matchId}`;
