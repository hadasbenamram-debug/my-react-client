import React, { useState, useEffect } from 'react';

interface VolunteerDto {
  id?: number;
  vehicleType: string;
  maxCapacityKg: number;
  isAvailable: boolean;
  currentLatitude: number;
  currentLongitude: number;
  idNumber: string;
  dateOfBirth: string;
  reliabilityScore: number;
}

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // טופס להוספת מתנדב חדש
  const [newVolunteer, setNewVolunteer] = useState<VolunteerDto>({
    vehicleType: 'רכב פרטי',
    maxCapacityKg: 50,
    isAvailable: true,
    currentLatitude: 32.0853,
    currentLongitude: 34.7818,
    idNumber: '',
    dateOfBirth: '1995-01-01T00:00:00',
    reliabilityScore: 100
  });

  // שליפת כל המתנדבים מהשרת בעת טעינת המסך
  const fetchVolunteers = () => {
    fetch('/api/volunteers')
      .then(res => res.json())
      .then(data => {
        setVolunteers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בשליפת מתנדבים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVolunteers();
  }, []);

  // שליחת מתנדב חדש לשרת (POST)
  const handleCreateVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    
    fetch('/api/volunteers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVolunteer)
    })
      .then(res => {
        if (res.ok) {
          alert('המתנדב נוסף בהצלחה למסד הנתונים!');
          fetchVolunteers(); // רענון הרשימה מהשרת
        } else {
          alert('שגיאה בשמירת המתנדב.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען מתנדבים מהשרת...</div>;

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>ניהול מתנדבים (מחובר למסד הנתונים)</h2>

      {/* טופס הוספת מתנדב */}
      <form onSubmit={handleCreateVolunteer} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <h3>הוספת מתנדב חדש</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>סוג רכב: </label>
          <input 
            type="text" 
            value={newVolunteer.vehicleType} 
            onChange={e => setNewVolunteer({ ...newVolunteer, vehicleType: e.target.value })} 
            style={{ width: '100%', padding: '6px' }} 
            required 
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>קיבולת מקסימלית (ק"ג): </label>
          <input 
            type="number" 
            value={newVolunteer.maxCapacityKg} 
            onChange={e => setNewVolunteer({ ...newVolunteer, maxCapacityKg: Number(e.target.value) })} 
            style={{ width: '100%', padding: '6px' }} 
            required 
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>תעודת זהות: </label>
          <input 
            type="text" 
            value={newVolunteer.idNumber} 
            onChange={e => setNewVolunteer({ ...newVolunteer, idNumber: e.target.value })} 
            style={{ width: '100%', padding: '6px' }} 
            required 
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', background: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          שמור מתנדב במסד
        </button>
      </form>

      {/* הצגת רשימת המתנדבים הקיימים במסד */}
      <h3>רשימת מתנדבים קיימים</h3>
      {volunteers.length === 0 ? (
        <p>אין מתנדבים רשומים במסד הנתונים.</p>
      ) : (
        volunteers.map((v, idx) => (
          <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #ccc' }}>
            <p><strong>מזהה:</strong> #{v.id} | <strong>ת.ז:</strong> {v.idNumber}</p>
            <p><strong>רכב:</strong> {v.vehicleType} | <strong>קיבולת:</strong> {v.maxCapacityKg} ק"ג | <strong>זמין:</strong> {v.isAvailable ? 'כן' : 'לא'}</p>
          </div>
        ))
      )}
    </div>
  );
}