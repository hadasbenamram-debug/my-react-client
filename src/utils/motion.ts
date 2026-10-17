export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

/** Remap `value` from the [start, end] window onto 0..1. */
export const range = (value: number, start: number, end: number): number => clamp((value - start) / (end - start));

export const prefersReducedMotion = (): boolean => typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
