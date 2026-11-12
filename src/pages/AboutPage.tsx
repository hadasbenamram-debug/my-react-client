import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import '../styles/about.css';

// תיקון 59: עמוד "אודות" (/about).
// למעלה: רקע הפסים, כותרת גדולה בטורקיז ועיגול שחור שיושב על הגבול בין הרקע האפור ללבן.
// אחר כך: עיגול טורקיז עם "AB—UT" וחץ מסולסל לצד הטקסט, "איך זה עובד" בארבעה שלבים
// (שורה אחת במחשב, אחד מתחת לשני בטלפון), שלושת השותפים, וכפתורי הרשמה לכל תפקיד.

interface Step {
  title: string;
  text: string;
  icon: ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'תורמים ומשתפים',
    text: 'עסקים וארגונים מעלים לאתר תרומות מזון זמינות, מציינים מה ניתן לתרום, באיזו כמות, היכן ניתן לאסוף ועד מתי המזון זמין.',
    icon: <StorefrontOutlinedIcon />,
  },
  {
    title: 'מוצאים את החיבור הנכון',
    text: 'המערכת מאתרת את המתנדבים המתאימים ואת העמותות שיכולות לקבל את התרומה, תוך התחשבות במיקום, בזמינות, בשעות הקבלה וביכולת ההובלה.',
    icon: <HubOutlinedIcon />,
  },
  {
    title: 'המתנדבים יוצאים לדרך',
    text: 'המתנדב מקבל הצעת משימה עם פרטי האיסוף והמסירה. לאחר אישורו, הוא יוצא לאסוף את התרומות ולהעבירן לעמותה המיועדת, בהתאם למסלול שנקבע עבורו.',
    icon: <LocalShippingOutlinedIcon />,
  },
  {
    title: 'התרומה מגיעה ליעדה',
    text: 'העמותה מאשרת את קבלת המזון, וכך אנחנו יודעים שהתרומה השלימה את דרכה והגיעה למקום שבו היא יכולה לעשות טוב.',
    icon: <VolunteerActivismOutlinedIcon />,
  },
];

const PARTNERS = [
  {
    title: 'עסקים וארגונים תורמים',
    text: 'נשאר לכם מזון טוב שאפשר להעביר הלאה? במקום שיישאר ללא שימוש, תוכלו לפרסם אותו אצלנו ולחבר אותו לעמותות שזקוקות לו. התרומה שלכם יכולה להפוך להזדמנות עבור מישהו אחר.',
  },
  {
    title: 'עמותות וארגוני סיוע',
    text: 'זקוקים לתרומות מזון? הצטרפו למערכת, הגדירו את שעות הקבלה שלכם והתחברו למערך תרומות ומתנדבים שיסייע להביא אליכם את המזון.',
  },
  {
    title: 'מתנדבים',
    text: 'יש לכם רכב, זמן ורצון לעשות טוב? אתם יכולים להיות החוליה שמחברת בין התרומה למי שמחכה לה. הצטרפו כמתנדבים, הגדירו את הזמינות שלכם וקבלו הצעות למשימות איסוף והעברה שמתאימות לכם.',
  },
];

const SIGNUPS = [
  { label: 'הרשמה כספק / תורם', to: '/app/register-supplier' },
  { label: 'הרשמה כמתנדב/ת', to: '/app/register-volunteer' },
  { label: 'הרשמת עמותה', to: '/app/register-ngo' },
];

