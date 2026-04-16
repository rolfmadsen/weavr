/**
 * Event Model Layout Algorithm — Pure Functions
 * 
 * Contains the deterministic, zero-dependency layout algorithm for Event Modeling.
 * This module is pure (no Web Worker globals) so it can be imported by both
 * the Web Worker and by Vitest unit tests.
 */

import { NODE_WIDTH, MIN_NODE_HEIGHT, GRID_SIZE } from '../../../shared/constants';

// --- Interfaces ---

export interface WorkerNode {
    id: string;
    width: number;
    computedHeight: number;
    type: string;
    sliceId?: string;
    pinned?: boolean;
    x: number;
    y: number;
    actor?: string;
    aggregate?: string;
    service?: string;
}

export interface WorkerLink {
    id: string;
    source: string;
    target: string;
}

export interface WorkerSlice {
    id: string;
    nodeIds: string[];
    order?: number;
    chapter?: string;
}

// --- Layout Constants ---
const GRID = GRID_SIZE;      // 20
const LANE_GAP = GRID * 4;   // 80
const SUB_LANE_GAP = GRID * 2; // 40
const NODE_H_GAP = GRID * 3;  // 60
const SLICE_H_GAP = GRID * 3; // 60
const CHAPTER_H_GAP = GRID * 5; // 100
const SLICE_PADDING = GRID * 2; // 40

const TYPE_RANKING: Record<string, number> = {
    'SCREEN': 0,
    'AUTOMATION': 1,
    'COMMAND': 2,
    'READ_MODEL': 2,       // Same lane as COMMAND
    'DOMAIN_EVENT': 3,
    'INTEGRATION_EVENT': 4,
};

const snap = (v: number): number => Math.round(v / GRID) * GRID;
const snapHeight = (v: number): number => Math.ceil(v / GRID) * GRID;
const snapWidth = (v: number): number => Math.ceil(v / (GRID * 2)) * (GRID * 2); // Force 40px multiples

interface LaneKey {
    rank: number;
    subKey: string;
}

function getLaneKey(node: WorkerNode): LaneKey {
    // Force dimensions to be grid-aligned before any logic uses them
    node.width = snapWidth(node.width || NODE_WIDTH);
    node.computedHeight = snapHeight(node.computedHeight || MIN_NODE_HEIGHT);

    const typeStr = (node.type || '').toUpperCase().trim().replace(/ /g, '_');
    const rank = TYPE_RANKING[typeStr] ?? 99;
    let subKey = '';
    if ((typeStr === 'SCREEN' || typeStr === 'AUTOMATION') && node.actor) subKey = node.actor;
    else if (typeStr === 'DOMAIN_EVENT' && node.aggregate) subKey = node.aggregate;
    return { rank, subKey };
}

function laneKeyStr(key: LaneKey): string {
    return key.subKey ? `${key.rank}:${key.subKey}` : `${key.rank}`;
}

