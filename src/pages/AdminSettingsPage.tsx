import React, { useState, useEffect } from 'react';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    matchingTimeoutMinutes: 30,
    distanceWeight: 0.5,
    urgencyWeight: 0.5
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת הגדרות מערכת:', err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
      .then(res => {
        if (res.ok) {
          alert('הגדרות המערכת עודכנו בהצלחה!');
        } else {
          alert('שגיאה בשמירת ההגדרות.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען הגדרות מערכת...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>הגדרות מערכת ופרמטרים</h2>
      <p>ניהול פרמטרים גלובליים למנוע השידוכים, זמני טיימאאוט ומשקלים.</p>

      <form onSubmit={handleSave} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>טיימאאוט לאישור שיבוץ (דקות):</label>
          <input 
            type="number" 
            name="matchingTimeoutMinutes" 
            value={settings.matchingTimeoutMinutes} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>משקל מרחק בחישוב הציון:</label>
          <input 
            type="number" 
            step="0.1" 
            name="distanceWeight" 
            value={settings.distanceWeight} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>משקל דחיפות המזון בחישוב הציון:</label>
          <input 
            type="number" 
            step="0.1" 
            name="urgencyWeight" 
            value={settings.urgencyWeight} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <button 
          type="submit" 
          style={{ width: '100%', padding: '10px', background: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          שמור הגדרות
        </button>
      </form>
    </div>
  );
}