import React, { useState, useEffect } from 'react';

export function VrpRouteVisualizationPage() {
  const [routePlan, setRoutePlan] = useState<any>({
    routeId: 0,
    stops: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/routing/current-plan')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setRoutePlan(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת תוכנית המסלול:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>מחשב מסלול אופטימלי (VRP)...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>תכנון והמחשת מסלול איסוף (VRP)</h2>
      <p>סדר תחנות מחושב עבור המסלול הנוכחי להשגת יעילות מירבית.</p>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <p><strong>מזהה מסלול:</strong> #{routePlan.routeId || 'N/A'}</p>
        <p><strong>סך תחנות במסלול:</strong> {routePlan.stops?.length || 0}</p>
      </div>

      <h3>תחנות לפי סדר ביצוע:</h3>
      {(!routePlan.stops || routePlan.stops.length === 0) ? (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>אין תחנות מוגדרות במסלול כרגע.</p>
        </div>
      ) : (
        routePlan.stops.map((stop: any, index: number) => (
          <div key={index} style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '30px', height: '30px', background: '#0066cc', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {index + 1}
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0' }}><strong>סוג תחנה:</strong> {stop.actionType === 'Pickup' ? 'איסוף ספק' : 'מסירה לעמותה'}</p>
              <p style={{ margin: '0 0 5px 0' }}><strong>שם המקום:</strong> {stop.locationName}</p>
              <p style={{ margin: '0' }}><strong>כתובת:</strong> {stop.address}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}