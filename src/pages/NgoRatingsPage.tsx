import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import type { CreateFeedbackDto } from '../types/api';

// דירוג אחרי אישור קבלה. תוקן: העמוד שלח ל-api/ratings שלא קיים.
// עכשיו: POST api/feedbacks עם מזהה השידוך. דירוג המתנדב משפיע על ציון האמינות שלו בשיבוצים הבאים.
export function NgoRatingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const matchId = Number(id);

  const [rating, setRating] = useState(5);
  const [volunteerRating, setVolunteerRating] = useState(5);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload: CreateFeedbackDto = { matchId, rating, volunteerRating, comments: comments.trim() || null };
    const res = await fetch('/api/feedbacks', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(payload) });
    setLoading(false);

    if (res.ok) {
      alert('תודה! הדירוג נשמר.');
      navigate('/app/ngo/dashboard');
    } else {
      setError(await readErrorMessage(res, 'שגיאה בשמירת הדירוג.'));
    }
  };

  if (!matchId) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto' }}>
        <PageTitle eyebrow="עמותה" title="דירוג ומשוב" />
        <Alert severity="info">אפשר לדרג מסירה אחרי אישור הקבלה שלה (בעמוד "אישור קבלת תרומה").</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <PageTitle eyebrow="עמותה" title="דירוג ומשוב לאחר מסירה" subtitle="הדירוג שלכם עוזר לשפר את השיבוצים הבאים." />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Box>
              <Typography color="text.secondary" sx={{ mb: 0.5, fontSize: '0.9rem' }}>התרומה (איכות / כמות)</Typography>
              <Rating size="large" value={rating} onChange={(_, value) => setRating(value || 1)} />
            </Box>
            <Box>
              <Typography color="text.secondary" sx={{ mb: 0.5, fontSize: '0.9rem' }}>המתנדב (זמינות, אדיבות, זמן הגעה)</Typography>
              <Rating size="large" value={volunteerRating} onChange={(_, value) => setVolunteerRating(value || 1)} />
            </Box>
            <TextField
              label="הערות / משוב"
              multiline
              minRows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              helperText={`${comments.length}/500 תווים`}
            />
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 4 }}>
            {loading ? 'שולח...' : 'שלח דירוג'}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
