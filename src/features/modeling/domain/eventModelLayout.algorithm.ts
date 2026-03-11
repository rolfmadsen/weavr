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

const LANE_GAP = 40;         // Vertical gap between different type lanes
const SUB_LANE_GAP = 20;     // Vertical gap between sub-lanes (same type, diff actor/aggregate)
const NODE_H_GAP = 40;       // Horizontal gap between nodes in the same lane
const SLICE_H_GAP = 60;      // Horizontal gap between slices in same chapter
const CHAPTER_H_GAP = 100;   // Horizontal gap between chapters
const SLICE_PADDING = 40;    // Internal padding within a slice container

const GRID = GRID_SIZE;

const TYPE_RANKING: Record<string, number> = {
    'SCREEN': 0,
    'AUTOMATION': 1,
    'COMMAND': 2,
    'READ_MODEL': 2,       // Same lane as COMMAND (shared interaction layer)
    'DOMAIN_EVENT': 3,
    'INTEGRATION_EVENT': 4,
};

// --- Utility ---

const snap = (v: number): number => Math.round(v / GRID) * GRID;
const snapHeight = (v: number): number => Math.ceil(v / GRID) * GRID;

// --- Lane System ---
// Sub-lane rules:
//   SCREEN / AUTOMATION  → sub-lane by actor
//   DOMAIN_EVENT         → sub-lane by aggregate
//   COMMAND / READ_MODEL → shared flat lane (rank 2)
//   INTEGRATION_EVENT    → flat lane (no sub-lanes)

interface LaneKey {
    rank: number;
    subKey: string;     // actor or aggregate name, empty for flat lanes
}

function getLaneKey(node: WorkerNode): LaneKey {
    const typeStr = (node.type || '').toUpperCase().trim().replace(/ /g, '_');
    const rank = TYPE_RANKING[typeStr] ?? 99;

    let subKey = '';
    if ((typeStr === 'SCREEN' || typeStr === 'AUTOMATION') && node.actor) {
        subKey = node.actor;
    } else if (typeStr === 'DOMAIN_EVENT' && node.aggregate) {
        subKey = node.aggregate;
    }

    return { rank, subKey };
}

function laneKeyStr(key: LaneKey): string {
    return key.subKey ? `${key.rank}:${key.subKey}` : `${key.rank}`;
}

// --- Core Algorithm ---

