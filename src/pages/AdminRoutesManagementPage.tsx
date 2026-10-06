import React, { useState, useEffect } from 'react';

export function AdminRoutesManagementPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutes = () => {
    const token = localStorage.getItem('token');

    fetch('/api/matches/active', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת מסלולים פעילים');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setRoutes(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת מסלולים פעילים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען מסלולים פעילים...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>ניהול מסלולים ושיבוצים בזמן אמת</h2>
      <p>מעקב אחר כלל המסלולים, המתנדבים הפעילים ויעדי המשלוחים במערכת.</p>

      {routes.length === 0 ? (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>אין מסלולים פעילים כרגע במערכת.</p>
        </div>
      ) : (
        routes.map((route) => (
          <div key={route.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd' }}>
            <p><strong>מזהה שידוך/מסלול:</strong> #{route.id}</p>
            <p><strong>מתנדב משובץ:</strong> {route.volunteerName || route.volunteerId || 'לא צוין'}</p>
            <p><strong>סטטוס:</strong> <span style={{ color: '#0066cc', fontWeight: 'bold' }}>{route.status}</span></p>
            <p><strong>יעד / עמותה:</strong> {route.destination || 'בדרך ליעד'}</p>
          </div>
        ))
      )}
    </div>
  );
}