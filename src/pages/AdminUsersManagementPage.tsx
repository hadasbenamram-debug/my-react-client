import React, { useState, useEffect } from 'react';

export function AdminUsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    const token = localStorage.getItem('token');

    fetch('/api/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת משתמשים');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת משתמשים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleSuspend = (userId: number, currentStatus: boolean) => {
    const token = localStorage.getItem('token');
    const action = currentStatus ? 'activate' : 'suspend';

    fetch(`/api/users/${userId}/${action}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    })
      .then(res => {
        if (res.ok) {
          alert('סטטוס המשתמש עודכן בהצלחה!');
          fetchUsers();
        } else {
          alert('שגיאה בעדכון סטטוס המשתמש.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>טוען רשימת משתמשים...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>ניהול משתמשים במערכת</h2>
      <p>חיפוש, צפייה והשעיית משתמשים רשומים.</p>

      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="חפש לפי שם או אימייל..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>לא נמצאו משתמשים התואמים את החיפוש.</p>
        </div>
      ) : (
        filteredUsers.map((user) => (
          <div key={user.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p><strong>שם:</strong> {user.name}</p>
              <p><strong>תפקיד:</strong> {user.role}</p>
              <p><strong>אימייל:</strong> {user.email}</p>
              <p><strong>סטטוס:</strong> <span style={{ color: user.isSuspended ? '#c62828' : '#34a853', fontWeight: 'bold' }}>{user.isSuspended ? 'מושהה' : 'פעיל'}</span></p>
            </div>
            <div>
              <button 
                onClick={() => handleToggleSuspend(user.id, user.isSuspended)} 
                style={{ padding: '8px 12px', background: user.isSuspended ? '#34a853' : '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {user.isSuspended ? 'הפעל מחדש' : 'השעה משתמש'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}