export function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="about-page">
      {/* ── פתיחה ── */}
      <section className="about-hero">
        <h1 className="about-hero-title">
          מה אם עודפי המזון של אחד
          <br />
          יהפכו להזדמנות של מישהו אחר?
        </h1>
        <div className="about-hero-circle">
          <p>אנחנו כאן כדי<br />לשנות מציאות.</p>
        </div>
      </section>

      {/* ── ABOUT + הסיפור ── */}
      <section className="about-story">
        <div className="about-mark" aria-hidden="true">
          <span className="about-mark-circle" />
          <span className="about-mark-word">
            <span>AB<span className="about-mark-dash" /></span>
            <span>UT</span>
          </span>
          <svg className="about-mark-arrow" viewBox="0 0 300 150">
            <path d="M8 118 C40 70 70 52 60 104 C52 140 18 132 36 96 C62 44 150 2 248 46 C262 52 276 62 286 74"
              fill="none" stroke="#161616" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M286 30 L290 82 L248 70" fill="none" stroke="#161616" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="about-text">
          <p>
            בכל יום נשארים בעסקים ובארגונים עודפי מזון טובים וראויים לשימוש. במקביל, יש עמותות וארגוני סיוע
            שיכולים להשתמש בדיוק באותו מזון כדי לעזור לאנשים הזקוקים לכך.
          </p>
          <p>
            בין המזון שיכול להינתן לבין מי שזקוק לו, עומד לעיתים אתגר אחד משמעותי:
            <strong> איך לגרום לכל זה לקרות?</strong>
          </p>
          <p className="about-strong">כאן אנחנו נכנסים לתמונה.</p>
          <p>
            <strong>״לתת באהבה״</strong> נולדה מתוך רצון להפוך עודפי מזון להזדמנות אמיתית לעשיית טוב. יצרנו פלטפורמה
            שמחברת בין עסקים וארגונים התורמים מזון, עמותות הזקוקות לו ומתנדבים שמוכנים להקדיש מזמנם כדי להעביר
            אותו ליעדו.
          </p>
          <p>
            אנחנו מאמינים שלכל תרומה יש ערך, ושלפעמים כל מה שצריך כדי לעשות שינוי הוא
            <strong> לחבר בין האנשים הנכונים.</strong>
          </p>
        </div>
      </section>

      {/* ── איך זה עובד ── */}
      <section className="about-how">
        <h2 className="about-h2">איך זה עובד?</h2>
        <p className="about-lead">אנחנו הופכים את תהליך התרומה לפשוט, מסודר ונגיש:</p>
        <ol className="about-steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="about-step">
              <span className="about-step-icon" aria-hidden="true">{step.icon}</span>
              <span className="about-step-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="about-note">
          מאחורי כל השלבים האלה עומדת מערכת שמסייעת לתאם בין כל המשתתפים, לחסוך זמן ולהפוך את תהליך העברת
          המזון ליעיל ומאורגן יותר.
        </p>
      </section>

      {/* ── שלושה שותפים ── */}
      <section className="about-partners">
        <h2 className="about-h2">שלושה שותפים. מטרה אחת.</h2>
        <p className="about-lead">כדי ליצור שינוי אמיתי, כל אחד יכול להיות חלק מהדרך.</p>
        <div className="about-partner-grid">
          {PARTNERS.map((partner) => (
            <article key={partner.title} className="about-partner">
              <h3>{partner.title}</h3>
              <p>{partner.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── למה ── */}
      <section className="about-why">
        <h2 className="about-h2">למה אנחנו עושים את זה?</h2>
        <p>
          אנחנו רוצים ליצור מציאות שבה פחות מזון טוב הולך לאיבוד, יותר תרומות מגיעות ליעדן, ויותר אנשים
          וארגונים יכולים ליהנות מכוחו של שיתוף פעולה.
        </p>
        <p>
          אנחנו מאמינים שנתינה לא חייבת להיות מסובכת. כשמחברים בין מי שיש לו, מי שזקוק ומי שמוכן לעזור –
          אפשר להפוך כוונה טובה לעשייה של ממש.
        </p>
        <p>
          כל עסק שתורם, כל עמותה שמצטרפת וכל מתנדב שיוצא לדרך הם חלק מאותה שרשרת של נתינה.
        </p>
      </section>

      {/* ── הצטרפות ── */}
      <section className="about-join">
        <h2 className="about-h2">מצטרפים למעגל הנתינה ❤️</h2>
        <p>
          לא צריך לעשות הכול לבד כדי ליצור שינוי. לפעמים מספיק להיות החוליה שמחברת בין אדם לאדם, בין תרומה
          להזדמנות ובין רצון טוב למעשה.
        </p>
        <p className="about-strong">הצטרפו אלינו והיו חלק ממשהו טוב יותר.</p>
        <div className="about-signups">
          {SIGNUPS.map((s) => (
            <Link key={s.to} to={s.to} className="about-signup">{s.label}</Link>
          ))}
        </div>
        <p className="about-closing">
          <strong>לתת באהבה</strong> – כי ביחד, אפשר להעביר הרבה יותר ממזון. אפשר להעביר תקווה.
        </p>
      </section>
    </div>
  );
}