export function computeLayout(
    nodes: WorkerNode[],
    links: WorkerLink[],
    slices: WorkerSlice[]
): {
    positions: Record<string, { x: number; y: number }>;
    edgeRoutes: Record<string, number[]>;
    containerBounds: Record<string, { x: number; y: number; width: number; height: number }>;
} {
    if (nodes.length === 0) return { positions: {}, edgeRoutes: {}, containerBounds: {} };

    const nodeMap = new Map<string, WorkerNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const DEFAULT_SLICE_ID = '__default_slice__';
    const nodeSliceMap = new Map<string, string>();
    const sliceIdSet = new Set(slices.map(s => s.id));
    nodes.forEach(node => {
        if (node.sliceId && sliceIdSet.has(node.sliceId)) nodeSliceMap.set(node.id, node.sliceId);
        else nodeSliceMap.set(node.id, DEFAULT_SLICE_ID);
    });

    // Slice-Healing: Force the entire Command -> Event -> Read Model lineage into a unified vertical spine
    // We do multiple passes to ensure transitive dependencies are caught
    for (let pass = 0; pass < 2; pass++) {
        links.forEach(l => {
            const s = nodeMap.get(l.source);
            const t = nodeMap.get(l.target);
            if (!s || !t) return;
            
            const sSlice = nodeSliceMap.get(s.id);
            if (!sSlice) return;

            // Rule 1: Events follow their triggering Commands
            if (s.type === 'COMMAND' && t.type === 'DOMAIN_EVENT') {
                nodeSliceMap.set(t.id, sSlice);
            }
            // Rule 2: Read Models follow the events that populate them
            if (s.type === 'DOMAIN_EVENT' && t.type === 'READ_MODEL') {
                 nodeSliceMap.set(t.id, sSlice);
            }
        });
    }

    const sliceNodesMap = new Map<string, WorkerNode[]>();
    nodes.forEach(node => {
        const sliceId = nodeSliceMap.get(node.id)!;
        if (!sliceNodesMap.has(sliceId)) sliceNodesMap.set(sliceId, []);
        sliceNodesMap.get(sliceId)!.push(node);
    });

    const slicesByChapter = new Map<string, WorkerSlice[]>();
    const chapterMinOrder = new Map<string, number>();
    const allSliceEntries: WorkerSlice[] = [...slices];
    if (sliceNodesMap.has(DEFAULT_SLICE_ID) && !slices.some(s => s.id === DEFAULT_SLICE_ID)) {
        allSliceEntries.push({ id: DEFAULT_SLICE_ID, nodeIds: [], order: Infinity, chapter: '__unassigned__' });
    }
    allSliceEntries.forEach(s => {
        const chapter = s.chapter || '__default__';
        if (!slicesByChapter.has(chapter)) slicesByChapter.set(chapter, []);
        slicesByChapter.get(chapter)!.push(s);
        const currentMin = chapterMinOrder.get(chapter) ?? Infinity;
        if (s.order !== undefined) chapterMinOrder.set(chapter, Math.min(currentMin, s.order));
    });

    const sortedChapters = Array.from(chapterMinOrder.entries()).sort((a, b) => a[1] - b[1]).map(e => e[0]);
    slicesByChapter.forEach((_, chapter) => { if (!sortedChapters.includes(chapter)) sortedChapters.push(chapter); });
    sortedChapters.forEach(chapter => { slicesByChapter.get(chapter)!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); });

    const orderedSliceIds: string[] = [];
    sortedChapters.forEach(chapter => { slicesByChapter.get(chapter)!.forEach(s => orderedSliceIds.push(s.id)); });

    const processedLinks: WorkerLink[] = [];
    links.forEach(l => {
        if (nodeMap.has(l.source) && nodeMap.has(l.target)) processedLinks.push(l);
    });

    const nodeLaneMap = new Map<string, LaneKey>();
    nodes.forEach(n => nodeLaneMap.set(n.id, getLaneKey(n)));

    const laneKeysMap = new Map<string, LaneKey>();
    nodes.forEach(n => {
        const key = nodeLaneMap.get(n.id)!;
        const ks = laneKeyStr(key);
        if (!laneKeysMap.has(ks)) laneKeysMap.set(ks, key);
    });

    const sortedLaneKeys = Array.from(laneKeysMap.values()).sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.subKey.localeCompare(b.subKey);
    });

    const laneHeights = new Map<string, number>();
    sortedLaneKeys.forEach(key => {
        const ks = laneKeyStr(key);
        let maxHeight = 0;
        nodes.forEach(n => {
            if (laneKeyStr(nodeLaneMap.get(n.id)!) === ks) {
                const h = snapHeight(n.computedHeight || MIN_NODE_HEIGHT);
                if (h > maxHeight) maxHeight = h;
            }
        });
        laneHeights.set(ks, maxHeight || MIN_NODE_HEIGHT);
    });

    const laneInfo = new Map<string, { top: number, bottom: number, index: number }>();
    const gapCenters: number[] = [];
    let currentYVal = SLICE_PADDING;

    for (let i = 0; i < sortedLaneKeys.length; i++) {
        const key = sortedLaneKeys[i];
        const ks = laneKeyStr(key);
        const h = snapHeight(laneHeights.get(ks) || MIN_NODE_HEIGHT);
        
        laneInfo.set(ks, { top: currentYVal, bottom: currentYVal + h, index: i });
        currentYVal = snap(currentYVal + h);
        
        if (i < sortedLaneKeys.length - 1) {
            const nextKey = sortedLaneKeys[i + 1];
            const gapSize = key.rank === nextKey.rank ? SUB_LANE_GAP : LANE_GAP;
            gapCenters.push(snap(currentYVal + gapSize / 2));
            currentYVal = snap(currentYVal + gapSize);
        }
    }
    const totalLaneHeight = snap(currentYVal + SLICE_PADDING);

    const sliceLayouts = new Map<string, { nodePositions: Map<string, { x: number; y: number }>; width: number; height: number }>();
    orderedSliceIds.forEach(sliceId => {
        const sliceNodes = sliceNodesMap.get(sliceId) || [];
        if (sliceNodes.length === 0) {
            sliceLayouts.set(sliceId, { nodePositions: new Map(), width: SLICE_PADDING * 2 + NODE_WIDTH, height: totalLaneHeight });
            return;
        }

        const sliceLinks = processedLinks.filter(l => nodeSliceMap.get(l.source) === sliceId && nodeSliceMap.get(l.target) === sliceId);
        const upstream = new Map<string, string[]>(); const downstream = new Map<string, string[]>();
        sliceNodes.forEach(n => { upstream.set(n.id, []); downstream.set(n.id, []); });

        sliceLinks.forEach(l => {
            const sRank = TYPE_RANKING[(nodeMap.get(l.source)!.type || '').toUpperCase()] ?? 99;
            const tRank = TYPE_RANKING[(nodeMap.get(l.target)!.type || '').toUpperCase()] ?? 99;
            if (sRank < tRank) { downstream.get(l.source)!.push(l.target); upstream.get(l.target)!.push(l.source); }
            else if (sRank > tRank) { upstream.get(l.source)!.push(l.target); downstream.get(l.target)!.push(l.source); }
        });

        const orderedSliceNodes = [...sliceNodes].sort((a, b) => {
            const ksA = laneKeyStr(nodeLaneMap.get(a.id)!); const ksB = laneKeyStr(nodeLaneMap.get(b.id)!);
            const laneA = laneInfo.get(ksA)?.top ?? 0; const laneB = laneInfo.get(ksB)?.top ?? 0;
            if (laneA !== laneB) return laneA - laneB;
            const typeA = (a.type || '').toUpperCase(); const typeB = (b.type || '').toUpperCase();
            if (typeA === 'READ_MODEL' && typeB === 'COMMAND') return -1;
            if (typeA === 'COMMAND' && typeB === 'READ_MODEL') return 1;
            return 0;
        });

        const colAssignments = new Map<string, number>();
        orderedSliceNodes.forEach(n => {
            if (n.pinned) return;
            const laneKs = laneKeyStr(nodeLaneMap.get(n.id)!);
            const invalidCols = new Set<number>();
            orderedSliceNodes.forEach(other => {
                if (other.id !== n.id && laneKeyStr(nodeLaneMap.get(other.id)!) === laneKs) {
                    if (colAssignments.has(other.id)) invalidCols.add(colAssignments.get(other.id)!);
                }
            });
            let preferredCol = 0; const assignedUp = upstream.get(n.id)!.filter(pId => colAssignments.has(pId));
            if (assignedUp.length > 0) preferredCol = colAssignments.get(assignedUp[0])!;
            else {
                const assignedDown = downstream.get(n.id)!.filter(cId => colAssignments.has(cId));
                if (assignedDown.length > 0) preferredCol = colAssignments.get(assignedDown[0])!;
            }
            let col = preferredCol; let offset = 0;
            while (true) {
                if (!invalidCols.has(preferredCol + offset)) { col = preferredCol + offset; break; }
                if (offset > 0 && preferredCol - offset >= 0 && !invalidCols.has(preferredCol - offset)) { col = preferredCol - offset; break; }
                offset++;
            }
            colAssignments.set(n.id, col);
        });

        const maxCol = colAssignments.size > 0 ? Math.max(...Array.from(colAssignments.values())) : 0;
        const sliceWidth = SLICE_PADDING * 2 + (maxCol + 1) * NODE_WIDTH + Math.max(0, maxCol) * NODE_H_GAP;
        const nodePositions = new Map<string, { x: number; y: number }>();
        sliceNodes.forEach(n => {
            if (n.pinned) return;
            const ks = laneKeyStr(nodeLaneMap.get(n.id)!);
            const laneY = laneInfo.get(ks)?.top ?? SLICE_PADDING;
            const laneH = (laneInfo.get(ks)?.bottom ?? 0) - (laneInfo.get(ks)?.top ?? 0);
            const col = colAssignments.get(n.id) || 0;
            const nodeX = snap(SLICE_PADDING + col * (NODE_WIDTH + NODE_H_GAP));
            const nodeH = snapHeight(n.computedHeight || MIN_NODE_HEIGHT);
            const nodeY = snap(laneY + snap((laneH - nodeH) / 2));
            nodePositions.set(n.id, { x: nodeX, y: nodeY });
        });

        const centerNode = (nId: string, relatedIds: string[]) => {
            const node = nodeMap.get(nId);
            if (!node) return;

            // Prioritize Command-Event verticality (the "Write Path")
            const priorityIds = relatedIds.filter(rId => {
                const rNode = nodeMap.get(rId);
                return (node.type === 'DOMAIN_EVENT' && rNode?.type === 'COMMAND') ||
                       (node.type === 'COMMAND' && rNode?.type === 'DOMAIN_EVENT');
            });

            const targetIds = priorityIds.length > 0 ? priorityIds : relatedIds;

            let minX = Infinity; let maxX = -Infinity;
            targetIds.forEach(id => { const x = nodePositions.get(id)?.x; if (x !== undefined) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); } });
            if (minX !== Infinity && maxX !== -Infinity) {
                const desiredX = snap((minX + maxX) / 2);
                const laneKs = laneKeyStr(nodeLaneMap.get(nId)!);
                const isBlocked = sliceNodes.some(other => {
                    if (other.id === nId) return false;
                    if (laneKeyStr(nodeLaneMap.get(other.id)!) !== laneKs) return false;
                    const otherX = nodePositions.get(other.id)?.x;
                    return otherX !== undefined && Math.abs(desiredX - otherX) < (NODE_WIDTH + NODE_H_GAP);
                });
                if (!isBlocked) nodePositions.get(nId)!.x = desiredX;
            }
        };
        for (let i = orderedSliceNodes.length - 1; i >= 0; i--) { 
            const n = orderedSliceNodes[i]; 
            const related = [...upstream.get(n.id)!, ...downstream.get(n.id)!];
            if (related.length > 0) centerNode(n.id, related);
        }
        for (let i = 0; i < orderedSliceNodes.length; i++) { 
            const n = orderedSliceNodes[i]; 
            const related = [...upstream.get(n.id)!, ...downstream.get(n.id)!];
            if (related.length > 0) centerNode(n.id, related);
        }

        sliceLayouts.set(sliceId, { 
            nodePositions, 
            width: snap(sliceWidth), 
            height: snap(currentYVal) 
        });
    });

    const positions: Record<string, { x: number; y: number }> = {};
    const containerBounds: Record<string, { x: number; y: number; width: number; height: number }> = {};
    let globalX = 0; let prevChapter: string | null = null;
    sortedChapters.forEach(chapter => {
        slicesByChapter.get(chapter)!.forEach(slice => {
            const layout = sliceLayouts.get(slice.id); if (!layout) return;
            if (globalX > 0) globalX += prevChapter !== chapter ? CHAPTER_H_GAP : SLICE_H_GAP;
            const sliceX = snap(globalX);
            layout.nodePositions.forEach((pos, nodeId) => { 
                positions[nodeId] = { x: snap(sliceX + pos.x), y: snap(pos.y) }; 
            });
            containerBounds[slice.id] = { x: sliceX, y: snap(0), width: snap(layout.width), height: snap(layout.height) };
            globalX = snap(sliceX + layout.width); 
            prevChapter = chapter;
        });
    });
    nodes.forEach(n => { if (n.pinned) positions[n.id] = { x: snap(n.x), y: snap(n.y) }; });

    const edgeRoutes: Record<string, number[]> = {};
    const getOptimalGapY = (srcIdx: number, tgtIdx: number, srcLaneKs: string) => {
        if (srcIdx < tgtIdx) return snap(gapCenters[srcIdx] ?? (laneInfo.get(srcLaneKs)!.bottom + GRID * 2));
        if (srcIdx > tgtIdx) return snap(gapCenters[srcIdx - 1] ?? (laneInfo.get(srcLaneKs)!.top - GRID * 2));
        return snap(gapCenters[srcIdx] ?? gapCenters[srcIdx - 1] ?? (laneInfo.get(srcLaneKs)!.bottom + GRID * 2));
    };

    processedLinks.forEach(link => {
        const srcPos = positions[link.source]; const tgtPos = positions[link.target];
        const srcNode = nodeMap.get(link.source)!; const tgtNode = nodeMap.get(link.target)!;
        if (!srcPos || !tgtPos) return;

        const srcBounds = { x: srcPos.x, y: srcPos.y, w: srcNode.width || NODE_WIDTH, h: srcNode.computedHeight || MIN_NODE_HEIGHT };
        const tgtBounds = { x: tgtPos.x, y: tgtPos.y, w: tgtNode.width || NODE_WIDTH, h: tgtNode.computedHeight || MIN_NODE_HEIGHT };

        const srcLaneKs = laneKeyStr(nodeLaneMap.get(link.source)!); const tgtLaneKs = laneKeyStr(nodeLaneMap.get(link.target)!);
        const srcIdx = laneInfo.get(srcLaneKs)!.index; const tgtIdx = laneInfo.get(tgtLaneKs)!.index;

        let sx = snap(srcBounds.x + srcBounds.w / 2); let tx = snap(tgtBounds.x + tgtBounds.w / 2);
        let sy: number, ty: number;

        if (srcIdx < tgtIdx) { // DOWNWARD
            sy = snap(srcBounds.y + srcBounds.h); ty = snap(tgtBounds.y);
        } else if (srcIdx > tgtIdx) { // UPWARD
            sy = snap(srcBounds.y); ty = snap(tgtBounds.y + tgtBounds.h);
        } else { // SAME LANE
            sy = snap(srcBounds.y + srcBounds.h); ty = snap(tgtBounds.y + tgtBounds.h);
        }

        if (Math.abs(sx - tx) < 5) { // ALIGNED: Straight vertical line
            edgeRoutes[link.id] = [sx, sy, tx, ty];
        } else { // MANHATTAN: Step-out logic
            const midY = getOptimalGapY(srcIdx, tgtIdx, srcLaneKs);
            edgeRoutes[link.id] = [sx, sy, sx, midY, tx, midY, tx, ty];
        }
    });

    Object.keys(positions).forEach(id => { positions[id].x = snap(positions[id].x); positions[id].y = snap(positions[id].y); });
    Object.keys(containerBounds).forEach(id => {
        containerBounds[id].x = snap(containerBounds[id].x); containerBounds[id].y = snap(containerBounds[id].y);
        containerBounds[id].width = snap(containerBounds[id].width); containerBounds[id].height = snap(containerBounds[id].height);
    });

    return { positions, edgeRoutes, containerBounds };
}