import React, { useState, useEffect } from 'react';

export function ActiveRoutePage() {
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');

    fetch('/api/matches/active', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then(data => {
        // הנחה שה-API מחזיר רשימה, ואנחנו לוקחים את השיבוץ הפעיל הראשון
        const activeMatch = Array.isArray(data) ? data[0] : data;
        if (activeMatch) {
          setRouteData(activeMatch);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleAcceptMatch = (matchId: number, address?: string) => {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');

    // 1. קריאה לשרת לעדכון סטטוס האישור והמתנדב
 fetch(`/api/matches/${matchId}/accept`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
    
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // 2. הצגת הודעה לבקשת אישור ניווט
          alert('תאשר ניווט');

          // 3. פתיחת מפה (Waze) עם כתובת היעד (אם קיימת, או ברירת מחדל)
          const destination = address || 'ישראל';
          window.open(`https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`, '_blank');
          
          // רענון או עדכון מקומי של הסטטוס במסך אם נדרש
          setRouteData((prev: any) => ({ ...prev, status: 'Confirmed' }));
        } else {
          alert(data.message || 'שגיאה באישור השידוך.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('שגיאת תקשורת מול השרת.');
      });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען מסלול מול השרת...</div>;
  if (!routeData) return <div style={{ textAlign: 'center', padding: '20px' }}>אין מסלול פעיל כרגע.</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', padding: '20px' }}>
      <h2>בקשות איסוף נכנסות למתנדב</h2>
      <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <p><strong>מזהה שיבוץ:</strong> #{routeData.id}</p>
        <p><strong>סטטוס נוכחי:</strong> {routeData.status}</p>
        <p><strong>מזהה תרומה:</strong> #{routeData.donationId || routeData.donation?.id}</p>
        
        {/* כפתורי אישור ודחייה תואמים לעיצוב */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button 
            onClick={() => handleAcceptMatch(routeData.id, routeData.donation?.address)} 
            style={{ padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            אישור איסוף
          </button>
        </div>
      </div>
    </div>
  );
}