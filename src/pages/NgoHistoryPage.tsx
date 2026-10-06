import React, { useState, useEffect } from 'react';

export function NgoHistoryPage() {
  const [completedDonations, setCompletedDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const ngoId = 1;

  useEffect(() => {
    fetch(`/api/donations`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // סינון תרומות שהושלמו ושייכות לעמותה
          const ngoCompleted = data.filter((d: any) => d.ngoId === ngoId && d.status === 'Completed');
          setCompletedDonations(ngoCompleted);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת היסטוריית תרומות:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען היסטוריה מהשרת...</div>;

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>היסטוריית תרומות שהתקבלו בעמותה</h2>

      {completedDonations.length === 0 ? (
        <p>אין עדיין היסטוריית תרומות שהושלמו במסד הנתונים.</p>
      ) : (
        completedDonations.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd' }}>
            <p><strong>מזהה תרומה:</strong> #{item.id}</p>
            <p><strong>סטטוס:</strong> <span style={{ color: '#34a853', fontWeight: 'bold' }}>הושלם (Completed)</span></p>
            <p><strong>מזהה ספק (תורם):</strong> {item.supplierId}</p>
            <p><strong>מזהה מתנדב:</strong> {item.volunteerId || 'לא צוין'}</p>
          </div>
        ))
      )}
    </div>
  );
}