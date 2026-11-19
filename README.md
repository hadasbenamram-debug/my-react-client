# לתת באהבה – צד הלקוח

![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![MUI](https://img.shields.io/badge/MUI-RTL-007FFF?logo=mui)

ממשק המשתמש של **לתת באהבה**, מערכת להצלת מזון. המערכת מחברת בין ספקים עם עודפי מזון, מתנדבים שנוהגים ועמותות. מנוע שידוכים אוטומטי מתכנן את המסלולים.

> התיעוד המלא (ארכיטקטורה, מנוע השידוכים, האלגוריתמים וההגדרות) נמצא בריפו של השרת: [my-server](https://github.com/hadasbenamram-debug/my-server).

---

## מסכים עיקריים

| תפקיד | מסכים |
|---|---|
| **כללי** | דף בית עם אנימציות גלילה, אודות, צור קשר, התחברות עם איפוס סיסמה בחלון (קישור למייל או קוד לטלפון), הרשמה לכל תפקיד, פרופיל עם אימות טלפון |
| **ספק** | לוח בקרה, יצירת תרומה עם ניתוח תמונה ב-AI, תרומות פתוחות, היסטוריה, מסך תרומה (פרטים, מעקב ושיחה) |
| **מתנדב** | לוח בקרה, בקשה נכנסת עם אישור או דחייה, מסלול פעיל עם ניווט, מערכת שעות שבועית, היסטוריית שיבוצים, דירוגים |
| **עמותה** | לוח בקרה עם תרומות בדרך, אישור קבלה ודירוג, שעות קבלה, היסטוריה |
| **מנהל** | לוח בקרה, אישור משתמשים, משתמשים בלשוניות, ניהול תרומות, **חדר בקרה חי** עם רכבים על המפה, מנוע השידוכים עם הרצה ידנית, **"למה המנוע החליט כך"**, No-Show, דוחות, הגדרות ומשקלי המנוע |
| **כולם** | מרכז התראות בזמן אמת, מעקב חי אחרי מסלול, עוזר חכם בצ'אט |

---

## טכנולוגיות

- **React 18** + **TypeScript** + **Vite**
- **Redux Toolkit** + **React Redux** לניהול המצב: store אחד עם slice לכל תחום, וכל הקריאות לשרת עוברות דרך thunks (`createAsyncThunk`)
- **MUI** עם תמיכה מלאה בעברית ובכיווניות RTL (`stylis-plugin-rtl`)
- **React Router** לניתוב לפי תפקיד
- **SignalR** (`@microsoft/signalr`) להתראות ולמיקום המתנדבים בזמן אמת
- **Google Maps** (`@vis.gl/react-google-maps`) למפות, מסלולים וחדר הבקרה

---

## הרצה

השרת צריך לרוץ במקביל, בכתובת `https://localhost:7295` (פרופיל `https`). הוראות ההרצה שלו ב-[README של השרת](https://github.com/hadasbenamram-debug/my-server#הרצה-מקומית).

```bash
git clone https://github.com/hadasbenamram-debug/my-react-client.git
cd my-react-client
npm install
npm run dev
```

הלקוח עולה ב-`http://localhost:5174`. שרת הפיתוח של Vite מעביר לשרת את הבקשות ל-`/api`, ל-`/notificationHub` (כולל WebSocket) ול-`/images`, כך שאין צורך בהגדרות CORS או בקובץ `.env`.

מפתח Google Maps לדפדפן לא נשמר בקוד הלקוח. הלקוח מקבל אותו מהשרת (`/api/map/browser-config`), ורק משתמש מחובר.

### פקודות

| פקודה | מה היא עושה |
|---|---|
| `npm run dev` | שרת פיתוח בפורט 5174 |
| `npm run build` | בנייה לייצור לתיקייה `dist` |
| `npm run preview` | הצגה של הבנייה |
| `npm run typecheck` | בדיקת טיפוסים של TypeScript |

---

## ניהול מצב (Redux)

| Slice | מה הוא מחזיק |
|---|---|
| `auth` | הטוקן והמשתמש המחובר (נשמר ב-localStorage ומסונכרן בין לשוניות) |
| `liveUpdates` | התראות שלא נקראו, בקשת איסוף ממתינה למתנדב, רענון דפים בזמן אמת |
| `ui` | מצב התפריט הצדדי |
| `account`, `notifications`, `public` | פרופיל, התחברות וסיסמה, מרכז ההתראות, נתונים ציבוריים ועוזר חכם |
| `donations`, `supplier`, `ngo` | תרומות, נתוני הספק ונתוני העמותה |
| `volunteer`, `routes` | זמינות, בקשות ומסלולים של מתנדבים, מעקב משלוחים |
| `admin` | מסכי הניהול |

רכיב קורא נתונים עם `useAppSelector` וטוען / משנה אותם עם `useAppDispatch` ו-thunk, למשל `dispatch(fetchSomething())`.

---

## מבנה הפרויקט

```
src/
├── App.tsx            # הניתוב: דפים לפי תפקיד והפניות מכתובות ישנות
├── store/             # Redux: ה-store, ה-slices (state + reducers + thunks) ו-selectors
├── api/               # http.ts - לקוח ה-HTTP שה-thunks משתמשים בו (טוקן, JSON, הודעות שגיאה)
├── pages/             # מסך לכל נתיב (כולל NotFoundPage - עמוד 404)
├── components/        # רכיבים משותפים: מפות, מסך תרומה, התראות, עוזר חכם, אנימציות
├── hooks/             # מעקב חי, אנימציית מיקומים, צ'אט, אנימציות גלילה
├── utils/             # אימות, שגיאות API, עיצוב תאריכים, Google Maps, זמני הגעה
├── types/             # טיפוסי ה-DTO מהשרת
├── styles/            # CSS לפי אזור באתר
└── theme/             # ערכת הנושא של MUI ו-RTL
```

---

פותח על ידי **עדן זכריהו הדס בן עמרם** כפרויקט במדעי המחשב.
