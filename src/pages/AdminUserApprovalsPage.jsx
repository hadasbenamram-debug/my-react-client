import React, { useState, useEffect } from 'react';

export function AdminUserApprovalsPage() {
  const [selectedRole, setSelectedRole] = useState('volunteers'); // 'volunteers', 'suppliers', או 'associations'
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // הגדרת הנתיב בהתאם לסוג הנבחר
  const getApiEndpoint = (role) => {
    switch (role) {
      case 'volunteers': return '/api/volunteers';
      case 'suppliers': return '/api/suppliers';
      case 'associations': return '/api/ngos'; // נתיב נכון עבור עמותות
      default: return '/api/volunteers';
    }
  };

  const apiEndpoint = getApiEndpoint(selectedRole);

  const fetchPendingUsers = () => {
    setLoading(true);
    setError(null);
    fetch(apiEndpoint, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'שגיאה בטעינת נתונים ממתינים');
        }
        return res.json();
      })
      .then(data => {
        console.log(`Data received from ${selectedRole}:`, data);

        // סינון רחב שמתאים גם למספרים וגם למחרוזות (Pending / pending / 0)
        const pending = data.filter(u => {
          const status = u.approvalStatus !== undefined ? u.approvalStatus : u.ApprovalStatus;
          return status === 'Pending' || status === 'pending' || status === 0;
        });

        setPendingUsers(pending);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPendingUsers();
  }, [selectedRole]);

  const handleApprove = (id) => {
    fetch(`${apiEndpoint}/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async res => {
        if (res.ok) {
          alert('הבקשה אושרה בהצלחה ונשלח מייל למשתמש!');
          fetchPendingUsers();
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.message || 'שגיאה באישור הבקשה.');
        }
      })
      .catch(err => console.error(err));
  };

  const handleReject = (id) => {
    const reason = prompt('הכנס סיבת דחייה:');
    if (reason === null) return; // בוטל

    fetch(`${apiEndpoint}/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(reason)
    })
      .then(async res => {
        if (res.ok) {
          alert('הבקשה נדחתה בהצלחה.');
          fetchPendingUsers();
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.message || 'שגיאה בדחיית הבקשה.');
        }
      })
      .catch(err => console.error(err));
  };

  return (
    <div style={{ maxWidth: '750px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>ניהול אישורי משתמשים במערכת</h2>
      <p style={{ color: '#666', marginBottom: '15px' }}>כאן ניתן לצפות בכל המשתמשים שנרשמו וממתינים לאישור מנהל.</p>

      {/* כפתורי מעבר בין מתנדבים, ספקים ועמותות */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setSelectedRole('volunteers')} 
          style={{ padding: '8px 16px', background: selectedRole === 'volunteers' ? '#0066cc' : '#e0e0e0', color: selectedRole === 'volunteers' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          מתנדבים ממתינים
        </button>
        <button 
          onClick={() => setSelectedRole('suppliers')} 
          style={{ padding: '8px 16px', background: selectedRole === 'suppliers' ? '#0066cc' : '#e0e0e0', color: selectedRole === 'suppliers' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ספקים ממתינים
        </button>
        <button 
          onClick={() => setSelectedRole('associations')} 
          style={{ padding: '8px 16px', background: selectedRole === 'associations' ? '#0066cc' : '#e0e0e0', color: selectedRole === 'associations' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          עמותות ממתינות
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>טוען נתונים...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#c62828' }}>{error}</div>
      ) : pendingUsers.length === 0 ? (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>אין בקשות ממתינות להצגה בקטגוריה זו.</p>
        </div>
      ) : (
        pendingUsers.map((item) => (
          <div key={item.id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong>
                {item.name || item.fullName} 
                {(item.businessName || item.BusinessName) && ` (עסק: ${item.businessName || item.BusinessName})`}
                {item.associationName && ` (עמותה: ${item.associationName})`}
              </strong>
              <span style={{ color: '#0066cc' }}>מזהה: #{item.id}</span>
            </div>
            
            <p style={{ margin: '0 0 5px 0', color: '#333' }}>אימייל: {item.email}</p>
            <p style={{ margin: '0 0 10px 0', color: '#666' }}>טלפון: {item.phone}</p>
            
            {item.vehicleType && <p style={{ margin: '0 0 5px 0', color: '#444' }}>רכב: {item.vehicleType}</p>}
            {(item.address || item.Address) && <p style={{ margin: '0 0 5px 0', color: '#444' }}>כתובת: {item.address || item.Address}</p>}
            {(item.taxId || item.TaxId) && <p style={{ margin: '0 0 5px 0', color: '#444' }}>ח.פ / תיק עוסק: {item.taxId || item.TaxId}</p>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => handleApprove(item.id)} style={{ padding: '6px 12px', background: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                אשר
              </button>
              <button onClick={() => handleReject(item.id)} style={{ padding: '6px 12px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                דחה
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}