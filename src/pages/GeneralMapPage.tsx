import React, { useState, useEffect } from 'react';

export function GeneralMapPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/map/all-entities')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLocations(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת נתוני מפה:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוענת נתוני מוקדים במערכת...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>תמונת מצב מרחבית (מוקדי מערכת)</h2>
      <p>תצוגה מרכזית של תורמים, עמותות ומתנדבים הפזורים בשטח על גבי מפה.</p>

      {/* כאן תשלב את רכיב המפה הגרפי */}
      <div style={{ width: '100%', height: '500px', background: '#e0e0e0', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* במקום הטקסט הזה, תטען את מפת Google Maps ותעבור עם .map() על ה-locations כדי להציג Markers */}
        <p>כאן תופיע מפת Google Maps עם סיכות לכל {locations.length} המוקדים</p>
      </div>
    </div>
  );
}