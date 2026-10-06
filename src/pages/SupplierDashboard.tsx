import React, { useState, useEffect } from 'react';

export function SupplierDashboard() {
  const [stats, setStats] = useState({ activeDonations: 0, completedDonations: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupplierData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('לא נמצא טוקן התחברות.');
        setLoading(false);
        return;
      }

      try {
        // פנייה לנתיב החדש שמזהה את הספק אוטומטית לפי הטוקן
        const response = await fetch(`/api/donations/my-supplier-donations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('נתוני תרומות שהתקבלו מהשרת:', data);
          
          if (Array.isArray(data)) {
            // שים לב לשימוש בסטטוסים המדויקים שמוחזרים מהשרת
            const active = data.filter((d: any) => d.status === 'Pending' || d.status === 'Matched').length;
            const completed = data.filter((d: any) => d.status === 'Completed').length;
            setStats({ activeDonations: active, completedDonations: completed });
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          setError(errData.message || 'שגיאה בטעינת הנתונים מהשרת.');
        }
      } catch (err) {
        console.error('שגיאת תקשורת:', err);
        setError('שגיאת תקשורת מול השרת.');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierData();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען נתונים מהשרת...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>דשבורד ארגון תורם</h2>
      <p>ברוך הבא למערכת ניהול התרומות העסקיות.</p>

      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <div style={{ flex: 1, background: '#eef6fc', padding: '15px', borderRadius: '8px', border: '1px solid #b8d9f8', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>תרומות פעילות</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.activeDonations}</div>
        </div>

        <div style={{ flex: 1, background: '#e6f4ea', padding: '15px', borderRadius: '8px', border: '1px solid #34a853', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#34a853' }}>תרומות שהושלמו</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.completedDonations}</div>
        </div>
      </div>
    </div>
  );
}