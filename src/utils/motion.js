export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** Remap `value` from the [start, end] window onto 0..1. */
export const range = (value, start, end) => clamp((value - start) / (end - start));

export const prefersReducedMotion = () => typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
