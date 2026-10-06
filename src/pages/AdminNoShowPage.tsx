import React, { useState, useEffect } from 'react';

export function AdminNoShowPage() {
  const [noShows, setNoShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNoShows = () => {
    const token = localStorage.getItem('token');

    // פנייה נכונה לנתיב הקיים בשרת: /api/matches
    fetch('/api/matches', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת נתונים מהשרת');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          // סינון השידוכים שסטטוס שלהם הוא NoShow (ערך 6 לרוב באנאם או מחרוזת 'NoShow')
          const filtered = data.filter(item => item.status === 'NoShow' || item.status === 6);
          setNoShows(filtered);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת אירועי No-Show:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNoShows();
  }, []);

  const handleReassign = (donationId: number) => {
    const token = localStorage.getItem('token');

    // שימוש ב-endpoint הקיים בשרת לשיבוץ מחדש של תרומה
    fetch(`/api/matches/assign-donation/${donationId}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    })
      .then(res => {
        if (res.ok) {
          alert('בוצע שיבוץ מחדש בהצלחה!');
          fetchNoShows();
        } else {
          alert('שגיאה בביצוע שיבוץ מחדש.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען נתוני No-Show...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>טיפול ב-No-Show ומעקב אירועים</h2>
      <p>לוג אירועים של אי-התייצבות מתנדבים ומעקב אחר שיבוץ מחדש של תרומות.</p>

      {noShows.length === 0 ? (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>אין אירועי No-Show פעילים כרגע.</p>
        </div>
      ) : (
        noShows.map((item) => (
          <div key={item.id} style={{ background: '#ffebee', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffcdd2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p><strong>מזהה שידוך:</strong> #{item.id}</p>
              <p><strong>מתנדב:</strong> {item.volunteerName || item.volunteerId || 'לא צוין'}</p>
              <p><strong>מזהה תרומה:</strong> #{item.donationId}</p>
            </div>
            <div>
              <button 
                onClick={() => handleReassign(item.donationId)} 
                style={{ padding: '8px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                בצע שיבוץ מחדש
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}