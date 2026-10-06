import React, { useState } from 'react';

export function ContactSupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponseMessage('');

    try {
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setResponseMessage('הפנייה נשלחה בהצלחה! צוות התמיכה יחזור אליך בהקדם.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setResponseMessage('אירעה שגיאה בשליחת הפנייה. נסה שוב.');
      }
    } catch (error) {
      setResponseMessage('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial' }}>
      <h2>תמיכה וצור קשר</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label>שם מלא:</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>אימייל ליצירת קשר:</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>נושא הפנייה:</label>
          <input 
            type="text" 
            name="subject" 
            value={formData.subject} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>תוכן ההודעה:</label>
          <textarea 
            name="message" 
            value={formData.message} 
            onChange={handleChange} 
            rows={4} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px', background: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'שולח...' : 'שלח פנייה'}
        </button>
      </form>

      {responseMessage && <p style={{ marginTop: '15px', color: responseMessage.includes('בהצלחה') ? 'green' : 'red' }}>{responseMessage}</p>}
    </div>
  );
}