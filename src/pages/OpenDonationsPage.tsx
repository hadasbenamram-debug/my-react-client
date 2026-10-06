import React, { useState, useEffect } from 'react';

interface DonationItem {
  id: number;
  status: string;
  regionId: number;
  priorityScore: number;
  createdAt?: string;
}

export function OpenDonationsPage() {
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // שליפת התרומות של הספק המחובר לפי הנתיב הנכון בשרת
  const fetchDonations = () => {
    const token = localStorage.getItem('token');

    fetch('/api/donations/my-supplier-donations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('שגיאה בהבאת הנתונים מהשרת');
        }
        return res.json();
      })
      .then(data => {
        setDonations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בשליפת תרומות:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleCancel = (donationId: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך לבטל תרומה זו?')) return;

    const token = localStorage.getItem('token');

    fetch(`/api/donations/${donationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (res.ok) {
          alert('התרומה בוטלה בהצלחה.');
          fetchDonations(); // רענון הרשימה
        } else {
          alert('לא ניתן לבטל תרומה שכבר שובצה או נאספה.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען תרומות פתוחות מהשרת...</div>;

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>רשימת תרומות פתוחות וניהולן</h2>

      {donations.length === 0 ? (
        <p>אין תרומות פתוחות כרגע במסד הנתונים.</p>
      ) : (
        donations.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p><strong>מזהה תרומה:</strong> #{item.id}</p>
              <p><strong>סטטוס:</strong> <span style={{ color: item.status === 'Pending' ? '#f57c00' : '#34a853' }}>{item.status}</span></p>
              <p><strong>מזהה אזור:</strong> {item.regionId}</p>
            </div>
            <div>
              {item.status === 'Pending' && (
                <button 
                  onClick={() => handleCancel(item.id)} 
                  style={{ padding: '8px 12px', background: '#ea4335', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ביטול תרומה
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}