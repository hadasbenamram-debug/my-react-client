import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import PageTitle from '../components/PageTitle';

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
    <Chip
      icon={<AccessTimeIcon />}
      color={timeLeft <= 60 ? 'error' : 'default'}
      variant="outlined"
      label={`זמן נותר לאישור: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
      sx={{ mb: 2 }}
    />
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
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const messageAlert = message ? (
    <Alert severity="info" sx={{ mb: 3 }}>{message}</Alert>
  ) : null;

  if (activeMatch) {
    const supplierAddress = activeMatch.donation?.address || activeMatch.address || "כתובת ספק";
    const ngoAddress = activeMatch.ngo?.address || activeMatch.destinationAddress || "כתובת עמותה";
    const currentDestination = routeStage === 'pickup' ? supplierAddress : ngoAddress;

    return (
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <PageTitle eyebrow="מתנדב" title="מסלול איסוף ומסירה פעיל" />

        <Card sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
          <Typography sx={{ mb: 1 }}>
            <strong>שלב נוכחי:</strong> {routeStage === 'pickup' ? 'נסיעה אל הספק' : 'נסיעה אל העמותה'}
          </Typography>
          <Typography>
            <strong>יעד:</strong> {currentDestination}
          </Typography>
        </Card>

        <Box sx={{ width: '100%', height: 350, bgcolor: 'grey.200', borderRadius: 4, overflow: 'hidden', mb: 3 }}>
          {currentPosition && (
            <iframe
              title="Live Route Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              src={`https://maps.google.com/maps?saddr=${currentPosition.lat},${currentPosition.lng}&daddr=${encodeURIComponent(currentDestination)}&output=embed`}
            ></iframe>
          )}
        </Box>

        {routeStage === 'pickup' ? (
          <Button
            variant="contained"
            size="large"
            fullWidth
            endIcon={<ArrowBackIcon />}
            onClick={() => setRouteStage('delivery')}
          >
            אספתי מהספק - המשך לעמותה
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<CheckIcon />}
            onClick={handleCompleteDelivery}
          >
            סיום משלוח - הבאתי את המשלוח לעמותה
          </Button>
        )}

        {routeStage === 'delivery' && (
          <Button variant="text" fullWidth onClick={() => setRouteStage('pickup')} sx={{ mt: 1.5 }}>
            חזור לשלב האיסוף
          </Button>
        )}
      </Box>
    );
  }

  if (id && singleRequest) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <PageTitle eyebrow="מתנדב" title="פרטי בקשת איסוף נכנסת" />
        {messageAlert}
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          <Typography sx={{ mb: 2 }}>
            <strong>מזהה שידוך:</strong> #{singleRequest.id}
          </Typography>
          <CountdownTimer onExpire={() => navigate('/app/volunteer/incoming-request')} />
          <Box>
            <Button variant="contained" size="large" onClick={() => handleAccept(singleRequest)}>
              אישור איסוף ומעבר למפה
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="מתנדב" title="בקשות איסוף נכנסות" />
      {messageAlert}

      {requests.length === 0 ? (
        <Card sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
          <Typography color="text.secondary">אין כרגע בקשות איסוף פעילות.</Typography>
        </Card>
      ) : (
        requests.map((item) => (
          <Card key={item.id} sx={{ p: { xs: 3, md: 4 }, mb: 2 }}>
            <Typography sx={{ mb: 2 }}>
              <strong>מזהה שידוך:</strong> #{item.id}
            </Typography>
            <CountdownTimer onExpire={() => fetchIncomingRequests()} />
            <Box>
              <Button variant="contained" onClick={() => handleAccept(item)}>
                אישור איסוף ומעבר למפה
              </Button>
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}
