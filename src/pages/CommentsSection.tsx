import React, { useState, useEffect } from 'react';

function CommentItem({ comment, onReply }: { comment: any; onReply: (id: number, author: string) => void }) {
  const authorName = comment.author || comment.Author || comment.authorName || 'אורח';

  return (
    <div style={{ 
      borderRight: '2px solid #0066cc', 
      marginRight: '15px', 
      paddingRight: '12px', 
      marginTop: '10px',
      backgroundColor: '#f9f9f9',
      padding: '8px 12px',
      borderRadius: '4px'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#333', marginBottom: '4px' }}>
        {authorName}
      </div>
      <div style={{ margin: '5px 0', color: '#444' }}>
        {comment.content || comment.Content || comment.text}
      </div>
      
      {/* כפתור מענה לתגובה ספציפית */}
      <button 
        onClick={() => onReply(comment.id, authorName)}
        style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontSize: '0.85em', padding: 0, marginTop: '4px' }}
      >
        הגב
      </button>

      {/* הצגת תגובות הבת ברקורסיה אם קיימות */}
      {((comment.replies && comment.replies.length > 0) || (comment.children && comment.children.length > 0)) && (
        <div style={{ marginTop: '8px' }}>
          {(comment.replies || comment.children).map((child: any, index: number) => (
            <CommentItem key={child.id || index} comment={child} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

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

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען עץ תגובות...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>תגובות (עץ רקורסיבי מהמסד)</h2>
      
      {/* אזור הצגת העץ */}
      <div style={{ marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
        {tree && tree.length > 0 ? (
          tree.map((comment: any, index: number) => (
            <CommentItem 
              key={comment.id || index} 
              comment={comment} 
              onReply={(id, author) => {
                setReplyingToId(id);
                setReplyingToAuthor(author);
              }} 
            />
          ))
        ) : (
          <p style={{ color: '#666', textAlign: 'center' }}>אין תגובות להצגה.</p>
        )}
      </div>

      {/* חיווי ויזואלי כאשר המשתמש מגיב לתגובה ספציפית */}
      {replyingToId && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eef2f7', padding: '6px 10px', borderRadius: '4px', marginBottom: '8px', fontSize: '0.9em' }}>
          <span>מגיב ל-<strong>{replyingToAuthor}</strong></span>
          <button 
            onClick={() => { setReplyingToId(null); setReplyingToAuthor(''); }}
            style={{ background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ביטול
          </button>
        </div>
      )}

      {/* טופס הוספת תגובה */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={newText} 
          onChange={e => setNewText(e.target.value)} 
          placeholder={replyingToId ? `הגב ל-${replyingToAuthor}...` : "הוסף תגובה ראשית..."} 
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
        />
        <button type="submit" style={{ padding: '8px 15px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          שלח
        </button>
      </form>
    </div>
  );
}