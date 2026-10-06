import React, { useState } from 'react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    try {
      const response = await fetch('http://localhost:5007/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), // תיקון השמות תואם לשרת
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('התחברת בהצלחה!');
        localStorage.setItem('token', data.token);
        // כאן אפשר להוסיף ניתוב (Navigate) לעמוד הבית
      } else {
        // הצגת ההודעה המדויקת שהשרת מחזיר (למשל: נעילה, המתנה לאישור וכו')
        setMessage(data.message || 'שגיאה בפרטי ההתחברות');
      }
    } catch (error) {
      setMessage('לא ניתן להתחבר לשרת');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch('http://localhost:5007/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }), // תיקון מ-mail ל-email
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'קוד איפוס נשלח בהצלחה למייל שלך!');
      } else {
        setMessage(data.message || 'שגיאה בשליחת בקשת האיפוס');
      }
    } catch (error) {
      setMessage('לא ניתן להתחבר לשרת');
    }
  };

  if (isForgotPassword) {
    return (
      <div style={{ direction: 'rtl', textAlign: 'center', marginTop: '50px', fontFamily: 'Arial, sans-serif' }}>
        <h2>שכחת סיסמה?</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>הקלידי את כתובת המייל שלך ונשלח לך הוראות איפוס.</p>
        
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '15px' }}>
            <input 
              type="email" 
              placeholder="מייל" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ padding: '8px', width: '250px' }}
            />
          </div>
          <button type="submit" disabled={!email} style={{ padding: '8px 20px', cursor: 'pointer' }}>
            שלח קישור לאיפוס
          </button>
        </form>

        <div style={{ marginTop: '15px' }}>
          <button 
            type="button" 
            onClick={() => { setIsForgotPassword(false); setMessage(''); }}
            style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' }}
          >
            חזרה להתחברות
          </button>
        </div>

        {message && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', textAlign: 'center', marginTop: '50px', fontFamily: 'Arial, sans-serif' }}>
      <h2>התחברות</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="email" 
            placeholder="מייל" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ padding: '8px', width: '250px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="password" 
            placeholder="סיסמה" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ padding: '8px', width: '250px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button 
            type="button" 
            onClick={() => { setIsForgotPassword(true); setMessage(''); }}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
          >
            שכחת סיסמה?
          </button>
        </div>

        <button type="submit" disabled={!email || !password} style={{ padding: '8px 20px', cursor: 'pointer' }}>
          התחבר
        </button>
      </form>
      {message && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{message}</p>}
    </div>
  );
};