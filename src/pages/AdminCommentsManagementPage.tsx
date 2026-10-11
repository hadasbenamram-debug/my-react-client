import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';

export function AdminCommentsManagementPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = () => {
    fetch('/api/admin/comments')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setComments(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת תגובות למודרציה:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleDeleteComment = (commentId: number) => {
    fetch(`/api/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => {
        if (res.ok) {
          alert('התגובה הוסרה בהצלחה!');
          fetchComments();
        } else {
          alert('שגיאה במחיקת התגובה.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <LoadingBlock text="טוען תגובות לבדיקה..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="ניהול תגובות ודיווחים"
        subtitle="מעקב וסינון תגובות פוגעניות או מדווחות ברחבי המערכת."
      />

      {comments.length === 0 ? (
        <EmptyState text="אין תגובות הממתינות לטיפול או דיווחים חדשים." />
      ) : (
        comments.map((item) => (
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
                <Chip size="small" color="error" variant="outlined" label={item.reportReason || 'בדיקת מערכת'} />
              </Box>
              <Typography color="text.secondary">"{item.content}"</Typography>
            </Box>
            <Button variant="outlined" color="error" onClick={() => handleDeleteComment(item.id)}>
              מחק תגובה
            </Button>
          </Card>
        ))
      )}
    </Box>
  );
}
