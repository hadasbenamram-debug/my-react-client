import React, { useState, useEffect } from 'react';

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

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען תגובות לבדיקה...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>ניהול תגובות ודיווחים (מודרציה)</h2>
      <p>מעקב וסינון תגובות פוגעניות או מדווחות ברחבי המערכת.</p>

      {comments.length === 0 ? (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>אין תגובות הממתינות לטיפול או דיווחים חדשים.</p>
        </div>
      ) : (
        comments.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p><strong>מאת:</strong> {item.authorName}</p>
              <p><strong>תוכן:</strong> "{item.content}"</p>
              <p><strong>סיבת דיווח:</strong> <span style={{ color: '#c62828' }}>{item.reportReason || 'בדיקת מערכת'}</span></p>
            </div>
            <div>
              <button 
                onClick={() => handleDeleteComment(item.id)} 
                style={{ padding: '8px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                מחק תגובה
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}