import React, { useState, useEffect } from 'react';

interface EngineStatus {
  lastRunTime: string;
  status: string;
  matchedCount: number;
  failedConstraints: string[];
}

export function AdminMatchingEnginePage() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    lastRunTime: 'לא ידוע',
    status: 'Ready',
    matchedCount: 0,
    failedConstraints: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEngineStatus = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('jwt');
      // שימוש בנתיב המעודכן תחת matches
      const res = await fetch('/api/matches/engine-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('שגיאה בטעינת הנתונים מהשרת');
      const data = await res.json();
      setEngineStatus(data);
    } catch (err: any) {
      console.error('שגיאה בטעינת סטטוס מנוע השידוכים:', err);
      setError('לא ניתן להתחבר לשרת או לטעון את נתוני המנוע. ודא שהשרת פועל.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineStatus();
  }, []);

  const handleManualRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt');
      // שימוש בנתיב המעודכן תחת matches
      const res = await fetch('/api/matches/run-engine', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });
      
      if (res.ok) {
        alert('ריצת מנוע השידוכים בוצעה בהצלחה!');
        await fetchEngineStatus();
      } else {
        throw new Error('שגיאה בהפעלת מנוע השידוכים בשרת.');
      }
    } catch (err: any) {
      console.error('שגיאת תקשורת:', err);
      setError('שגיאה בהפעלת מנוע השידוכים. בדוק את חיבור השרת.');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'Arial', direction: 'rtl' }}>
        <p>טוען נתוני מנוע שידוכים...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>ניטור מנוע השידוכים (Matching Engine)</h2>
      <p style={{ color: '#555' }}>מעקב אחר ריצות אוטומטיות, אילוצים, חישובי ציון והרצה ידנית.</p>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', border: '1px solid #ef9a9a', marginBottom: '20px' }}>
          <strong>שגיאה: </strong> {error}
        </div>
      )}

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <p><strong>ריצה אחרונה:</strong> {engineStatus.lastRunTime}</p>
        <p><strong>סטטוס מנוע:</strong> <span style={{ color: '#34a853', fontWeight: 'bold' }}>{engineStatus.status}</span></p>
        <p><strong>שידוכים שבוצעו בריצה האחרונה:</strong> {engineStatus.matchedCount}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleManualRun} 
          disabled={running} 
          style={{ 
            padding: '10px 20px', 
            background: running ? '#cccccc' : '#0066cc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: running ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold' 
          }}
        >
          {running ? 'מריץ אלגוריתם...' : 'הפעל מנוע שידוכים ידנית'}
        </button>
      </div>

      <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3>אילוצים קשים שנכשלו (Hard Constraints Failures)</h3>
        {(!engineStatus.failedConstraints || engineStatus.failedConstraints.length === 0) ? (
          <p style={{ color: '#666' }}>אין כשלים באילוצים בריצה האחרונה.</p>
        ) : (
          <ul style={{ paddingRight: '20px' }}>
            {engineStatus.failedConstraints.map((item: string, index: number) => (
              <li key={index} style={{ color: '#c62828', marginBottom: '5px' }}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}