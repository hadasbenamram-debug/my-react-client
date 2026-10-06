import React, { useState, useEffect } from 'react';

export function SupplierHistoryPage() {
  const [completedDonations, setCompletedDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supplierId = 1;

  useEffect(() => {
    fetch(`/api/donations/supplier/${supplierId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const completed = data.filter((d: any) => d.status === 'Completed');
          setCompletedDonations(completed);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת היסטוריה:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען היסטוריית תרומות מהשרת...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>היסטוריית תרומות ודוחות</h2>
      <p>רשימת התרומות שהושלמו במלואן:</p>

      {completedDonations.length === 0 ? (
        <p>אין תרומות שהושלמו במסד הנתונים עדיין.</p>
      ) : (
        completedDonations.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #ddd' }}>
            <p><strong>מזהה תרומה:</strong> #{item.id}</p>
            <p><strong>סטטוס:</strong> <span style={{ color: '#34a853', fontWeight: 'bold' }}>הושלם (Completed)</span></p>
            <p><strong>אזור:</strong> {item.regionId}</p>
          </div>
        ))
      )}
    </div>
  );
}