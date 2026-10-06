import React, { useState } from 'react';

export function VolunteerRegisterPage() {
  const [formData, setFormData] = useState({
    name: '', // במקום firstName ו-lastName, או התאם לפי ה-DTO בשרת
    email: '',
    phone: '', // במקום phoneNumber
    vehicleType: '',
    maxCapacityKg: '',
    idNumber: '',
    driverLicenseNumber: '',
    dateOfBirth: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/volunteers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          maxCapacityKg: Number(formData.maxCapacityKg),
        }),
      });

      if (response.ok) {
        setMessage('הרישום בוצע בהצלחה! סיסמה זמנית נשלחה לכתובת האימייל שלך.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage(errorData.message || 'אירעה שגיאה בעת הרישום. נסה שוב.');
      }
    } catch (error) {
      setMessage('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>טופס רישום מתנדב</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <h4 style={{ marginTop: '5px' }}>פרטי משתמש</h4>
        <div>
          <label>שם מלא:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>אימייל:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>טלפון:</label>
          <input type="text" name="phone" value={formData.phone} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>

        <h4 style={{ marginTop: '10px' }}>פרטי התנדבות ורכב</h4>
        <div>
          <label>סוג רכב:</label>
          <input type="text" name="vehicleType" value={formData.vehicleType} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>קיבולת מקסימלית (ק"ג):</label>
          <input type="number" name="maxCapacityKg" value={formData.maxCapacityKg} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>תעודת זהות:</label>
          <input type="text" name="idNumber" value={formData.idNumber} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>מספר רישיון נהיגה:</label>
          <input type="text" name="driverLicenseNumber" value={formData.driverLicenseNumber} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>תאריך לידה:</label>
          <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer', marginTop: '10px' }}>
          {loading ? 'שולח...' : 'הירשם כמתנדב'}
        </button>
      </form>

      {message && <p style={{ marginTop: '15px', color: message.includes('בהצלחה') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}