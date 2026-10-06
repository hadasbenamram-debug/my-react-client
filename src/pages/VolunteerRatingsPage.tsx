import React, { useState, useEffect } from 'react';

export function VolunteerRatingsPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // שליפת הטוקן מהאחסון המקומי
    const token = localStorage.getItem('token');

    fetch('/api/feedbacks', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת המשובים מהשרת');
        return res.json();
      })
      .then(data => {
        setFeedbacks(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען משובים ודירוגים...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#c62828' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>דירוגים ומשוב (מהמסד)</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>כאן מוצגים המשובים והדירוגים שהתקבלו על פעילות המתנדבים במערכת.</p>

      {feedbacks.length === 0 ? (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>אין משובים זמינים כרגע במסד הנתונים.</p>
        </div>
      ) : (
        feedbacks.map((fb, idx) => (
          <div key={idx} style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong>{fb.volunteerName || 'מתנדב'}</strong>
              <span style={{ color: '#f57c00', fontWeight: 'bold' }}>⭐ {fb.rating || 'N/A'}</span>
            </div>
            <p style={{ margin: 0, color: '#333' }}>{fb.comments || "אין תוכן למשוב"}</p>
          </div>
        ))
      )}
    </div>
  );
}