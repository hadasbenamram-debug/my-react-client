import React, { useState, useEffect } from 'react';
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
import PageTitle from '../components/PageTitle.jsx';
import StatGrid from '../components/StatGrid.jsx';
import { LoadingBlock } from '../components/PageParts.jsx';

export function AdminReportsPage() {
  const [reports, setReports] = useState<any>({
    totalDonationsVolume: 0,
    averageResponseTime: '0 דקות',
    successRate: '0%',
    topVolunteers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // שליפת טוקן ההתחברות (ודאי שהמפתח תואם למה ששמור אצלכם בפרויקט, לדוגמה 'token' או 'jwt')
    const token = localStorage.getItem('token');

    fetch('/api/admin/volunteers/reports', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`שגיאה בשרת: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת דוחות וסטטיסטיקות:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="טוען דוחות מערכתיים..." />;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="דוחות וסטטיסטיקות"
        subtitle="ניתוח נפחי תרומות, זמני תגובה, אחוזי הצלחה וביצועי מתנדבים."
      />

      <StatGrid
        columns={3}
        cards={[
          { label: 'נפח תרומות כולל (ק"ג)', value: reports.totalDonationsVolume, icon: <ScaleIcon /> },
          { label: 'זמן תגובה ממוצע', value: reports.averageResponseTime, icon: <TimerIcon /> },
          { label: 'אחוז הצלחה', value: reports.successRate, icon: <TaskAltIcon /> },
        ]}
      />

      <Card sx={{ p: { xs: 3, md: 4 }, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>מובילי ביצועי מתנדבים</Typography>
        {(!reports.topVolunteers || reports.topVolunteers.length === 0) ? (
          <Typography color="text.secondary">אין נתונים זמינים כרגע.</Typography>
        ) : (
          <List>
            {reports.topVolunteers.map((vol: any, index: number) => (
              <ListItem key={index} disableGutters>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>
                    {index + 1}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={vol.name} secondary={`${vol.deliveriesCount} משלוחים מוצלחים`} />
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
}
