import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import { formatDateTime } from '../utils/format';
import type { CommentDto } from '../types/api';

// ניהול תגובות (מנהל). תוקן: העמוד פנה ל-api/admin/comments שלא קיים ובלי טוקן.
// עכשיו: GET api/comments ו-DELETE api/comments/{id} (מוחק גם את כל התשובות שמתחתיה).
export function AdminCommentsManagementPage() {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComments = () => {
    fetch('/api/comments', { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readErrorMessage(res, 'שגיאה בטעינת התגובות.'));
        setComments((await res.json()) as CommentDto[]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת התגובות.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleDeleteComment = async (comment: CommentDto) => {
    if (!window.confirm('למחוק את התגובה ואת כל התשובות אליה?')) return;
    const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) {
      fetchComments();
    } else {
      alert(await readErrorMessage(res, 'שגיאה במחיקת התגובה.'));
    }
  };

  if (loading) return <LoadingBlock text="טוען תגובות..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="ניהול תגובות"
        subtitle="כל התגובות במערכת, מהחדשה לישנה."
      />

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {comments.length === 0 ? (
        <EmptyState text="אין תגובות במערכת." />
      ) : (
        [...comments].reverse().map((item) => (
          <Card
            key={item.id}
            sx={{
              p: { xs: 2.5, md: 3 },
              mb: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{item.authorName}</Typography>
                <Chip size="small" variant="outlined"
                  label={item.donationId ? `תרומה #${item.donationId}` : item.matchId ? `שידוך #${item.matchId}` : 'כללי'} />
                {item.parentCommentId && <Chip size="small" label="תשובה" />}
                <Typography variant="body2" color="text.secondary">{formatDateTime(item.createdAt)}</Typography>
              </Box>
              <Typography color="text.secondary">"{item.text}"</Typography>
            </Box>
            <Button variant="outlined" color="error" onClick={() => void handleDeleteComment(item)}>
              מחק תגובה
            </Button>
          </Card>
        ))
      )}
    </Box>
  );
}
