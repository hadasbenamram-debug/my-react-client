import React, { useState, useEffect } from 'react';

export function AssignmentHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // שליפת הטוקן מתוך האחסון המקומי
    const token = localStorage.getItem('token');

    // פנייה לנתיב הפעיל שמתאים למתנדב ומקבל הזדהות
    fetch('/api/matches/active', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען היסטוריה מהשרת...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>היסטוריית שיבוצים (מהמסד)</h2>
      {history.length === 0 ? (
        <p>אין היסטוריית שיבוצים זמינה.</p>
      ) : (
        history.map((item, idx) => (
          <div key={idx} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #ddd' }}>
            <p><strong>מזהה שיבוץ:</strong> #{item.id} | <strong>סטטוס:</strong> {item.status}</p>
          </div>
        ))
      )}
    </div>
  );
}