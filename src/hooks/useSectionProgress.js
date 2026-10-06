import {useEffect, useState} from 'react';

/**
 * Raw (unclamped) scroll progress of a tall section looked up by DOM id.
 * Negative while the section is still below the viewport, > 1 once it is past.
 */
export default function useSectionProgress(id) {
    const [progress, setProgress] = useState(-1);

    useEffect(() => {
        let frame = 0;

        const update = () => {
            frame = 0;
            const node = document.getElementById(id);
            if (!node) {
                return;
            }
            const rect = node.getBoundingClientRect();
            const distance = rect.height - window.innerHeight;
            setProgress(distance > 0 ? -rect.top / distance : 0);
        };

        const onScroll = () => {
            if (!frame) {
                frame = window.requestAnimationFrame(update);
            }
        };

        update();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [id]);

    return progress;
}
