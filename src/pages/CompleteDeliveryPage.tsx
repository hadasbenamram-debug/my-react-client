import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { StatusAlert } from '../components/FormParts';

export function CompleteDeliveryPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');

  // טעינה ראשונית של השידוכים הפעילים מהשרת כדי לוודא שיש התאמה אמיתית
  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch('/api/matches/active', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת הנתונים');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // מציאת שידוך רלוונטי או לקיחת השידוך הפעיל הראשון
          setActiveMatch(data[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה:', err);
        setLoading(false);
      });
  }, []);

  const handleCompleteDelivery = async () => {
    if (!activeMatch) return;
    
    setActionLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');

      // פנייה לנתיב הקיים בשרת לסיום השידוך לפי מזהה השידוך האמיתי
      const response = await fetch(`/api/matches/${activeMatch.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingBlock text="בודק התאמות ושיבוצים פעילים..." />;

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
        ) : !activeMatch ? (
          // הכפתור לא מוצג כל עוד אין התאמה או שיבוץ פעיל אמיתי במסד הנתונים
          <EmptyState text="אין כרגע שיבוץ פעיל או התאמה הממתינים לאישור המסירה שלך." />
        ) : (
          <Box>
            <Typography variant="body1" sx={{ mb: 3 }}>
              נמצא שיבוץ פעיל עבור תרומה #{activeMatch.donationId || activeMatch.id}. ניתן לאשר את המסירה:
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleCompleteDelivery}
              disabled={actionLoading}
            >
              {actionLoading ? 'מעדכן...' : 'אישור מסירה וסיום שיבוץ'}
            </Button>
            <StatusAlert message={error} success={false} />
          </Box>
        )}
      </Card>
    </Box>
  );
}