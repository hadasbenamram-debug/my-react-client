import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function NgoWorkingHoursPage() {
  const [workingHours, setWorkingHours] = useState({
    address: 'בורוכוב 12',
    latitude: 32.0853,
    longitude: 34.7818,
    sunToThuOpenTime: '09:00',
    sunToThuCloseTime: '17:00',
    receivesOnFriday: false,
    fridayOpenTime: '09:00',
    fridayCloseTime: '13:00'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. תפיסת הטוקן מה-URL ושמירתו ב-localStorage
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      // מנקה את הטוקן משורת הכתובת בדפדפן
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('לא נמצא טוקן התחברות. אנא פתח את הקישור מחדש מהמייל.');
      setLoading(false);
      return;
    }

    const payload = {
      address: workingHours.address,
      latitude: Number(workingHours.latitude),
      longitude: Number(workingHours.longitude),
      sunToThuOpenTime: workingHours.sunToThuOpenTime.length === 5 ? `${workingHours.sunToThuOpenTime}:00` : workingHours.sunToThuOpenTime,
      sunToThuCloseTime: workingHours.sunToThuCloseTime.length === 5 ? `${workingHours.sunToThuCloseTime}:00` : workingHours.sunToThuCloseTime,
      receivesOnFriday: workingHours.receivesOnFriday,
      fridayOpenTime: workingHours.receivesOnFriday ? (workingHours.fridayOpenTime.length === 5 ? `${workingHours.fridayOpenTime}:00` : workingHours.fridayOpenTime) : null,
      fridayCloseTime: workingHours.receivesOnFriday ? (workingHours.fridayCloseTime.length === 5 ? `${workingHours.fridayCloseTime}:00` : workingHours.fridayCloseTime) : null
    };

    try {
      await axios.put('https://localhost:7295/api/ngos/my-hours', payload, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      setSuccessMessage('שעות הקבלה והמיקום עודכנו בהצלחה!');
    } catch (err: any) {
      console.error('שגיאה בעדכון הנתונים:', err);
      setError(err.response?.data?.message || 'שגיאה בעדכון הנתונים מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>הגדרת מיקום ושעות קבלה</h2>

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      {successMessage && <div style={{ color: 'green', marginBottom: '15px', fontWeight: 'bold' }}>{successMessage}</div>}

      <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <div style={{ marginBottom: '12px' }}>
          <label>כתובת מדויקת: </label>
          <input 
            type="text" 
            value={workingHours.address} 
            onChange={e => setWorkingHours({ ...workingHours, address: e.target.value })} 
            style={{ width: '100%', padding: '6px' }} 
            required 
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label>שעת פתיחה (א'–ה'): </label>
            <input 
              type="time" 
              value={workingHours.sunToThuOpenTime} 
              onChange={e => setWorkingHours({ ...workingHours, sunToThuOpenTime: e.target.value })} 
              style={{ width: '100%', padding: '6px' }} 
              required 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>שעת סגירה (א'–ה'): </label>
            <input 
              type="time" 
              value={workingHours.sunToThuCloseTime} 
              onChange={e => setWorkingHours({ ...workingHours, sunToThuCloseTime: e.target.value })} 
              style={{ width: '100%', padding: '6px' }} 
              required 
            />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={workingHours.receivesOnFriday} 
              onChange={e => setWorkingHours({ ...workingHours, receivesOnFriday: e.target.checked })} 
              style={{ marginLeft: '8px' }}
            />
            מקבלים בימי שישי
          </label>
        </div>

        {workingHours.receivesOnFriday && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label>שעת פתיחה (יום ו'): </label>
              <input 
                type="time" 
                value={workingHours.fridayOpenTime} 
                onChange={e => setWorkingHours({ ...workingHours, fridayOpenTime: e.target.value })} 
                style={{ width: '100%', padding: '6px' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>שעת סגירה (יום ו'): </label>
              <input 
                type="time" 
                value={workingHours.fridayCloseTime} 
                onChange={e => setWorkingHours({ ...workingHours, fridayCloseTime: e.target.value })} 
                style={{ width: '100%', padding: '6px' }} 
              />
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'מעדכן...' : 'שמור שעות ומיקום'}
        </button>
      </form>
    </div>
  );
}