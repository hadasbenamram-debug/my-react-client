import type {AppDispatch} from '../store';
import {fetchSupplierLicenseUrl} from '../store/adminSlice';
import {errorMessage} from '../api/http';
// פתיחת קובץ רישיון העסק של ספק (מנהל בלבד).
// הקובץ לא נמצא בכתובת ציבורית, ולכן אי אפשר להשתמש ב-<a href> רגיל: קישור כזה לא שולח
// את הטוקן. מורידים את הקובץ (דרך ה-thunk, עם הטוקן) ופותחים אותו מ-blob בלשונית חדשה.

export async function openSupplierLicense(dispatch: AppDispatch, supplierId: number): Promise<void> {
  // פותחים את הלשונית מיד (בתוך אירוע הלחיצה), אחרת חוסם החלונות הקופצים עלול לחסום אותה.
  const tab = window.open('', '_blank');

  try {
    const url = await dispatch(fetchSupplierLicenseUrl(supplierId)).unwrap();

    if (tab) {
      tab.location.href = url;
    } else {
      window.location.href = url;
    }

    // משחררים את הזיכרון אחרי שהלשונית הספיקה לטעון את הקובץ.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    // 404 - אין קובץ רישיון, אחרת שגיאה כללית / שגיאת תקשורת (ההודעה נקבעת ב-thunk)
    tab?.close();
    alert(errorMessage(err, 'שגיאה בפתיחת קובץ הרישיון.'));
  }
}
