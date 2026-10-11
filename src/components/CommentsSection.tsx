import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { CommentItem } from '../components/CommentParts';

export function CommentsSection() {
  const [tree, setTree] = useState<any[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);

  // States חדשים לניהול מענה לתגובה
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyingToAuthor, setReplyingToAuthor] = useState<string>('');

  // פונקציה לשליפת העץ מהשרת תוך שליחת הטוקן ב-Headers
  const fetchTree = () => {
    const token = localStorage.getItem('token');

    fetch('/api/comments/tree', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת הנתונים');
        return res.json();
      })
      .then(data => {
        setTree(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const token = localStorage.getItem('token');

    fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      // שליחת parentCommentId בהתאם למצב (null אם זו תגובה ראשית, או ה-ID של התגובה שאליה מגיבים)
      body: JSON.stringify({
        content: newText,
        author: 'מתנדב',
        parentCommentId: replyingToId
      })
    }).then(res => {
      if (res.ok) {
        setNewText('');
        setReplyingToId(null);
        setReplyingToAuthor('');
        fetchTree(); // רענון העץ מהמסד
      } else {
        console.error('שגיאה בשמירת התגובה');
      }
    });
  };

  if (loading) return <LoadingBlock text="טוען עץ תגובות..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="מתנדב" title="תגובות" subtitle="שיחה בעץ תגובות. אפשר להגיב לכל תגובה." />

      {/* אזור הצגת העץ */}
      <Box sx={{ mb: 3 }}>
        {tree && tree.length > 0 ? (
          tree.map((comment: any, index: number) => (
            <CommentItem
              key={comment.id || index}
              comment={comment}
              defaultAuthor="אורח"
              onReply={(id: number, author: string) => {
                setReplyingToId(id);
                setReplyingToAuthor(author);
              }}
            />
          ))
        ) : (
          <EmptyState text="אין תגובות להצגה." />
        )}
      </Box>

      <Card sx={{ p: { xs: 2.5, md: 3 } }}>
        {/* חיווי ויזואלי כאשר המשתמש מגיב לתגובה ספציפית */}
        {replyingToId && (
          <Box sx={{ mb: 2 }}>
            <Chip
              color="primary"
              variant="outlined"
              label={<span>מגיב ל-<strong>{replyingToAuthor}</strong></span>}
              onDelete={() => { setReplyingToId(null); setReplyingToAuthor(''); }}
            />
          </Box>
        )}

        {/* טופס הוספת תגובה */}
        <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <TextField
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={replyingToId ? `הגב ל-${replyingToAuthor}...` : 'הוסף תגובה ראשית...'}
          />
          <Button type="submit" variant="contained" sx={{ px: 4, py: 1.75, flexShrink: 0 }}>
            שלח
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
