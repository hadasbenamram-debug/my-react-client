import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { CommentItem } from '../components/CommentParts';

export function NgoCommentsPage() {
  const [tree, setTree] = useState<any[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);

  // שליפת העץ מהשרת עם טוקן אבטחה
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
        setTree(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת עץ התגובות:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // פונקציה אחידה לשליחת תגובה (ראשית או תגובת-בת)
  const handleAddComment = (parentId: number | null, textToSend: string) => {
    const token = localStorage.getItem('token');

    fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      // שמות השדות מותאמים בדיוק ל-DTO בצד השרת (content, author, parentCommentId)
      body: JSON.stringify({
        content: textToSend,
        author: 'עמותה',
        parentCommentId: parentId
      })
    }).then(res => {
      if (res.ok) {
        if (parentId === null) setNewText(''); // איפוס השדה הראשי בלבד אם זו תגובה ראשית
        fetchTree(); // רענון עץ התגובות מהמסד
      } else {
        console.error('שגיאה בשמירת התגובה');
      }
    });
  };

  if (loading) return <LoadingBlock text="טוען תגובות..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="עמותה" title="תגובות עמותה" subtitle="שיחה בעץ תגובות. אפשר להגיב לכל תגובה." />

      {/* אזור הצגת עץ התגובות */}
      <Box sx={{ mb: 3 }}>
        {tree.length === 0 ? (
          <EmptyState text="אין תגובות כרגע במסד הנתונים." />
        ) : (
          tree.map((comment: any, index: number) => (
            <CommentItem
              key={comment.id || index}
              comment={comment}
              inline
              defaultAuthor="עמותה"
              onReply={(parentId: number, replyText: string) => handleAddComment(parentId, replyText)}
            />
          ))
        )}
      </Box>

      {/* טופס הוספת תגובה ראשית חדשה */}
      <Card sx={{ p: { xs: 2.5, md: 3 } }}>
        <Box
          component="form"
          onSubmit={(e: React.FormEvent) => { e.preventDefault(); if (newText.trim()) handleAddComment(null, newText); }}
          sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
        >
          <TextField
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="הוסף תגובה ראשית חדשה..."
          />
          <Button type="submit" variant="contained" sx={{ px: 4, py: 1.75, flexShrink: 0 }}>
            שלח תגובה
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
