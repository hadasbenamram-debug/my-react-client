import React, { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    // יצירת החיבור ל-SignalR Hub בשרת
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("/notificationHub") // יש לוודא את הכתובת המוגדרת בשרת ה-C#
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, []);

  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log('SignalR Connected Successfully.');
          
          // האזנה לאירוע הגעת התראה חדשה מהשרת
          connection.on("ReceiveNotification", (notification) => {
            setNotifications((prevNotifications) => [notification, ...prevNotifications]);
          });
        })
        .catch((error) => console.error('SignalR Connection Error: ', error));
    }
  }, [connection]);

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial' }}>
      <h2>מרכז ההתראות בזמן אמת</h2>
      
      <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', background: '#fafafa', minHeight: '250px' }}>
        {notifications.length === 0 ? (
          <p style={{ color: '#666' }}>אין התראות חדשות כרגע...</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map((notif, index) => (
              <li key={index} style={{ background: '#fff', padding: '12px', borderRadius: '6px', borderRight: '4px solid #0066cc', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{notif.subject || 'התראה מערכת'}</div>
                <div style={{ fontSize: '14px', color: '#333' }}>{notif.content}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                  {new Date(notif.createdAt || Date.now()).toLocaleTimeString('he-IL')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}