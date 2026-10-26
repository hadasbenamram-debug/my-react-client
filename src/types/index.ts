import type {CSSProperties} from 'react';

/** CSS style object that also accepts custom properties such as `--spin`. */
export type CSSVarStyle = CSSProperties & {[customProperty: `--${string}`]: string | number};

/** Shape of the `currentUser` object stored in localStorage after login. */
export interface StoredUser {
    /** התפקיד הפעיל - לפיו נבנים המסכים והתפריט */
    role?: string;
    /** כל התפקידים המאושרים של החשבון (תיקון 10: חשבון אחד יכול להיות גם ספק וגם מתנדב) */
    roles?: string[];
    type?: string;
    [key: string]: unknown;
}

/** A point in the SVG map's coordinate space: [x, y]. */
export type Point = [number, number];

export interface LatLng {
    lat: number;
    lng: number;
}
