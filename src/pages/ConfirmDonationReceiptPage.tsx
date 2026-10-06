import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function ConfirmDonationReceiptPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const ngoId = 1;

  const fetchPendingReceipts = () => {
    fetch(`/api/donations`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // הצגת תרומות המשויכות לעמותה שנמצאות בטיפול לקבלה
          const pendingReceipt = data.filter((d: any) => d.ngoId === ngoId && d.status === 'Matched');
          setDonations(pendingReceipt);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת נתונים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPendingReceipts();
  }, []);

  const handleConfirmReceipt = (item: any) => {
    fetch(`/api/donations/${item.id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => {
        if (res.ok) {
          // מעבר אוטומטי לעמוד הדירוג עם מזהה ההתאמה או המתנדב
          navigate(`/rate/${item.matchId || item.volunteerId}`);
        } else {
          alert('שגיאה באישור קבלת התרומה.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען תרומות להמתנה...</div>;

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>אישור קבלת תרומה בפועל</h2>

      {donations.length === 0 ? (
        <p>אין תרומות הממתינות לאישור קבלה כרגע.</p>
      ) : (
        donations.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p><strong>מזהה תרומה:</strong> #{item.id}</p>
              <p><strong>מזהה מתנדב:</strong> {item.volunteerId || 'לא צוין'}</p>
              <p><strong>סטטוס:</strong> ממתין לאישור קבלה</p>
            </div>
            <button 
              onClick={() => handleConfirmReceipt(item)} 
              style={{ padding: '8px 15px', background: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              אשר קבלה בעת הגעה
            </button>
          </div>
        ))
      )}
    </div>
  );
}