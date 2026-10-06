# מיזוג הפרויקטים - סיכום

## מה נעשה
- כל 43 העמודים (Pages) מפרויקט **secound** הועברו לתוך `src/pages/` בפרויקט **First**, בלי לשנות את התוכן הפנימי שלהם (רק שני תיקוני שם ייצוא, ראו למטה).
- `App.jsx` עודכן: כל העמודים מוגדרים כ-Route חדש בנתיב `/app/...`, ומוצגים בתוך אותו `Layout` (Header + SideMenu + Footer) שכבר קיים בפרויקט First. דף הבית (`/`) ודף יצירת הקשר (`/contact`) נשארו כמו שהיו.
- **התפריט הצדדי (SideMenu) נבנה מחדש**: התפריט הישן (שגלל לסקשנים בעמוד הבית) פוצל לקבוצה ראשונה ("עמוד הבית"), ונוספו לו קבוצות מתקפלות (accordion) לכל אזור: כללי, אזור מתנדב, אזור ספק/עסק, אזור עמותה, ניהול מערכת, מפה ומסלולים - עם קישור אמיתי (Route) לכל עמוד.
- `data.js`: `NAV_ITEMS` הוחלף במבנה `NAV_GROUPS` (קבוצות עם items). שאר הקבצים (SOCIALS, SCENES, MAP_* וכו') לא נגעו בהם.
- `menu.css` עודכן כדי לתמוך בקבוצות המתקפלות ובגלילה (התפריט התארך משמעותית).

## מבנה הפרויקטים נשמר
- קבצי הרכיבים המקוריים של First (Header, Footer, HomePage, ContactPage, האנימציות וכו') לא נגעו בהם.
- קבצי ה-pages/*.tsx נשמרו כפי שהיו (סטייל, לוגיקה, קריאות fetch) - רק הועברו למיקום החדש.

## דברים שכדאי לדעת
1. **שני תיקוני באג קטנים בקבצים המקוריים** (בלי זה הפרויקט secound לא היה יכול לקמפל):
   - `IncomingRequestPage.tsx` ייצא בטעות פונקציה בשם `IncomingDonationsPage` (כפילות עם הקובץ האחר) - תוקן ל-`IncomingRequestPage`.
   - `RegisterPage.tsx` ייצא בטעות פונקציה בשם `ProfilePage` - תוקן ל-`RegisterPage`.
2. **קבצים שלא היו מקושרים בכלל בפרויקט secound המקורי** (לא היה להם Route), ועכשיו כן חיברתי אותם לתפריט:
   - `ForgotPasswordPage.tsx` → `/app/forgot-password` (בקבוצת "כללי").
   - `VolunteersPage.tsx` → `/app/admin/volunteers` (בקבוצת "ניהול מערכת").
3. **`RegisterPage.tsx` לא חובר לתפריט** - התוכן שלו כפול/דומה מאוד ל-`ProfilePage.tsx` (עדכון פרופיל + סיסמה), כדי לא ליצור שני קישורים מבלבלים לאותו דבר בערך. הקובץ נשאר בתיקייה `src/pages` אם תרצו לבדוק/למחוק אותו.
4. **קבצים שלא הועברו כלל**, כי לא היו בשימוש בפועל בפרויקט secound (לא יובאו ב-App.jsx שלו):
   - כל תיקיית `src/app/*` (Angular: `app.routes.ts`, `task-detail`, `tasks` וכו'), `main.ts`, `main.server.ts`, `server.ts`, `app.html` - נראה כמו שרידים מפרויקט Angular/SSR ולא קוד React בשימוש.
   - `components/Navbar.tsx`, `App.css`, `assets/hero.png`, `assets/react.svg`, `assets/vite.svg` - לא היו מיובאים משום מקום.
5. הוספתי `package.json`, `vite.config.js` ו-`index.html` בסיסיים כדי שהפרויקט המאוחד יהיה ניתן להרצה (`npm install && npm run dev`). התלות היחידה החדשה שנדרשה היא `@microsoft/signalr` (בשימוש ב-`NotificationsPage.tsx`).

## בדיקות שביצעתי
- כל קובצי ה-`.jsx`/`.tsx` עברו בדיקת syntax (esbuild) בהצלחה.
- אימתתי שכל ה-imports בין הקבצים מפנים לקבצים/ייצואים שקיימים בפועל.
