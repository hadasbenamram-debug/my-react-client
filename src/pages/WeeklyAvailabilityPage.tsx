import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface AvailabilitySlot {
  day: number;
  startTime: string;
  endTime: string;
  regionId: number;
  toRegionId: number;
}

export const WeeklyAvailabilityPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    // 1. בדיקה האם יש טוקן בכתובת ה-URL (הגיע מהמייל)
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. שליפת הטוקן מ-localStorage לבדיקת הרשאה
    const token = localStorage.getItem('token');
    if (!token) {
      setError('לא נמצא טוקן התחברות. אנא התחבר מחדש למערכת.');
      setLoading(false);
      return;
    }

    // 3. שליפת נתוני הזמינות הקיימים של המתנדב
    const fetchAvailability = async () => {
      try {
        const response = await axios.get(`/api/volunteers/availability`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // אם יש נתונים קיימים, נטען אותם לסטייט
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setAvailabilitySlots(response.data.map((slot: any) => ({
            day: slot.day ?? 0,
            startTime: slot.startTime ? slot.startTime.substring(0, 5) : '08:00',
            endTime: slot.endTime ? slot.endTime.substring(0, 5) : '16:00',
            regionId: slot.regionId ?? 1,
            toRegionId: slot.toRegionId ?? 0
          })));
        } else {
          // ברירת מחדל: שורה ריקה אחת להתחלה
          setAvailabilitySlots([
            { day: 0, startTime: '08:00', endTime: '16:00', regionId: 1, toRegionId: 0 }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching availability:', err);
        setError('שגיאה בטעינת הנתונים. ייתכן שפג תוקף ההתחברות.');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  // הוספת משבצת זמינות חדשה לרשימה
  const handleAddSlot = () => {
    setAvailabilitySlots([
      ...availabilitySlots,
      { day: 0, startTime: '08:00', endTime: '16:00', regionId: 1, toRegionId: 0 }
    ]);
  };

  // מחיקת משבצת זמינות
  const handleRemoveSlot = (index: number) => {
    const updated = availabilitySlots.filter((_, i) => i !== index);
    setAvailabilitySlots(updated);
  };

  // עדכון שדה ספציפי במשבצת
  const handleSlotChange = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...availabilitySlots];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilitySlots(updated);
  };

  // שמירת הזמינות בשרת
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('token');
    try {
      // תיקון: העברת availabilitySlots כפרמטר השני ל-axios.post
      await axios.post(`/api/volunteers/availability`, availabilitySlots, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSuccessMessage('הזמינות נשמרה בהצלחה!');
    } catch (err: any) {
      console.error('Error saving availability:', err);
      setError(err.response?.data?.message || 'שגיאה בשמירת הנתונים. נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>טוען נתונים...</div>;
  }

  if (error && availabilitySlots.length === 0) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>{error}</div>;
  }

  const daysOfWeek = [
    { label: 'ראשון', value: 0 },
    { label: 'שני', value: 1 },
    { label: 'שלישי', value: 2 },
    { label: 'רביעי', value: 3 },
    { label: 'חמישי', value: 4 },
    { label: 'שישי', value: 5 },
    { label: 'שבת', value: 6 },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', direction: 'rtl', textAlign: 'right' }}>
      <h2>ניהול זמינות מתנדב</h2>
      <p>ברוך הבא! הגדר כאן את ימי ושעות הזמינות שלך להתנדבות:</p>

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      {successMessage && <div style={{ color: 'green', marginBottom: '15px', fontWeight: 'bold' }}>{successMessage}</div>}

      <form onSubmit={handleSubmit}>
        {availabilitySlots.map((slot, index) => (
          <div key={index} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px', borderRadius: '8px', background: '#f9f9f9' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              
              {/* בחירת יום */}
              <div style={{ flex: '1', minWidth: '120px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>יום בשבוע:</label>
                <select 
                  value={slot.day} 
                  onChange={(e) => handleSlotChange(index, 'day', parseInt(e.target.value))}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  {daysOfWeek.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* שעת התחלה */}
              <div style={{ flex: '1', minWidth: '110px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>משעה (התחלה):</label>
                <input 
                  type="time" 
                  value={slot.startTime} 
                  onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* שעת סיום */}
              <div style={{ flex: '1', minWidth: '110px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>עד שעה (סיום):</label>
                <input 
                  type="time" 
                  value={slot.endTime} 
                  onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* מזהה אזור */}
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>מזהה אזור:</label>
                <input 
                  type="number" 
                  value={slot.regionId} 
                  onChange={(e) => handleSlotChange(index, 'regionId', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => handleRemoveSlot(index)}
              style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              מחק משבצת זו
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button 
            type="button" 
            onClick={handleAddSlot}
            style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
          >
            + הוסף משבצת זמינות
          </button>

          <button 
            type="submit" 
            disabled={saving}
            style={{ background: '#008CBA', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>
      </form>
    </div>
  );
};