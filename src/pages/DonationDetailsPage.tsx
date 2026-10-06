import React, { useState, useEffect } from 'react';

export function DonationDetailsPage() {
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const donationId = 1; // מזהה התרומה להצגה

  useEffect(() => {
    const token = localStorage.getItem('token'); // שליפת הטוקן

    // שליפת פרטי תרומה ספציפית מהשרת כולל שליחת הטוקן
    fetch(`/api/donations/${donationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('תרומה לא נמצאה');
        return res.json();
      })
      .then(data => {
        setDonation(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בשליפת פרטי התרומה:', err);
        setLoading(false);
      });
  }, [donationId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען פרטי תרומה מהשרת...</div>;
  if (!donation) return <div style={{ textAlign: 'center', padding: '20px' }}>התרומה המבוקשת לא נמצאה במסד הנתונים.</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>פרטי תרומה בודדת #{donation.id}</h2>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <p><strong>סטטוס נוכחי:</strong> <span style={{ color: '#0066cc', fontWeight: 'bold' }}>{donation.status || 'Pending'}</span></p>
        <p><strong>מזהה אזור:</strong> {donation.regionId}</p>
        <p><strong>עמותת יעד (Ngo ID):</strong> {donation.ngoId || 'טרם שובצה עמותה'}</p>
        <p><strong>ניקוד עדיפות:</strong> {donation.priorityScore}</p>

        <h4 style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>פרטי המתנדב שאסף:</h4>
        {donation.volunteer ? (
          <div>
            <p><strong>מזהה מתנדב:</strong> #{donation.volunteer.id}</p>
            <p><strong>סוג רכב:</strong> {donation.volunteer.vehicleType}</p>
            <p><strong>זמן איסוף משוער/בפועל:</strong> {donation.volunteer.collectionTime || 'בטיפול'}</p>
          </div>
        ) : (
          <p style={{ color: '#666' }}>טרם שובץ מתנדב לתרומה זו.</p>
        )}
      </div>
    </div>
  );
}