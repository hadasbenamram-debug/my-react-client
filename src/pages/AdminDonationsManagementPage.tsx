import React, { useState, useEffect } from 'react';

export function AdminDonationsManagementPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDonations = () => {
    const token = localStorage.getItem('token');

    fetch('/api/donations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת תרומות');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setDonations(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת ניהול תרומות:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleManualIntervention = (donationId: number) => {
    const token = localStorage.getItem('token');

    fetch(`/api/donations/${donationId}/cancel`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    })
      .then(res => {
        if (res.ok) {
          alert('סטטוס התרומה עודכן בהתערבות ידנית.');
          fetchDonations();
        } else {
          alert('שגיאה בעדכון התרומה.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען נתוני תרומות מערכתיים...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>ניהול תרומות מערכתי</h2>
      <p>מעקב אחר כלל התרומות במערכת והתערבות ידנית בסטטוסים.</p>

      {donations.length === 0 ? (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>אין תרומות פעילות במערכת כרגע.</p>
        </div>
      ) : (
        donations.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p><strong>מזהה תרומה:</strong> #{item.id}</p>
              <p><strong>ספק:</strong> {item.supplierId}</p>
              <p><strong>סטטוס נוכחי:</strong> <span style={{ color: '#0066cc', fontWeight: 'bold' }}>{item.status}</span></p>
            </div>
            <div>
              <button 
                onClick={() => handleManualIntervention(item.id)} 
                style={{ padding: '8px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                בטל תרומה (התערבות)
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}