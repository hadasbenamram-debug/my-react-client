import {Link} from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="site-footer">
            <p>לתת באהבה · הצלת מזון · קהילה · ערבות הדדית</p>
            <p>
                <a href="tel:0500000000">050-000-0000</a>
                {' · '}
                <Link to="/contact">צרו קשר</Link>
            </p>
        </footer>
    );
}
