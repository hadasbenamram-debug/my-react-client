import React, { useState, useEffect } from 'react';

export function AdminReportsPage() {
  const [reports, setReports] = useState<any>({
    totalDonationsVolume: 0,
    averageResponseTime: '0 דקות',
    successRate: '0%',
    topVolunteers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // שליפת טוקן ההתחברות (ודאי שהמפתח תואם למה ששמור אצלכם בפרויקט, לדוגמה 'token' או 'jwt')
    const token = localStorage.getItem('token');

    fetch('/api/admin/volunteers/reports', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`שגיאה בשרת: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת דוחות וסטטיסטיקות:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען דוחות מערכתיים...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>דוחות וסטטיסטיקות מערכתיים</h2>
      <p>ניתוח נפחי תרומות, זמני תגובה, אחוזי הצלחה וביצועי מתנדבים.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>נפח תרומות כולל</h4>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{reports.totalDonationsVolume} ק"ג</div>
        </div>

        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#34a853' }}>זמן תגובה ממוצע</h4>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{reports.averageResponseTime}</div>
        </div>

        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>אחוז הצלחה</h4>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{reports.successRate}</div>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3>מובילי ביצועי מתנדבים</h3>
        {(!reports.topVolunteers || reports.topVolunteers.length === 0) ? (
          <p style={{ color: '#666' }}>אין נתונים זמינים כרגע.</p>
        ) : (
          <ul>
            {reports.topVolunteers.map((vol: any, index: number) => (
              <li key={index} style={{ marginBottom: '8px' }}>
                {vol.name} - {vol.deliveriesCount} משלוחים מוצלחים
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}