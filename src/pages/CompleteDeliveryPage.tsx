import {Navigate} from 'react-router-dom';

// סימון האיסוף והמסירה נעשה עכשיו לכל תחנה במסך המסלול הפעיל
export function CompleteDeliveryPage() {
    return <Navigate to="/app/volunteer/active-route" replace />;
}
