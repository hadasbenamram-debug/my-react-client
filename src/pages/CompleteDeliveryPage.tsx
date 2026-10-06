import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import PageTitle from '../components/PageTitle.jsx';
import { StatusAlert } from '../components/FormParts.jsx';

export function CompleteDeliveryPage() {
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');

  // מזהה המסלול יכול להיות מועבר כפרופ (Props) או מוגדר באופן דינמי
  const volunteerRouteId = 104;

  const handleCompleteDelivery = async () => {
    setLoading(true);
    setError('');
    try {
      // שליפת טוקן ההתחברות מהאחסון המקומי
      const token = localStorage.getItem('token');

      const response = await fetch('/api/deliverylogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          volunteerRouteId: volunteerRouteId,
          status: 'Completed'
        })
      });

      if (response.ok) {
        setIsCompleted(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'שגיאה בעדכון הנתונים מול השרת.');
      }
    } catch (err) {
      setError('שגיאת תקשורת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <PageTitle
        eyebrow="מתנדב"
        title="מסירה לעמותה"
        subtitle="אחרי שהתרומה נמסרה, אשרו את המסירה כדי לסגור את השיבוץ."
      />

      <Card sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
        {isCompleted ? (
          <Box>
            <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'primary.dark', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1 }}>
              המסירה הושלמה
            </Typography>
            <Typography color="text.secondary">
              הסטטוס עודכן בהצלחה. תודה רבה על ההתנדבות!
            </Typography>
          </Box>
        ) : (
          <Box>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleCompleteDelivery}
              disabled={loading}
            >
              {loading ? 'מעדכן...' : 'אישור מסירה וסיום שיבוץ'}
            </Button>
            <StatusAlert message={error} success={false} />
          </Box>
        )}
      </Card>
    </Box>
  );
}
