import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// תיקון 60: "תרומה #N" ברשימות של העמותה והמתנדב הוא קישור למסך התרומה (פרטים / מעקב / שיחה)
// תיקון 63: גם ברשימות של הספק
export default function DonationLink({ role, id, children }: { role: 'ngo' | 'volunteer' | 'supplier'; id: number; children: ReactNode }) {
  return (
    <Link to={`/app/${role}/donation/${id}`} style={{ color: 'inherit', textDecorationColor: 'var(--teal)', textUnderlineOffset: '0.2em' }}>
      {children}
    </Link>
  );
}
