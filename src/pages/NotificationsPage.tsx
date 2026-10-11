import React, { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PageTitle from '../components/PageTitle';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    // שליפת הטוקן מתוך ה-localStorage בהתאם למפתח שנמצא במערכת ('token')
    const token = localStorage.getItem('token') || '';

    // יצירת החיבור ל-SignalR Hub בשרת עם העברת הטוקן ב-accessTokenFactory
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:7295/notificationHub", {
        accessTokenFactory: () => token
      })
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
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="החשבון שלי" title="מרכז ההתראות" subtitle="התראות מופיעות כאן בזמן אמת." />

      {notifications.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
          <NotificationsNoneIcon sx={{ fontSize: 48, mb: 1, opacity: 0.6 }} />
          <Typography>אין התראות חדשות כרגע...</Typography>
        </Card>
      ) : (
        notifications.map((notif, index) => (
          <Card
            key={index}
            sx={{
              p: 2.5,
              mb: 1.5,
              borderInlineStart: '4px solid',
              borderInlineStartColor: 'primary.main',
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{notif.subject || 'התראה מערכת'}</Typography>
            <Typography>{notif.content}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: '0.75rem', mt: 1 }}>
              {new Date(notif.createdAt || Date.now()).toLocaleTimeString('he-IL')}
            </Typography>
          </Card>
        ))
      )}
    </Box>
  );
}