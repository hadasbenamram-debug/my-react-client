import React, { useState, useEffect } from 'react';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    openDonations: 0,
    availableVolunteers: 0,
    activeAssignments: 0,
    noShowAlerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // שליפת נתונים סטטיסטיים או דשבורד מהשרת עבור מנהל מערכת
    fetch('/api/admin/dashboard-stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת הנתונים הניהוליים:', err);
        // ערכי ברירת מחדל במקרה שהשרת לא זמין כרגע
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען נתוני ניהול...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>דשבורד ניהולי ראשי (Admin)</h2>
      <p>מבט על מערכתי לתפעול ובקרה שוטפת של מערך הצלת המזון.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginTop: '20px' }}>
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>תרומות פתוחות</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.openDonations}</div>
        </div>

        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#34a853' }}>מתנדבים זמינים</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.availableVolunteers}</div>
        </div>

        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>שיבוצים פעילים</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.activeAssignments}</div>
        </div>

        <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px', border: '1px solid #ffcdd2', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#c62828' }}>התראות No-Show</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#c62828' }}>{stats.noShowAlerts}</div>
        </div>
      </div>
    </div>
  );
}