import React, { useState, useEffect } from 'react';

// קומפוננטה רקורסיבית להצגת תגובה והתגובות הבנות שלה
function CommentItem({ comment, onReply }: { comment: any; onReply: (id: number, author: string) => void }) {
  const authorName = comment.author || comment.Author || comment.authorName || 'אורח';
  const commentContent = comment.content || comment.Content || comment.text;
  const repliesList = comment.replies || comment.children || [];

  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReplyInput(false);
  };

  return (
    <div style={{ 
      borderRight: '2px solid #0066cc', 
      marginRight: '15px', 
      paddingRight: '12px', 
      marginTop: '10px',
      backgroundColor: '#f9f9f9',
      padding: '10px 12px',
      borderRadius: '4px'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#333', marginBottom: '4px' }}>
        {authorName}
      </div>
      <div style={{ margin: '5px 0', color: '#444', fontSize: '0.95em' }}>
        {commentContent}
      </div>
      
      {/* כפתור פתיחת שורת מענה */}
      <button 
        onClick={() => setShowReplyInput(!showReplyInput)}
        style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontSize: '0.85em', padding: 0, marginTop: '4px', fontWeight: 'bold' }}
      >
        {showReplyInput ? 'ביטול' : 'הגב'}
      </button>

      {/* שורת קלט להוספת תגובה בתוך שרשור */}
      {showReplyInput && (
        <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input 
            type="text" 
            value={replyText} 
            onChange={e => setReplyText(e.target.value)} 
            placeholder={`הגב ל-${authorName}...`} 
            style={{ flex: 1, padding: '6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
          />
          <button type="submit" style={{ padding: '6px 12px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
            שלח
          </button>
        </form>
      )}

      {/* הצגת תגובות הבת ברקורסיה אם קיימות */}
      {repliesList.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {repliesList.map((child: any, index: number) => (
            <CommentItem key={child.id || index} comment={child} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SupplierCommentsPage() {
  const [tree, setTree] = useState<any[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);

  // פונקציה לשליפת העץ מהשרת עם טוקן אבטחה
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
        author: 'ספק', 
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

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען תגובות...</div>;

  return (
    <div style={{ maxWidth: '650px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>תגובות על תרומה</h2>
      
      {/* אזור הצגת עץ התגובות */}
      <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '500px', overflowY: 'auto' }}>
        {tree.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center' }}>אין תגובות כרגע.</p>
        ) : (
          tree.map((comment: any, index: number) => (
            <CommentItem 
              key={comment.id || index} 
              comment={comment} 
              onReply={(parentId, replyText) => handleAddComment(parentId, replyText)} 
            />
          ))
        )}
      </div>

      {/* טופס הוספת תגובה ראשית חדשה */}
      <form onSubmit={(e) => { e.preventDefault(); if (newText.trim()) handleAddComment(null, newText); }} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={newText} 
          onChange={e => setNewText(e.target.value)} 
          placeholder="הוסף תגובה ראשית חדשה..." 
          style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
        />
        <button type="submit" style={{ padding: '10px 18px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
          שלח תגובה
        </button>
      </form>
    </div>
  );
}