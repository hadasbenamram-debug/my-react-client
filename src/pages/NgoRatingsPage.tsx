import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export function NgoRatingsPage() {
  const { id } = useParams(); // שליפת ה-ID אוטומטית מכתובת ה-URL
  const navigate = useNavigate();

  const [ratingData, setRatingData] = useState({
    targetType: 'Volunteer', // Volunteer או Supplier
    targetId: id || '',      // נשמר ב-State מאחורי הקלעים
    score: 5,
    comment: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem('token');

    fetch('/api/ratings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        ...ratingData,
        targetId: Number(ratingData.targetId)
      })
    })
      .then(res => {
        setLoading(false);
        if (res.ok) {
          alert('הדירוג והמשוב נשמרו בהצלחה!');
          navigate('/dashboard'); // חזרה לדשבורד לאחר שליחה מוצלחת
        } else {
          alert('שגיאה בשמירת הדירוג.');
        }
      })
      .catch(err => {
        setLoading(false);
        console.error('שגיאת תקשורת:', err);
      });
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>דירוג ומשוב לאחר מסירה</h2>

      <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
        
        {/* שדה מזהה מוסתר לחלוטין מעיני המשתמש - עובר מאחורי הקלעים */}
        <input type="hidden" value={ratingData.targetId} />

        <div style={{ marginBottom: '12px' }}>
          <label>בחר סוג דירוג: </label>
          <select 
            value={ratingData.targetType} 
            onChange={e => setRatingData({ ...ratingData, targetType: e.target.value })}
            style={{ width: '100%', padding: '6px' }}
          >
            <option value="Volunteer">מתנדב</option>
            <option value="Supplier">ספק (תורם)</option>
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>ציון (1-5): </label>
          <input 
            type="number" 
            min="1" 
            max="5" 
            value={ratingData.score} 
            onChange={e => setRatingData({ ...ratingData, score: Number(e.target.value) })} 
            style={{ width: '100%', padding: '6px' }} 
            required 
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>הערות / משוב: </label>
          <textarea 
            value={ratingData.comment} 
            onChange={e => setRatingData({ ...ratingData, comment: e.target.value })} 
            style={{ width: '100%', padding: '6px', height: '80px' }} 
          />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'שולח...' : 'שלח דירוג'}
        </button>
      </form>
    </div>
  );
}