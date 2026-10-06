import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function CountdownTimer({ onExpire }: { onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number>(300);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ 
      display: 'inline-flex', alignItems: 'center', background: '#fff3e0', 
      color: '#e65100', padding: '5px 12px', borderRadius: '20px', 
      fontWeight: 'bold', border: '1px solid #ffe0b2', marginBottom: '10px', fontSize: '14px'
    }}>
      <span>⏳ זמן נותר לאישור: {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
    </div>
  );
}

export function IncomingRequestPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<any[]>([]);
  const [singleRequest, setSingleRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  
  const [activeMatch, setActiveMatch] = useState<any | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [routeStage, setRouteStage] = useState<'pickup' | 'delivery'>('pickup');

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      queryParams.delete('token');
      const newSearch = queryParams.toString();
      const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, document.title, newPath);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('לא נמצא טוקן התחברות.');
      setLoading(false);
      return;
    }

    if (id) {
      axios.get(`/api/matches/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => {
          setSingleRequest(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setMessage('שגיאה בטעינת פרטי הבקשה.');
          setLoading(false);
        });
    } else {
      fetchIncomingRequests(token);
    }
  }, [id]);

  const fetchIncomingRequests = (tokenParam?: string) => {
    setLoading(true);
    const token = tokenParam || localStorage.getItem('token');

    axios.get('/api/matches/active', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        if (Array.isArray(response.data)) setRequests(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!activeMatch) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentPosition(pos);
        
        const token = localStorage.getItem('token');
        const routeId = activeMatch.volunteerRouteId || activeMatch.routeId || activeMatch.id;

        if (token && routeId) {
          const statusDesc = routeStage === 'pickup' 
            ? 'בדרך לאיסוף מהספק - עדכון מיקום חי' 
            : 'בדרך למסירה לעמותה - עדכון מיקום חי';

          const payload = {
            volunteerRouteId: routeId,
            status: statusDesc,
            latitude: pos.lat,
            longitude: pos.lng,
            notes: statusDesc
          };

          axios.post('/api/deliverylogs', payload, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(err => console.warn('שגיאה בשליחת לוג מיקום:', err.response?.data || err.message));
        }
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeMatch, routeStage]);

  const handleAccept = (match: any) => {
    if (!window.confirm('אשר ניווט למסלול איסוף')) return;

    const token = localStorage.getItem('token');
    
    axios.post(`/api/matches/${match.id}/accept`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((response) => {
        const acceptedMatch = response.data.match || match;
        setActiveMatch(acceptedMatch);
        setRouteStage('pickup'); 
        setMessage('המסלול התחיל בהצלחה!');
        
        if (id) {
          navigate('/app/volunteer/incoming-request', { replace: true });
        }
      })
      .catch(err => {
        alert(err.response?.data?.message || 'שגיאה באישור השידוך');
      });
  };

  // פונקציה לסיום המשלוח
  const handleCompleteDelivery = () => {
    if (!window.confirm('האם אתה בטוח שהמשלוח הובא בהצלחה ליעדו?')) return;

    const token = localStorage.getItem('token');
    const matchId = activeMatch?.id;

    if (!matchId) return;

    // קריאה לשרת לסיום המשלוח (בהנחה שהנתיב הוא /api/matches/{id}/complete או דומה)
    axios.post(`/api/matches/${matchId}/complete`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        alert('המשלוח הסתיים בהצלחה! תודה רבה על העזרה.');
        setActiveMatch(null); // איפוס המסלול הפעיל כדי לחזור למסך הרגיל
        fetchIncomingRequests(token ?? undefined); // טעינת רשימת הבקשות מחדש
      })
      .catch(err => {
        // אם בשרת שם הנתיב שונה (למשל complete-delivery), תוכל לעדכן כאן
        alert(err.response?.data?.message || 'שגיאה בעדכון סיום המשלוח');
      });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>טוען נתונים...</div>;
  }

  if (activeMatch) {
    const supplierAddress = activeMatch.donation?.address || activeMatch.address || "כתובת ספק";
    const ngoAddress = activeMatch.ngo?.address || activeMatch.destinationAddress || "כתובת עמותה";
    const currentDestination = routeStage === 'pickup' ? supplierAddress : ngoAddress;

    return (
      <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', padding: '20px' }}>
        <h2>מסלול איסוף ומסירה פעיל</h2>
        <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <p><strong>שלב נוכחי:</strong> {routeStage === 'pickup' ? 'נסיעה אל הספק' : 'נסיעה אל העמותה'}</p>
          <p><strong>יעד:</strong> {currentDestination}</p>
        </div>
        <div style={{ width: '100%', height: '350px', background: '#e0e0e0', borderRadius: '8px', marginBottom: '15px' }}>
          {currentPosition && (
            <iframe
              title="Live Route Map"
              width="100%"
              height="100%"
              style={{ border: 0, borderRadius: '8px' }}
              src={`https://maps.google.com/maps?saddr=${currentPosition.lat},${currentPosition.lng}&daddr=${encodeURIComponent(currentDestination)}&output=embed`}
            ></iframe>
          )}
        </div>

        {routeStage === 'pickup' ? (
          <button 
            onClick={() => setRouteStage('delivery')}
            style={{ background: '#2196f3', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '5px', cursor: 'pointer', width: '100%', marginBottom: '10px', fontWeight: 'bold' }}
          >
            אספתי מהספק - המשך לעמותה ➔
          </button>
        ) : (
          <button 
            onClick={handleCompleteDelivery}
            style={{ background: '#4caf50', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '5px', cursor: 'pointer', width: '100%', marginBottom: '10px', fontWeight: 'bold' }}
          >
            ✓ סיום משלוח - הבאתי את המשלוח לעמותה
          </button>
        )}

        {routeStage === 'delivery' && (
          <button 
            onClick={() => setRouteStage('pickup')}
            style={{ background: '#757575', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', width: '100%' }}
          >
            חזור לשלב האיסוף
          </button>
        )}
      </div>
    );
  }

  if (id && singleRequest) {
    return (
      <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', padding: '20px' }}>
        <h2>פרטי בקשת איסוף נכנסת</h2>
        {message && <div style={{ background: '#e0f7fa', padding: '10px', marginBottom: '15px', borderRadius: '5px' }}>{message}</div>}
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd' }}>
          <p><strong>מזהה שידוך:</strong> #{singleRequest.id}</p>
          <CountdownTimer onExpire={() => navigate('/app/volunteer/incoming-request')} />
          <button 
            onClick={() => handleAccept(singleRequest)}
            style={{ background: '#4caf50', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}
          >
            אישור איסוף ומעבר למפה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', textAlign: 'right', direction: 'rtl', padding: '20px' }}>
      <h2>בקשות איסוף נכנסות</h2>
      {message && <div style={{ background: '#e0f7fa', padding: '10px', marginBottom: '15px', borderRadius: '5px' }}>{message}</div>}
      
      {requests.length === 0 ? (
        <p>אין כרגע בקשות איסוף פעילות.</p>
      ) : (
        requests.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd' }}>
            <p><strong>מזהה שידוך:</strong> #{item.id}</p>
            <CountdownTimer onExpire={() => fetchIncomingRequests()} />
            <button 
              onClick={() => handleAccept(item)}
              style={{ background: '#4caf50', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}
            >
              אישור איסוף ומעבר למפה
            </button>
          </div>
        ))
      )}
    </div>
  );
}