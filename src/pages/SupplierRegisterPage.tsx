import React, { useState } from 'react';

export function SupplierRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    address: '',
    taxId: '',
    businessLicenseFilePath: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/suppliers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage('רישום הספק בוצע בהצלחה! סיסמה זמנית נשלחה לכתובת האימייל שלך.');
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
      <h2>טופס רישום ספק / תורם</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <h4 style={{ margin: '5px 0', color: '#0066cc' }}>פרטי משתמש</h4>
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

        <h4 style={{ margin: '10px 0 5px 0', color: '#0066cc' }}>פרטי העסק</h4>
        <div>
          <label>שם העסק:</label>
          <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>כתובת העסק:</label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>מספר ח.פ / תיק מע"מ:</label>
          <input type="text" name="taxId" value={formData.taxId} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>נתיב קובץ רישיון עסק:</label>
          <input type="text" name="businessLicenseFilePath" value={formData.businessLicenseFilePath} onChange={handleChange} placeholder="uploads/licenses/..." required style={{ width: '100%', padding: '8px' }} />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', background: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer', marginTop: '10px' }}>
          {loading ? 'שולח...' : 'הירשם כספק'}
        </button>
      </form>

      {message && <p style={{ marginTop: '15px', color: message.includes('בהצלחה') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}