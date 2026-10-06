import React, { useState, useEffect } from 'react';

export function VolunteerDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const volunteerId = 1; // ניתן להתאים לפי המשתמש המחובר

  useEffect(() => {
    fetch(`/api/matches/active`) // שולף שיבוצים/מסלולים פעילים מהשרת
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת הנתונים מהשרת', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען נתונים מהשרת...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>דשבורד מתנדב</h2>
      <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <h3>סטטוס נוכחי במערכת: <span style={{ color: '#34a853' }}>Available</span></h3>
        <p>כאן מוצגים הנתונים האמיתיים שנשלפו ישירות מבסיס הנתונים.</p>
      </div>
      {dashboardData ? (
        <div style={{ background: '#eef6fc', padding: '15px', borderRadius: '8px', border: '1px solid #b8d9f8' }}>
          <h4>שיבוץ פעיל נמצא!</h4>
          <p>מזהה שיבוץ: #{dashboardData.id}</p>
        </div>
      ) : (
        <p>אין שיבוצים פעילים כרגע במסד הנתונים.</p>
      )}
    </div>
  );
}