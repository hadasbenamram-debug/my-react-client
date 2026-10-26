import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import ScaleIcon from '@mui/icons-material/Scale';
import TimerIcon from '@mui/icons-material/Timer';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PageTitle from '../components/PageTitle';
import StatGrid from '../components/StatGrid';
import { LoadingBlock } from '../components/PageParts';
import type { SystemReportDto } from '../types/api';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';

// דוחות וסטטיסטיקות למנהל.
// תיקון 17: "מובילי ביצועי מתנדבים" הציג 0 משלוחים מוצלחים גם אחרי משלוח שהושלם - המספר היה קבוע בשרת.
// עכשיו השרת סופר משלוחים שהושלמו ומדרג לפיהם, וגם שלושת המספרים בראש הדף מחושבים מהנתונים בפועל
// (בעבר: "4 דקות", "95%" ומספר המתנדבים כפול 50). "—" = עוד אין נתונים.

const deliveriesText = (count: number) => (count === 1 ? 'משלוח מוצלח אחד' : `${count} משלוחים מוצלחים`);

export function AdminReportsPage() {
  const [reports, setReports] = useState<SystemReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/volunteers/reports', { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) {
          setError(await readErrorMessage(res, 'לא הצלחנו לטעון את הדוחות. נא לרענן את הדף.'));
          return;
        }
        setReports((await res.json()) as SystemReportDto);
      })
      .catch(() => setError('לא הצלחנו לטעון את הדוחות. נא לבדוק את החיבור ולרענן את הדף.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock text="טוען דוחות מערכתיים..." />;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="דוחות וסטטיסטיקות"
        subtitle="כמות המזון שהגיעה לעמותות, זמני התגובה של המתנדבים, אחוז ההצלחה וביצועי המתנדבים. מחושב מכל הפעילות במערכת עד עכשיו."
      />

      {error || !reports ? (
        <Alert severity="error">{error || 'לא הצלחנו לטעון את הדוחות. נא לרענן את הדף.'}</Alert>
      ) : (
        <>
          <StatGrid
            columns={3}
            cards={[
              { label: 'ק"ג מזון שהגיעו לעמותות', value: reports.totalDonationsVolume.toLocaleString('he-IL'), icon: <ScaleIcon /> },
              { label: 'דקות בממוצע עד שמתנדב עונה להצעה', value: reports.averageResponseTime, icon: <TimerIcon /> },
              { label: 'מהתרומות שהסתיימו הגיעו לעמותה', value: reports.successRate, icon: <TaskAltIcon /> },
            ]}
          />

          <Card sx={{ p: { xs: 3, md: 4 }, mt: 3 }}>
            <Typography variant="h6" component="h2">מובילי ביצועי מתנדבים</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>לפי מספר המשלוחים שהושלמו</Typography>
            {reports.topVolunteers.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 2 }}>עוד אין משלוחים שהושלמו.</Typography>
            ) : (
              <List>
                {reports.topVolunteers.map((vol, index) => (
                  <ListItem key={`${index}-${vol.name}`} disableGutters>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={vol.name} secondary={deliveriesText(vol.deliveriesCount)} />
                  </ListItem>
                ))}
              </List>
            )}
          </Card>
        </>
      )}
    </Box>
  );
}
