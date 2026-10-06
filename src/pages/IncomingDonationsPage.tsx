import React, { useState, useEffect } from 'react';

export function IncomingDonationsPage() {
  const [incoming, setIncoming] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const ngoId = 1; // מזהה העמותה המחוברת במערכת

  useEffect(() => {
    // שליפת רשימת התרומות מהשרת
    fetch('/api/donations')
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בשליפת הנתונים');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          // סינון תרומות השייכות לעמותה ונמצאות בסטטוס בדרך (Matched)
          const matchedDonations = data.filter((d: any) => d.ngoId === ngoId && d.status === 'Matched');
          setIncoming(matchedDonations);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בשליפת תרומות נכנסות:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>טוען תרומות נכנסות מהשרת...</div>;
  }

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>תרומות נכנסות בדרך לעמותה</h2>
      <p>מעקב בזמן אמת אחר מתנדבים שבדרך עם משלוחי מזון.</p>

      {incoming.length === 0 ? (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#666' }}>אין כרגע תרומות שנמצאות בדרכן לעמותה.</p>
        </div>
      ) : (
        incoming.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd' }}>
            <p><strong>מזהה תרומה:</strong> #{item.id}</p>
            <p><strong>סטטוס:</strong> <span style={{ color: '#0066cc', fontWeight: 'bold' }}>בדרך (Matched)</span></p>
            <p><strong>מזהה מתנדב משובץ:</strong> #{item.volunteerId || 'בטיפול'}</p>
            <p><strong>זמן הגעה משוער (ETA):</strong> 15-30 דקות</p>
          </div>
        ))
      )}
    </div>
  );
}