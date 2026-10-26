import {getToken} from './auth';
// פתיחת קובץ רישיון העסק של ספק (מנהל בלבד).
// הקובץ לא נמצא בכתובת ציבורית, ולכן אי אפשר להשתמש ב-<a href> רגיל: קישור כזה לא שולח
// את הטוקן. מורידים את הקובץ עם כותרת Authorization ופותחים אותו מ-blob בלשונית חדשה.

export async function openSupplierLicense(supplierId: number): Promise<void> {
  // פותחים את הלשונית מיד (בתוך אירוע הלחיצה), אחרת חוסם החלונות הקופצים עלול לחסום אותה.
  const tab = window.open('', '_blank');

  try {
    const res = await fetch(`/api/admin/suppliers/${supplierId}/license`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) {
      tab?.close();
      alert(res.status === 404 ? 'לא נמצא קובץ רישיון עבור ספק זה.' : 'שגיאה בפתיחת קובץ הרישיון.');
      return;
    }

    const url = URL.createObjectURL(await res.blob());

    if (tab) {
      tab.location.href = url;
    } else {
      window.location.href = url;
    }

    // משחררים את הזיכרון אחרי שהלשונית הספיקה לטעון את הקובץ.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    tab?.close();
    alert('שגיאת תקשורת מול השרת.');
  }
}
