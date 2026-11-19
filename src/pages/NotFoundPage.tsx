import Box from '@mui/material/Box';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import PageTitle from '../components/PageTitle';
import { EmptyState } from '../components/PageParts';

export interface NotFoundPageProps {
  /** לאן מחזיר הכפתור הראשי (ברירת מחדל: דף הבית) */
  homePath?: string;
}

// עמוד 404: כתובת שלא קיימת באתר. מוצג בתוך ה-Layout (כותרת ותפריט נשארים), עם דרך חזרה.
export function NotFoundPage({ homePath = '/' }: NotFoundPageProps) {
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <PageTitle eyebrow="שגיאה 404" title="העמוד לא נמצא" />
      <EmptyState
        icon={<SearchOffIcon fontSize="large" />}
        title="אין כאן כלום"
        text="ייתכן שהקישור שגוי או שהעמוד הוסר. אפשר לחזור לדף הבית ולהמשיך משם."
        action={{ label: 'חזרה לדף הבית', to: homePath }}
        secondaryAction={{ label: 'צור קשר', to: '/contact' }}
      />
    </Box>
  );
}
