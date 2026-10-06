import React, { useState, useEffect } from 'react';

export function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // שליפת פרטי המשתמש בעת טעינת הדף
  useEffect(() => {
    // לדוגמה: שליפה מה-API
    // fetch('/api/users/profile')...
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords({ ...passwords, [name]: value });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setMessage('הפרופיל עודכן בהצלחה!');
      } else {
        setMessage('שגיאה בעדכון הפרופיל.');
      }
    } catch (error) {
      setMessage('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwords),
      });

      if (response.ok) {
        alert('הסיסמה שונתה בהצלחה!');
        setPasswords({ currentPassword: '', newPassword: '' });
      } else {
        alert('שגיאה בשינוי הסיסמה. בדוק את הנתונים.');
      }
    } catch (error) {
      alert('שגיאת תקשורת מול השרת.');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial' }}>
      <h2>הפרופיל האישי שלי</h2>

      <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        <h3>פרטים אישיים</h3>
        <div>
          <label>שם פרטי:</label>
          <input type="text" name="firstName" value={profile.firstName} onChange={handleProfileChange} style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>שם משפחה:</label>
          <input type="text" name="lastName" value={profile.lastName} onChange={handleProfileChange} style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>אימייל:</label>
          <input type="email" name="email" value={profile.email} onChange={handleProfileChange} style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>טלפון:</label>
          <input type="text" name="phoneNumber" value={profile.phoneNumber} onChange={handleProfileChange} style={{ width: '100%', padding: '6px' }} />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px', background: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {loading ? 'מעדכן...' : 'שמור שינויים'}
        </button>
      </form>

      <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
        <h3>החלפת סיסמה</h3>
        <div>
          <label>סיסמה נוכחית:</label>
          <input type="password" name="currentPassword" value={passwords.currentPassword} onChange={handlePasswordChange} required style={{ width: '100%', padding: '6px' }} />
        </div>
        <div>
          <label>סיסמה חדשה:</label>
          <input type="password" name="newPassword" value={passwords.newPassword} onChange={handlePasswordChange} required style={{ width: '100%', padding: '6px' }} />
        </div>
        <button type="submit" style={{ padding: '8px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}>
          שנה סיסמה
        </button>
      </form>

      {message && <p style={{ marginTop: '15px', color: 'green' }}>{message}</p>}
    </div>
  );
}