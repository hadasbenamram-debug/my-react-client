import {useEffect, useRef, useState, type RefObject} from 'react';

/** True once the element has entered the viewport; never flips back. */
export default function useInView<T extends Element = HTMLElement>(
    threshold = 0.35
): [RefObject<T>, boolean] {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState<boolean>(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || inView) {
            return undefined;
        }

        const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setInView(true);
            }
        }, {threshold});

        observer.observe(node);
        return () => observer.disconnect();
    }, [inView, threshold]);

    return [ref, inView];
}
