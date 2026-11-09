import {useEffect, useRef, useState} from 'react';
import * as signalR from '@microsoft/signalr';
import {getToken} from '../utils/auth';
import type {DeliveryLogResponseDto, MatchStatusChangedEvent} from '../types/api';

// עדכונים בזמן אמת של מסלול אחד (SignalR, /notificationHub):
// מצטרפים לקבוצת המסלול (WatchRoute - השרת בודק שהמשתמש קשור למסלול) ומקבלים כל רישום חדש
// ביומן המשלוח (DeliveryLogAdded): עדכון מיקום של המתנדב, איסוף, מסירה וכו'.

export type LiveConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface RouteLiveHandlers {
    /** רישום חדש ביומן המשלוח של המסלול */
    onLog?: (log: DeliveryLogResponseDto) => void;
    /** סטטוס של תחנה במסלול השתנה */
    onStatusChanged?: (event: MatchStatusChangedEvent) => void;
    /** הצטרפנו לקבוצת המסלול (בפעם הראשונה או אחרי ניתוק) - כדאי לטעון מחדש כדי לא לפספס עדכונים */
    onJoined?: () => void;
}

export function useRouteLive(routeId: number | null, handlers: RouteLiveHandlers): LiveConnectionState {
    const [state, setState] = useState<LiveConnectionState>('connecting');
    const handlersRef = useRef<RouteLiveHandlers>(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        if (!routeId) return undefined;

        let disposed = false;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/notificationHub', {accessTokenFactory: () => getToken() ?? ''})
            .withAutomaticReconnect()
            .build();

        connection.on('DeliveryLogAdded', (log: DeliveryLogResponseDto) => {
            if (log.volunteerRouteId === routeId) handlersRef.current.onLog?.(log);
        });

        connection.on('MatchStatusChanged', (event: MatchStatusChangedEvent) => {
            if (event.routeId === routeId) handlersRef.current.onStatusChanged?.(event);
        });

        const watch = async () => {
            await connection.invoke('WatchRoute', routeId);
            if (disposed) return;
            setState('live');
            handlersRef.current.onJoined?.();
        };

        connection.onreconnecting(() => {
            if (!disposed) setState('reconnecting');
        });

        // אחרי חיבור מחדש יש חיבור חדש בשרת - מצטרפים שוב לקבוצת המסלול
        connection.onreconnected(() => {
            watch().catch(() => {
                if (!disposed) setState('offline');
            });
        });

        connection.onclose(() => {
            if (!disposed) setState('offline');
        });

        setState('connecting');
        connection
            .start()
            .then(watch)
            .catch((error: unknown) => {
                if (disposed) return;
                console.warn('SignalR connection error', error);
                setState('offline');
            });

        return () => {
            disposed = true;
            void connection.stop();
        };
    }, [routeId]);

    return state;
}
