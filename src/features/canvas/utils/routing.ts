import { Node } from '../../modeling';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../../../shared/constants';
import { safeNum } from './canvasUtils';

/**
 * NEW: Smart Routing Calculation
 * Calculates a 4-point orthogonal path for inter-slice edges.
 */
/**
 * NEW: Smart Routing Calculation
 * Calculates a 4-point orthogonal path for inter-slice edges.
 * Uses slice boundaries to place the "bend" in the gap between slices.
 */
/**
 * Determines which visual side an edge should use between two nodes.
 */
export function getLogicalSide(s: Node, t: Node): { s: 'N' | 'S' | 'E' | 'W'; t: 'N' | 'S' | 'E' | 'W' } {
    const sH = s.computedHeight || MIN_NODE_HEIGHT;
    const tH = t.computedHeight || MIN_NODE_HEIGHT;
    const scx = safeNum(s.x) + NODE_WIDTH / 2;
    const scy = safeNum(s.y) + sH / 2;
    const tcx = safeNum(t.x) + NODE_WIDTH / 2;
    const tcy = safeNum(t.y) + tH / 2;
    const dx = tcx - scx;
    const dy = tcy - scy;

    const isH = Math.abs(dx) > Math.abs(dy);
    if (isH) {
        return { s: dx > 0 ? 'E' : 'W', t: dx > 0 ? 'W' : 'E' };
    } else {
        return { s: dy > 0 ? 'S' : 'N', t: dy > 0 ? 'N' : 'S' };
    }
}

export function calculateSmartPoints(
    sourceNode: Node,
    targetNode: Node,
    sliceBounds: Map<string, { minX: number, maxX: number, minY: number, maxY: number }>,
    sIdx = 0, sTot = 1,
    tIdx = 0, tTot = 1
): number[] | null {
    const sSliceId = sourceNode.sliceId || '__default_slice__';
    const tSliceId = targetNode.sliceId || '__default_slice__';

    if (sSliceId === tSliceId) return null;

    const sBounds = sliceBounds.get(sSliceId);
    const tBounds = sliceBounds.get(tSliceId);
    if (!sBounds || !tBounds) return null;

    const isBackward = sBounds.minX > tBounds.maxX;
    const isForward = tBounds.minX > sBounds.maxX;

    let startX: number, endX: number;
    if (isBackward) {
        startX = safeNum(sourceNode.x);
        endX = safeNum(targetNode.x) + NODE_WIDTH;
    } else {
        startX = safeNum(sourceNode.x) + NODE_WIDTH;
        endX = safeNum(targetNode.x);
    }

    // Spread along the Y-axis (height of the node)
    const sH = sourceNode.computedHeight || MIN_NODE_HEIGHT;
    const tH = targetNode.computedHeight || MIN_NODE_HEIGHT;
    const sOffset = (sIdx + 1) * (sH / (sTot + 1)) - (sH / 2);
    const tOffset = (tIdx + 1) * (tH / (tTot + 1)) - (tH / 2);

    const startY = safeNum(sourceNode.y) + sH / 2 + sOffset;
    const endY = safeNum(targetNode.y) + tH / 2 + tOffset;

    let gapCenter: number;
    if (isForward) {
        gapCenter = (sBounds.maxX + tBounds.minX) / 2;
    } else if (isBackward) {
        gapCenter = (tBounds.maxX + sBounds.minX) / 2;
    } else {
        gapCenter = (startX + endX) / 2;
    }

    const GRID = 20;
    const bendX = Math.round(gapCenter / GRID) * GRID;

    // ADD BUNDLE OFFSET: Spreads vertical segments in the gap to prevent overlaps
    const horizontalStep = 8;
    const bundleWidth = (sTot - 1) * horizontalStep;
    const offsetBendX = bendX - (bundleWidth / 2) + (sIdx * horizontalStep);

    return [startX, startY, offsetBendX, startY, offsetBendX, endY, endX, endY];
}

export function calculateDynamicPoints(
    source: Node,
    target: Node,
    sIdx = 0, sTot = 1,
    tIdx = 0, tTot = 1
): number[] {
    const sW = NODE_WIDTH;
    const sH = source.computedHeight || MIN_NODE_HEIGHT;
    const tW = NODE_WIDTH;
    const tH = target.computedHeight || MIN_NODE_HEIGHT;

    const scx = safeNum(source.x) + sW / 2;
    const scy = safeNum(source.y) + sH / 2;
    const tcx = safeNum(target.x) + tW / 2;
    const tcy = safeNum(target.y) + tH / 2;

    const dx = tcx - scx;
    const dy = tcy - scy;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    if (isHorizontal) {
        const isRight = dx > 0;
        const sideSizeS = sH;
        const sideSizeT = tH;
        const sOffset = (sIdx + 1) * (sideSizeS / (sTot + 1)) - (sideSizeS / 2);
        const tOffset = (tIdx + 1) * (sideSizeT / (tTot + 1)) - (sideSizeT / 2);

        const startX = safeNum(source.x) + (isRight ? sW : 0);
        const startY = scy + sOffset;
        const endX = safeNum(target.x) + (isRight ? 0 : tW);
        const endY = tcy + tOffset;

        const midX = (startX + endX) / 2;

        // Snapping: If almost straight, make it perfectly straight
        if (Math.abs(startY - endY) < 5) return [startX, startY, endX, startY];

        return [startX, startY, midX, startY, midX, endY, endX, endY];
    } else {
        const isDown = dy > 0;
        const sideSizeS = sW;
        const sideSizeT = tW;
        const sOffset = (sIdx + 1) * (sideSizeS / (sTot + 1)) - (sideSizeS / 2);
        const tOffset = (tIdx + 1) * (sideSizeT / (tTot + 1)) - (sideSizeT / 2);

        const startX = scx + sOffset;
        const startY = safeNum(source.y) + (isDown ? sH : 0);
        const endX = tcx + tOffset;
        const endY = safeNum(target.y) + (isDown ? 0 : tH);

        const midY = (startY + endY) / 2;

        // Snapping: If almost straight, make it perfectly straight
        if (Math.abs(startX - endX) < 5) return [startX, startY, startX, endY];

        return [startX, startY, startX, midY, endX, midY, endX, endY];
    }
}

export function resolveLinkPoints(
    sourceNode: Node,
    targetNode: Node,
    sliceBounds: Map<string, { minX: number; maxX: number; minY: number; maxY: number }>,
    cachedRoute?: number[],
    sIdx = 0, sTot = 1,
    tIdx = 0, tTot = 1
): number[] {
    const isPinned = !!sourceNode.pinned || !!targetNode.pinned;
    if (cachedRoute && !isPinned) {
        return cachedRoute;
    }

    const smartPoints = calculateSmartPoints(sourceNode, targetNode, sliceBounds, sIdx, sTot, tIdx, tTot);
    if (smartPoints) return smartPoints;

    return calculateDynamicPoints(sourceNode, targetNode, sIdx, sTot, tIdx, tTot);
}

