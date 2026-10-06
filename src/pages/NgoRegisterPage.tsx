import React, { useState } from 'react';

export function NgoRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ngoName: '',
    registrationNumber: '',
    address: '',
    dailyCapacity: 100,
    latitude: 32.0853,
    longitude: 34.7818,
    regionId: 1,
    receivesOnFriday: false,
    fridayOpenTime: '',
    fridayCloseTime: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    fetch('/api/ngos/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        dailyCapacity: Number(formData.dailyCapacity),
        regionId: Number(formData.regionId),
        fridayOpenTime: formData.fridayOpenTime ? formData.fridayOpenTime + ':00' : null,
        fridayCloseTime: formData.fridayCloseTime ? formData.fridayCloseTime + ':00' : null,
      }),
    })
      .then(async res => {
        setLoading(false);
        if (res.ok) {
          setMessage('רישום העמותה בוצע בהצלחה! סיסמה זמנית נשלחה למייל.');
        } else {
          const errorData = await res.json().catch(() => ({}));
          setMessage(errorData.message || 'אירעה שגיאה בעת הרישום. נסה שוב.');
        }
      })
      .catch(err => {
        setLoading(false);
        setMessage('שגיאת תקשורת מול השרת.');
        console.error('שגיאת תקשורת:', err);
      });
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>הרשמת עמותה חדשה</h2>

      <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <h4 style={{ margin: '5px 0', color: '#34a853' }}>פרטי משתמש</h4>
        <div>
          <label>שם מלא:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>אימייל:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>טלפון:</label>
          <input type="text" name="phone" value={formData.phone} onChange={handleChange} required style={{ width: '100%', padding: '6px' }} />
        </div>

        <h4 style={{ margin: '10px 0 5px 0', color: '#34a853' }}>פרטי העמותה</h4>
        <div>
          <label>שם העמותה:</label>
          <input type="text" name="ngoName" value={formData.ngoName} onChange={handleChange} required style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>מספר רישום (חברה/עמותה):</label>
          <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} required style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>כתובת:</label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} required style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>קיבולת יומית (ק"ג):</label>
          <input type="number" name="dailyCapacity" value={formData.dailyCapacity} onChange={handleChange} required style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>מזהה אזור (Region ID):</label>
          <input type="number" name="regionId" value={formData.regionId} onChange={handleChange} required style={{ width: '100%', padding: '6px' }} />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
          {loading ? 'שולח לאישור...' : 'הירשם כעמותה'}
        </button>
      </form>

      {message && <p style={{ marginTop: '15px', color: message.includes('בהצלחה') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}