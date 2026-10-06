import {useEffect, useRef, useState} from 'react';

/** True once the element has entered the viewport; never flips back. */
export default function useInView(threshold = 0.35) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || inView) {
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setInView(true);
            }
        }, {threshold});

        observer.observe(node);
        return () => observer.disconnect();
    }, [inView, threshold]);

    return [ref, inView];
}