export function computeLayout(
    nodes: WorkerNode[],
    links: WorkerLink[],
    slices: WorkerSlice[]
): {
    positions: Record<string, { x: number; y: number }>;
    edgeRoutes: Record<string, number[]>;
    containerBounds: Record<string, { x: number; y: number; width: number; height: number }>;
} {
    if (nodes.length === 0) {
        return { positions: {}, edgeRoutes: {}, containerBounds: {} };
    }

    // ===== PASS 0: Data Preparation =====

    const nodeMap = new Map<string, WorkerNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const DEFAULT_SLICE_ID = '__default_slice__';
    const nodeSliceMap = new Map<string, string>();
    const sliceIdSet = new Set(slices.map(s => s.id));

    nodes.forEach(node => {
        if (node.sliceId && sliceIdSet.has(node.sliceId)) {
            nodeSliceMap.set(node.id, node.sliceId);
        } else {
            nodeSliceMap.set(node.id, DEFAULT_SLICE_ID);
        }
    });

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

    const sortedChapters = Array.from(chapterMinOrder.entries())
        .sort((a, b) => a[1] - b[1])
        .map(e => e[0]);
    slicesByChapter.forEach((_, chapter) => {
        if (!sortedChapters.includes(chapter)) sortedChapters.push(chapter);
    });
    sortedChapters.forEach(chapter => {
        slicesByChapter.get(chapter)!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    const orderedSliceIds: string[] = [];
    sortedChapters.forEach(chapter => {
        slicesByChapter.get(chapter)!.forEach(s => orderedSliceIds.push(s.id));
    });

    const intraSliceLinks: WorkerLink[] = [];
    const crossSliceLinks: WorkerLink[] = [];
    links.forEach(l => {
        const sSlice = nodeSliceMap.get(l.source);
        const tSlice = nodeSliceMap.get(l.target);
        if (!sSlice || !tSlice) return;
        if (sSlice === tSlice) intraSliceLinks.push(l);
        else crossSliceLinks.push(l);
    });

    // ===== PASS 1: Lane Assignment =====

    const nodeLaneMap = new Map<string, LaneKey>();
    nodes.forEach(n => nodeLaneMap.set(n.id, getLaneKey(n)));

    // Collect unique lane keys
    const laneKeysMap = new Map<string, LaneKey>();
    nodes.forEach(n => {
        const key = nodeLaneMap.get(n.id)!;
        const ks = laneKeyStr(key);
        if (!laneKeysMap.has(ks)) laneKeysMap.set(ks, key);
    });

    // Sort: by rank, then sub-key alphabetically
    const sortedLaneKeys = Array.from(laneKeysMap.values()).sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.subKey.localeCompare(b.subKey);
    });

    // Compute max node height per lane (globally)
    const laneHeights = new Map<string, number>();
    sortedLaneKeys.forEach(key => {
        const ks = laneKeyStr(key);
        let maxHeight = 0;
        nodes.forEach(n => {
            if (laneKeyStr(nodeLaneMap.get(n.id)!) === ks) {
                // Ensure the node height itself snaps up to grid size
                const h = snapHeight(n.computedHeight || MIN_NODE_HEIGHT);
                if (h > maxHeight) maxHeight = h;
            }
        });
        laneHeights.set(ks, maxHeight || MIN_NODE_HEIGHT);
    });

    // Compute global Y position for each lane
    const laneYPositions = new Map<string, number>();
    let currentY = SLICE_PADDING;
    for (let i = 0; i < sortedLaneKeys.length; i++) {
        const key = sortedLaneKeys[i];
        const ks = laneKeyStr(key);
        laneYPositions.set(ks, currentY);

        currentY += laneHeights.get(ks) || MIN_NODE_HEIGHT;

        if (i < sortedLaneKeys.length - 1) {
            const nextKey = sortedLaneKeys[i + 1];
            currentY += key.rank === nextKey.rank ? SUB_LANE_GAP : LANE_GAP;
        }
    }
    const totalLaneHeight = currentY + SLICE_PADDING;

    // ===== PASS 2: Intra-Slice Layout =====

    interface SliceLayout {
        nodePositions: Map<string, { x: number; y: number }>;
        width: number;
        height: number;
    }

    const sliceLayouts = new Map<string, SliceLayout>();

    orderedSliceIds.forEach(sliceId => {
        const sliceNodes = sliceNodesMap.get(sliceId) || [];
        if (sliceNodes.length === 0) {
            // Still create a container with uniform height for empty slices
            sliceLayouts.set(sliceId, {
                nodePositions: new Map(),
                width: SLICE_PADDING * 2 + NODE_WIDTH,
                height: totalLaneHeight,
            });
            return;
        }

        // --- Topological Column Assignment ---
        const intraLinks = intraSliceLinks.filter(l => nodeSliceMap.get(l.source) === sliceId && nodeSliceMap.get(l.target) === sliceId);
        
        const upstream = new Map<string, string[]>();
        const downstream = new Map<string, string[]>();
        sliceNodes.forEach(n => {
            upstream.set(n.id, []);
            downstream.set(n.id, []);
        });

        intraLinks.forEach(l => {
            const sLane = laneYPositions.get(laneKeyStr(nodeLaneMap.get(l.source)!)) || 0;
            const tLane = laneYPositions.get(laneKeyStr(nodeLaneMap.get(l.target)!)) || 0;
            
            if (sLane < tLane) {
                downstream.get(l.source)!.push(l.target);
                upstream.get(l.target)!.push(l.source);
            } else if (sLane > tLane) {
                upstream.get(l.source)!.push(l.target);
                downstream.get(l.target)!.push(l.source);
            }
        });

        const orderedSliceNodes = [...sliceNodes].sort((a, b) => {
            const laneA = laneYPositions.get(laneKeyStr(nodeLaneMap.get(a.id)!)) || 0;
            const laneB = laneYPositions.get(laneKeyStr(nodeLaneMap.get(b.id)!)) || 0;
            return laneA - laneB;
        });

        const colAssignments = new Map<string, number>();

        orderedSliceNodes.forEach(n => {
            if (n.pinned) return;

            const laneKs = laneKeyStr(nodeLaneMap.get(n.id)!);
            const invalidCols = new Set<number>();

            // 1. Same row nodes
            orderedSliceNodes.forEach(other => {
                if (other.id !== n.id && laneKeyStr(nodeLaneMap.get(other.id)!) === laneKs) {
                    if (colAssignments.has(other.id)) {
                        invalidCols.add(colAssignments.get(other.id)!);
                    }
                }
            });

            // 2. Siblings (downstream of my upstream)
            upstream.get(n.id)!.forEach(upId => {
                downstream.get(upId)!.forEach(siblingId => {
                    if (siblingId !== n.id && colAssignments.has(siblingId)) {
                        invalidCols.add(colAssignments.get(siblingId)!);
                    }
                });
            });

            // 3. Co-parents (upstream of my downstream)
            downstream.get(n.id)!.forEach(downId => {
                upstream.get(downId)!.forEach(coParentId => {
                    if (coParentId !== n.id && colAssignments.has(coParentId)) {
                        invalidCols.add(colAssignments.get(coParentId)!);
                    }
                });
            });

            // Find preferred Col
            let preferredCol = 0;
            const assignedUpstream = upstream.get(n.id)!.filter(pId => colAssignments.has(pId));
            if (assignedUpstream.length > 0) {
                // Use the column of the FIRST assigned upstream
                preferredCol = colAssignments.get(assignedUpstream[0])!;
            } else {
                 const assignedDownstream = downstream.get(n.id)!.filter(cId => colAssignments.has(cId));
                 if (assignedDownstream.length > 0) {
                     preferredCol = colAssignments.get(assignedDownstream[0])!;
                 }
            }

            // Assign closest valid col starting from preferredCol
            let col = preferredCol;
            let offset = 0;
            while (true) {
                if (!invalidCols.has(preferredCol + offset)) {
                    col = preferredCol + offset;
                    break;
                }
                if (offset > 0 && preferredCol - offset >= 0 && !invalidCols.has(preferredCol - offset)) {
                    col = preferredCol - offset;
                    break;
                }
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
            const laneY = laneYPositions.get(ks) || SLICE_PADDING;
            const laneHeight = laneHeights.get(ks) || MIN_NODE_HEIGHT;

            const col = colAssignments.get(n.id) || 0;
            const nodeX = snap(SLICE_PADDING + col * (NODE_WIDTH + NODE_H_GAP));
            
            const nodeHeight = snapHeight(n.computedHeight || MIN_NODE_HEIGHT); // Match NodeGroup math
            const nodeY = snap(laneY + (laneHeight - nodeHeight) / 2);
            nodePositions.set(n.id, { x: nodeX, y: nodeY });
        });

        // --- Centering Pass ---
        const centerNode = (nId: string, relatedIds: string[]) => {
            let minX = Infinity;
            let maxX = -Infinity;
            relatedIds.forEach(id => {
                const x = nodePositions.get(id)?.x;
                if (x !== undefined) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                }
            });
            if (minX !== Infinity && maxX !== -Infinity) {
                nodePositions.get(nId)!.x = snap((minX + maxX) / 2);
            }
        };

        // 1. Bottom-up: Center single upstream elements over downstream elements
        for (let i = orderedSliceNodes.length - 1; i >= 0; i--) {
            const n = orderedSliceNodes[i];
            if (n.pinned) continue;
            const upIds = upstream.get(n.id)!;
            const downIds = downstream.get(n.id)!;
            if (upIds.length <= 1 && downIds.length > 1) {
                centerNode(n.id, downIds);
            }
        }

        // 2. Top-down: Center single downstream elements under upstream elements
        for (let i = 0; i < orderedSliceNodes.length; i++) {
            const n = orderedSliceNodes[i];
            if (n.pinned) continue;
            const upIds = upstream.get(n.id)!;
            const downIds = downstream.get(n.id)!;
            if (downIds.length <= 1 && upIds.length > 1) {
                centerNode(n.id, upIds);
            }
        }

        // 3. Straighten 1:1 chains (Bottom-up: Parent tracks Child)
        // If a parent has exactly 1 child, and that child has exactly 1 parent, align parent to child
        for (let i = orderedSliceNodes.length - 1; i >= 0; i--) {
            const n = orderedSliceNodes[i];
            if (n.pinned) continue;
            const downIds = downstream.get(n.id)!;
            if (downIds.length === 1) {
                const childId = downIds[0];
                const childUpIds = upstream.get(childId)!;
                if (childUpIds.length === 1) { // Exclusive 1:1 mapping
                    const ctx = nodePositions.get(childId)?.x;
                    if (ctx !== undefined) {
                        nodePositions.get(n.id)!.x = ctx;
                    }
                }
            }
        }

        // 4. Straighten 1:1 chains (Top-down: Child tracks Parent)
        // If a child has exactly 1 parent, and that parent has exactly 1 child, align child to parent
        for (let i = 0; i < orderedSliceNodes.length; i++) {
            const n = orderedSliceNodes[i];
            if (n.pinned) continue;
            const upIds = upstream.get(n.id)!;
            if (upIds.length === 1) {
                const parentId = upIds[0];
                const parentDownIds = downstream.get(parentId)!;
                if (parentDownIds.length === 1) { // Exclusive 1:1 mapping
                    const ptx = nodePositions.get(parentId)?.x;
                    if (ptx !== undefined) {
                        nodePositions.get(n.id)!.x = ptx;
                    }
                }
            }
        }

        sliceLayouts.set(sliceId, { nodePositions, width: sliceWidth, height: totalLaneHeight });
    });

    // ===== PASS 3: Timeline Composition =====

    const positions: Record<string, { x: number; y: number }> = {};
    const containerBounds: Record<string, { x: number; y: number; width: number; height: number }> = {};
    let globalX = 0;
    let prevChapter: string | null = null;

    sortedChapters.forEach(chapter => {
        slicesByChapter.get(chapter)!.forEach(slice => {
            const layout = sliceLayouts.get(slice.id);
            if (!layout) return;

            if (globalX > 0) {
                globalX += prevChapter !== chapter ? CHAPTER_H_GAP : SLICE_H_GAP;
            }

            const sliceX = snap(globalX);

            layout.nodePositions.forEach((pos, nodeId) => {
                positions[nodeId] = { x: snap(sliceX + pos.x), y: snap(pos.y) };
            });

            containerBounds[slice.id] = {
                x: sliceX, y: snap(0),
                width: snap(layout.width), height: snap(layout.height),
            };

            globalX = sliceX + layout.width;
            prevChapter = chapter;
        });
    });

    // Handle pinned nodes
    nodes.forEach(n => {
        if (n.pinned) {
            positions[n.id] = { x: snap(n.x), y: snap(n.y) };
        }
    });

    // ===== PASS 4: Edge Routing =====

    const edgeRoutes: Record<string, number[]> = {};

    const getNodeBounds = (nodeId: string) => {
        const pos = positions[nodeId];
        const node = nodeMap.get(nodeId);
        if (!pos || !node) return null;
        return { x: pos.x, y: pos.y, w: node.width || NODE_WIDTH, h: node.computedHeight || MIN_NODE_HEIGHT };
    };

    intraSliceLinks.forEach(link => {
        const srcBounds = getNodeBounds(link.source);
        const tgtBounds = getNodeBounds(link.target);
        if (!srcBounds || !tgtBounds) return;

        const srcRank = TYPE_RANKING[(nodeMap.get(link.source)!.type || '').toUpperCase()] ?? 99;
        const tgtRank = TYPE_RANKING[(nodeMap.get(link.target)!.type || '').toUpperCase()] ?? 99;

        let sx: number, sy: number, tx: number, ty: number, midY: number;

        if (srcRank > tgtRank) {
            // UPWARD EDGE: Dodge left
            sx = snap(srcBounds.x); sy = snap(srcBounds.y + srcBounds.h / 2);
            tx = snap(tgtBounds.x); ty = snap(tgtBounds.y + tgtBounds.h / 2);
            const avoidX = snap(Math.min(sx, tx) - 20);
            edgeRoutes[link.id] = [sx, sy, avoidX, sy, avoidX, ty, tx, ty];
            return;
        } else if (srcRank < tgtRank) {
            sx = snap(srcBounds.x + srcBounds.w / 2); sy = snap(srcBounds.y + srcBounds.h);
            tx = snap(tgtBounds.x + tgtBounds.w / 2); ty = snap(tgtBounds.y);
            midY = snap(sy + 20);
        } else {
            sx = snap(srcBounds.x + srcBounds.w); sy = snap(srcBounds.y + srcBounds.h / 2);
            tx = snap(tgtBounds.x);                ty = snap(tgtBounds.y + tgtBounds.h / 2);
            midY = sy;
        }

        if (sx === tx) {
            edgeRoutes[link.id] = [sx, sy, tx, ty];
        } else if (srcRank === tgtRank) {
            const midX = snap(sx + 20); // lateral step 20px from parent
            edgeRoutes[link.id] = [sx, sy, midX, sy, midX, ty, tx, ty];
        } else {
            edgeRoutes[link.id] = [sx, sy, sx, midY, tx, midY, tx, ty];
        }
    });

    crossSliceLinks.forEach(link => {
        const srcBounds = getNodeBounds(link.source);
        const tgtBounds = getNodeBounds(link.target);
        if (!srcBounds || !tgtBounds) return;

        const srcType = (nodeMap.get(link.source)!.type || '').toUpperCase();
        let sx: number, sy: number, tx: number, ty: number;

        if (srcType === 'DOMAIN_EVENT') {
            sx = snap(srcBounds.x + srcBounds.w / 2); sy = snap(srcBounds.y + srcBounds.h);
            tx = snap(tgtBounds.x);                    ty = snap(tgtBounds.y + tgtBounds.h / 2);
            const midY = snap(sy + 20);
            edgeRoutes[link.id] = [sx, sy, sx, midY, tx, midY, tx, ty];
        } else {
            sx = snap(srcBounds.x + srcBounds.w); sy = snap(srcBounds.y + srcBounds.h / 2);
            tx = snap(tgtBounds.x);               ty = snap(tgtBounds.y + tgtBounds.h / 2);
            if (sy === ty) {
                edgeRoutes[link.id] = [sx, sy, tx, ty];
            } else {
                const midX = snap((sx + tx) / 2);
                edgeRoutes[link.id] = [sx, sy, midX, sy, midX, ty, tx, ty];
            }
        }
    });

    // ===== PASS 5: Final Grid Snap =====

    Object.keys(positions).forEach(id => {
        positions[id].x = snap(positions[id].x);
        positions[id].y = snap(positions[id].y);
    });
    Object.keys(containerBounds).forEach(id => {
        containerBounds[id].x = snap(containerBounds[id].x);
        containerBounds[id].y = snap(containerBounds[id].y);
        containerBounds[id].width = snap(containerBounds[id].width);
        containerBounds[id].height = snap(containerBounds[id].height);
    });

    return { positions, edgeRoutes, containerBounds };
}
