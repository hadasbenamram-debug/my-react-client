import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';

export function NgoRatingsPage() {
  const { id } = useParams(); // שליפת ה-ID אוטומטית מכתובת ה-URL
  const navigate = useNavigate();

  const [ratingData, setRatingData] = useState({
    targetType: 'Volunteer', // Volunteer או Supplier
    targetId: id || '',      // נשמר ב-State מאחורי הקלעים
    score: 5,
    comment: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem('token');

    fetch('/api/ratings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...ratingData,
        targetId: Number(ratingData.targetId)
      })
    })
      .then(res => {
        setLoading(false);
        if (res.ok) {
          alert('הדירוג והמשוב נשמרו בהצלחה!');
          navigate('/dashboard'); // חזרה לדשבורד לאחר שליחה מוצלחת
        } else {
          alert('שגיאה בשמירת הדירוג.');
        }
      })
      .catch(err => {
        setLoading(false);
        console.error('שגיאת תקשורת:', err);
      });
  };

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <PageTitle eyebrow="עמותה" title="דירוג ומשוב לאחר מסירה" subtitle="הדירוג שלכם עוזר לשפר את השיבוצים הבאים." />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gap: 3 }}>
            <TextField
              select
              label="סוג דירוג"
              value={ratingData.targetType}
              onChange={(e) => setRatingData({ ...ratingData, targetType: e.target.value })}
            >
              <MenuItem value="Volunteer">מתנדב</MenuItem>
              <MenuItem value="Supplier">ספק (תורם)</MenuItem>
            </TextField>

            <Box>
              <Typography color="text.secondary" sx={{ mb: 0.5, fontSize: '0.9rem' }}>ציון</Typography>
              <Rating
                size="large"
                value={ratingData.score}
                onChange={(_, value) => setRatingData({ ...ratingData, score: value || 1 })}
              />
            </Box>

            <TextField
              label="הערות / משוב"
              multiline
              minRows={4}
              value={ratingData.comment}
              onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              helperText={`${ratingData.comment.length}/500 תווים`}
            />
          </Box>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 4 }}>
            {loading ? 'שולח...' : 'שלח דירוג'}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
