import {useEffect, useRef, useState} from 'react';
import * as signalR from '@microsoft/signalr';
import {getToken} from '../utils/auth';
import type {DeliveryLogResponseDto, MatchStatusChangedEvent} from '../types/api';
import type {LiveConnectionState} from './useRouteLive';

// עדכונים בזמן אמת של כל המסלולים - למפה החיה של המנהל (SignalR, /notificationHub).
// כמו useRouteLive, אבל מצטרפים לקבוצה של כל המסלולים (WatchAllRoutes - השרת בודק שהמשתמש מנהל)
// ומקבלים כל רישום ביומן של כל מסלול (DeliveryLogAdded). כל רישום כולל את מזהה המסלול (volunteerRouteId).

export interface AllRoutesLiveHandlers {
    /** רישום חדש ביומן של מסלול כלשהו: עדכון מיקום, יציאה לדרך, איסוף, מסירה... */
    onLog?: (log: DeliveryLogResponseDto) => void;
    /** סטטוס של תחנה במסלול כלשהו השתנה (המנהל מקבל את זה ממילא - הוא בקבוצת המנהלים) */
    onStatusChanged?: (event: MatchStatusChangedEvent) => void;
    /** הצטרפנו (בפעם הראשונה או אחרי ניתוק) - כדאי לטעון מחדש כדי לא לפספס עדכונים */
    onJoined?: () => void;
}

export function useAllRoutesLive(enabled: boolean, handlers: AllRoutesLiveHandlers): LiveConnectionState {
    const [state, setState] = useState<LiveConnectionState>('connecting');
    const handlersRef = useRef<AllRoutesLiveHandlers>(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        if (!enabled) return undefined;

        let disposed = false;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/notificationHub', {accessTokenFactory: () => getToken() ?? ''})
            .withAutomaticReconnect()
            .build();

        connection.on('DeliveryLogAdded', (log: DeliveryLogResponseDto) => handlersRef.current.onLog?.(log));
        connection.on('MatchStatusChanged', (event: MatchStatusChangedEvent) => handlersRef.current.onStatusChanged?.(event));

        const watch = async () => {
            await connection.invoke('WatchAllRoutes');
            if (disposed) return;
            setState('live');
            handlersRef.current.onJoined?.();
        };

        connection.onreconnecting(() => {
            if (!disposed) setState('reconnecting');
        });

        // אחרי חיבור מחדש יש חיבור חדש בשרת - מצטרפים שוב
        connection.onreconnected(() => {
            watch().catch(() => {
                if (!disposed) setState('offline');
            });
        });

        connection.onclose(() => {
            if (!disposed) setState('offline');
        });

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
    }, [enabled]);

    return state;
}
