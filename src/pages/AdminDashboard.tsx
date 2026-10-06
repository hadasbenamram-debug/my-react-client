import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PageTitle from '../components/PageTitle.jsx';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    openDonations: 0,
    availableVolunteers: 0,
    activeAssignments: 0,
    noShowAlerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // שליפת נתונים סטטיסטיים או דשבורד מהשרת עבור מנהל מערכת
    fetch('/api/admin/dashboard-stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת הנתונים הניהוליים:', err);
        // ערכי ברירת מחדל במקרה שהשרת לא זמין כרגע
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>טוען נתוני ניהול...</Typography>
      </Box>
    );
  }

  const cards = [
    { label: 'תרומות פתוחות', value: stats.openDonations, icon: <VolunteerActivismIcon />, alert: false },
    { label: 'מתנדבים זמינים', value: stats.availableVolunteers, icon: <GroupsIcon />, alert: false },
    { label: 'שיבוצים פעילים', value: stats.activeAssignments, icon: <LocalShippingIcon />, alert: false },
    { label: 'התראות No-Show', value: stats.noShowAlerts, icon: <WarningAmberIcon />, alert: true },
  ];

  return (
    <Box>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="דשבורד ניהולי"
        subtitle="מבט על מערכתי לתפעול ובקרה שוטפת של מערך הצלת המזון."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
        }}
      >
        {cards.map((card) => (
          <Card
            key={card.label}
            sx={{
              p: 3.5,
              textAlign: 'center',
              borderColor: card.alert ? 'error.light' : undefined,
              backgroundColor: card.alert ? '#fdf3f3' : undefined,
            }}
          >
            <Box sx={{ color: card.alert ? 'error.main' : 'primary.dark', mb: 1 }}>{card.icon}</Box>
            <Typography
              sx={{
                direction: 'ltr',
                fontSize: { xs: '2.4rem', md: '3rem' },
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: card.alert ? 'error.main' : 'primary.main',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {card.value}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: '0.95rem' }}>
              {card.label}
            </Typography>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
