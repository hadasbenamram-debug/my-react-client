import React, { useState } from 'react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('קישור/קוד לאיפוס סיסמה נשלח למייל שלך בהצלחה.');
      } else {
        setMessage('אירעה שגיאה. ודא שהכתובת קיימת במערכת.');
      }
    } catch (error) {
      setMessage('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial' }}>
      <h2>שחזור סיסמה</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label>כתובת אימייל:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px', background: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'שולח...' : 'שלח קישור איפוס'}
        </button>
      </form>
      {message && <p style={{ marginTop: '15px', color: message.includes('בהצלחה') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}