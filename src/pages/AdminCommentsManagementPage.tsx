import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { CommentRow } from '../components/CommentParts';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
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
        // תיקון 15: אותו עיצוב כמו בלוח התגובות (אות הכותב, שם וזמן, הטקסט בבועה)
        [...comments].reverse().map((item) => (
          <Card key={item.id} sx={{ p: { xs: 2, md: 2.5 }, mb: 1.5 }}>
            <CommentRow authorName={item.authorName} text={item.text} createdAt={item.createdAt}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {/* תיקון 18: כל תגובה שייכת לתרומה - אין יותר "שיבוץ" או "כללי" */}
                  <Chip size="small" variant="outlined"
                    label={`תרומה #${item.donationId}${item.donationSupplierName ? ` – ${item.donationSupplierName}` : ''}`} />
                  {item.parentCommentId && <Chip size="small" label="תשובה לתגובה" />}
                </Box>
                <Button size="small" variant="text" color="error" sx={{ px: 1 }} onClick={() => void handleDeleteComment(item)}>
                  מחיקת התגובה
                </Button>
              </Box>
            </CommentRow>
          </Card>
        ))
      )}
    </Box>
  );
}
