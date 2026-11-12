import {useEffect, type RefObject} from 'react';

/**
 * תיקון 56: הכותרת העליונה שקופה. כשאזור עם רקע צבעוני נמצא מתחתיה, מוסיפים ל-body מחלקה
 * (כמו on-dark-scene בסצנות הכהות), וה-CSS צובע את הלוגו ואת פסי התפריט כך שיישארו קריאים.
 * לכל אזור מחלקה משלו - כדי ששני אזורים צמודים לא ימחקו זה לזה את המחלקה.
 */
export default function useHeaderOverScene(ref: RefObject<HTMLElement | null>, className: string, enabled = true): void {
    useEffect(() => {
        const node = ref.current;
        if (!enabled || !node) {
            return undefined;
        }

        let frame = 0;
        const update = () => {
            frame = 0;
            const rect = node.getBoundingClientRect();
            document.body.classList.toggle(className, rect.top < 72 && rect.bottom > 24);
        };
        const onScroll = () => {
            if (!frame) {
                frame = requestAnimationFrame(update);
            }
        };

        update();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            document.body.classList.remove(className);
        };
    }, [ref, className, enabled]);
}
