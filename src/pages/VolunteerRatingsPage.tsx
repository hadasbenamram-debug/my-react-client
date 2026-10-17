import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { FeedbackView } from '../types/api';

export function VolunteerRatingsPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // שליפת הטוקן מהאחסון המקומי
    const token = localStorage.getItem('token');

    fetch('/api/feedbacks', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת המשובים מהשרת');
        return res.json();
      })
      .then((data: FeedbackView[]) => {
        setFeedbacks(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="טוען משובים ודירוגים..." />;
  if (error) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle
        eyebrow="מתנדב"
        title="דירוגים ומשוב"
        subtitle="כאן מוצגים המשובים והדירוגים שהתקבלו על פעילות המתנדבים במערכת."
      />

      {feedbacks.length === 0 ? (
        <EmptyState text="אין משובים זמינים כרגע במסד הנתונים." />
      ) : (
        feedbacks.map((fb, idx) => (
          <Card key={idx} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>{fb.volunteerName || 'מתנדב'}</Typography>
              {/* דירוג המתנדב (משפיע על ציון האמינות שלו); fb.rating הוא דירוג התרומה עצמה */}
              {fb.volunteerRating ? (
                <Rating value={Number(fb.volunteerRating)} precision={0.5} readOnly />
              ) : (
                <Typography color="text.secondary">N/A</Typography>
              )}
            </Box>
            <Typography color="text.secondary">{fb.comments || 'אין תוכן למשוב'}</Typography>
          </Card>
        ))
      )}
    </Box>
  );
}
