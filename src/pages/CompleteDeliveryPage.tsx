import React, { useState } from 'react';

export function CompleteDeliveryPage() {
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // מזהה המסלול יכול להיות מועבר כפרופ (Props) או מוגדר באופן דינמי
  const volunteerRouteId = 104;

  const handleCompleteDelivery = async () => {
    setLoading(true);
    try {
      // שליפת טוקן ההתחברות מהאחסון המקומי
      const token = localStorage.getItem('token');
      
      // הוספת הדפסה כדי לוודא מה הטוקן מכיל בדיוק
      console.log('הטוקן שנשלף מה-localStorage:', token);

      const response = await fetch('/api/deliverylogs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          volunteerRouteId: volunteerRouteId, 
          status: 'Completed' 
        })
      });

      if (response.ok) {
        setIsCompleted(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'שגיאה בעדכון הנתונים מול השרת.');
      }
    } catch (error) {
      alert('שגיאת תקשורת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>מסירה לעמותה (עדכון מסד נתונים)</h2>
      {isCompleted ? (
        <p style={{ color: '#34a853', fontWeight: 'bold' }}>הסטטוס עודכן בהצלחה במסד הנתונים כ-Completed!</p>
      ) : (
        <button 
          onClick={handleCompleteDelivery} 
          disabled={loading} 
          style={{ width: '100%', padding: '12px', background: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'מעדכן במסד...' : 'אישור מסירה וסיום שיבוץ'}
        </button>
      )}
    </div>
  );
}