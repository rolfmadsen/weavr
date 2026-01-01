export const safeNum = (val: any, def = 0): number => {
    const num = Number(val);
    return isFinite(num) ? num : def;
};

export const safeStr = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
};

export function getPolylineMidpoint(points: number[]): { x: number, y: number } {
    if (points.length < 4) return { x: points[0] || 0, y: points[1] || 0 };

    let totalLength = 0;
    const segments: { x1: number, y1: number, x2: number, y2: number, length: number }[] = [];

    for (let i = 0; i < points.length - 2; i += 2) {
        const x1 = points[i];
        const y1 = points[i + 1];
        const x2 = points[i + 2];
        const y2 = points[i + 3];
        const len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        segments.push({ x1, y1, x2, y2, length: len });
        totalLength += len;
    }

    const targetDist = totalLength / 2;
    let currentDist = 0;

    for (const seg of segments) {
        if (currentDist + seg.length >= targetDist) {
            const remaining = targetDist - currentDist;
            if (seg.length === 0) return { x: seg.x1, y: seg.y1 };

            const ratio = remaining / seg.length;
            return {
                x: seg.x1 + (seg.x2 - seg.x1) * ratio,
                y: seg.y1 + (seg.y2 - seg.y1) * ratio
            };
        }
        currentDist += seg.length;
    }

    const midIdx = Math.floor(points.length / 2);
    const idx = midIdx % 2 === 0 ? midIdx : midIdx - 1;
    return { x: points[idx] || 0, y: points[idx + 1] || 0 };
}

export function pointsAreEqual(p1: number[] | undefined, p2: number[] | undefined): boolean {
    if (p1 === p2) return true;
    if (!p1 || !p2) return false;
    if (p1.length !== p2.length) return false;
    for (let i = 0; i < p1.length; i++) {
        if (p1[i] !== p2[i]) return false;
    }
    return true;
}
