/** Quadratic arc that bows sideways between two map points. */
export const arcPath = (from, to, bow) => {
    const [x1, y1] = from;
    const [x2, y2] = to;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const control = [
        (x1 + x2) / 2 + (dy / len) * bow,
        (y1 + y2) / 2 - (dx / len) * bow
    ];

    return {d: `M${x1} ${y1}Q${control[0]} ${control[1]} ${x2} ${y2}`, control};
};

/** Point on that arc at t (0..1). */
export const pointAt = (from, control, to, t) => {
    const u = 1 - t;
    return [
        u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
        u * u * from[1] + 2 * u * t * control[1] + t * t * to[1]
    ];
};
