import React, { useState, useEffect } from 'react';

export function NgoDashboard() {
  const [ngoData, setNgoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const ngoId = 1; // מזהה העמותה המחוברת

  useEffect(() => {
    // שליפת התרומות או הנתונים המשויכים לעמותה מהשרת
    fetch(`/api/donations`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // סינון תרומות המיועדות לעמותה זו (לפי ngoId)
          const ngoDonations = data.filter((d: any) => d.ngoId === ngoId);
          setNgoData(ngoDonations);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת נתוני העמותה:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען נתוני עמותה מהשרת...</div>;

  const expectedToday = ngoData.filter((d: any) => d.status === 'Pending').length;
  const onTheWay = ngoData.filter((d: any) => d.status === 'Matched').length;
  const received = ngoData.filter((d: any) => d.status === 'Completed').length;

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>דשבורד עמותה (מקבלת תרומות)</h2>
      <p>מעקב אחר זרימת המזון והתרומות המיועדות לעמותה.</p>

      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <div style={{ flex: 1, background: '#fff3e0', padding: '15px', borderRadius: '8px', border: '1px solid #ffb74d', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>צפויות להיום</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{expectedToday}</div>
        </div>

        <div style={{ flex: 1, background: '#eef6fc', padding: '15px', borderRadius: '8px', border: '1px solid #b8d9f8', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>בדרך (נאספו)</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{onTheWay}</div>
        </div>

        <div style={{ flex: 1, background: '#e6f4ea', padding: '15px', borderRadius: '8px', border: '1px solid #34a853', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#34a853' }}>התקבלו בהצלחה</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{received}</div>
        </div>
      </div>
    </div>
  );
}