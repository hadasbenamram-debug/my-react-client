import type {Point} from '../types';

export interface ArcPath {
    /** SVG path data for the arc. */
    d: string;
    /** Quadratic control point. */
    control: Point;
}

/** Quadratic arc that bows sideways between two map points. */
export const arcPath = (from: Point, to: Point, bow: number): ArcPath => {
    const [x1, y1] = from;
    const [x2, y2] = to;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const control: Point = [
        (x1 + x2) / 2 + (dy / len) * bow,
        (y1 + y2) / 2 - (dx / len) * bow
    ];

    return {d: `M${x1} ${y1}Q${control[0]} ${control[1]} ${x2} ${y2}`, control};
};

/** Point on that arc at t (0..1). */
export const pointAt = (from: Point, control: Point, to: Point, t: number): Point => {
    const u = 1 - t;
    return [
        u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
        u * u * from[1] + 2 * u * t * control[1] + t * t * to[1]
    ];
};
