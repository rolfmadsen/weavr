import ELK from 'elkjs/lib/elk.bundled.js';
// @ts-ignore - Vite worker import
import ElkWorker from 'elkjs/lib/elk-worker.js?worker';
import type { ElkNode, ElkExtendedEdge, LayoutOptions, ElkPort } from 'elkjs';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../../../shared/constants';

// Interfaces for data received from Main Thread
interface WorkerNode {
    id: string;
    width?: number;
    height?: number;
    computedHeight?: number;
    type?: string;
    sliceId?: string;
    layoutOptions?: Record<string, string | number | boolean>;
    pinned?: boolean;
    x?: number;
    y?: number;
    actor?: string;
    aggregate?: string;
}

interface WorkerLink {
    id: string;
    source: string;
    target: string;
}

interface WorkerSlice {
    id: string;
    nodeIds: string[];
    order?: number; // Explicit order from data model
    chapter?: string;
}

const elk = new ELK({
    workerFactory: () => new ElkWorker()
});

const TYPE_RANKING: Record<string, number> = {
    'SCREEN': 0,
    'AUTOMATION': 1,
    'COMMAND': 2,
    'READ_MODEL': 2,
    'DOMAIN_EVENT': 3,
    'INTEGRATION_EVENT': 4
};

self.onmessage = async (e: MessageEvent) => {
    const { requestId, nodes: rawNodes, links: rawLinks, slices: rawSlices, globalOptions = {} } = e.data;

    const nodes: WorkerNode[] = (rawNodes || []).filter((n: any) => n && n.id);
    const links: WorkerLink[] = (rawLinks || []).filter((l: any) => l && l.id && l.source && l.target);
    const slices: WorkerSlice[] = (rawSlices || []).filter((s: any) => s && s.id).sort((a: WorkerSlice, b: WorkerSlice) => (a.order || 0) - (b.order || 0));

    try {
        if (nodes.length === 0) {
            self.postMessage({ type: 'SUCCESS', positions: {}, edgeRoutes: {}, containerBounds: {}, requestId });
            return;
        }

        const nodeMap = new Map<string, WorkerNode>();
        nodes.forEach(n => nodeMap.set(n.id, n));
        const nodeSliceMap = new Map<string, string>();
        const DEFAULT_SLICE_ID = '__default_slice__';

        nodes.forEach(node => {
            if (node.sliceId && slices.some(s => s.id === node.sliceId)) {
                nodeSliceMap.set(node.id, node.sliceId);
            } else {
                nodeSliceMap.set(node.id, DEFAULT_SLICE_ID);
            }
        });

        // 0.5 Actor Swimlane Partitioning (Screens Only)
        // Group Screens by Slice -> Actor
        const sliceActorMap = new Map<string, Set<string>>(); // SliceID -> Set<ActorID | "null">
        nodes.forEach(n => {
            const type = (n.type || '').toUpperCase();
            if (type === 'SCREEN') {
                const sId = nodeSliceMap.get(n.id) || DEFAULT_SLICE_ID;
                if (!sliceActorMap.has(sId)) sliceActorMap.set(sId, new Set());

                const actorKey = n.actor ? n.actor : "null";
                sliceActorMap.get(sId)!.add(actorKey);
            }
        });

        // Assign Partition Keys
        sliceActorMap.forEach((actors, sliceId) => {
            // Sort: null/undefined first, then alphabetical
            const sortedActors = Array.from(actors).sort((a, b) => {
                if (a === "null") return -1;
                if (b === "null") return 1;
                return a.localeCompare(b);
            });

            // Map Actor -> Index
            const actorIndex = new Map<string, number>();
            sortedActors.forEach((a, i) => actorIndex.set(a, i));

            // Assign to Nodes
            nodes.forEach(n => {
                if (nodeSliceMap.get(n.id) === sliceId && (n.type || '').toUpperCase() === 'SCREEN') {
                    // const actorKey = n.actor ? n.actor : "null";
                    // const rank = actorIndex.get(actorKey) || 0; // Unused for now key-based approach

                    // Inject into Layout Options (will be picked up by Pass 0)
                    if (!n.layoutOptions) n.layoutOptions = {};
                    // We prefix with 'actor-' to avoid collision, but Pass 0 uses full string.
                    // Actually, Pass 0 normalizes ALL keys globally. 
                    // To ensure local slice consistency, we can just use the rank directly?
                    // No, existing logic uses global unique keys.
                    // Let's use `actor-${rank}` as the key.
                    // Wait, existing logic: 
                    /*
                    nodes.forEach(n => {
                        const k = n.layoutOptions?.['partitionKey'];
                        if (k) uniquePartitionKeys.add(String(k));
                    });
                    */
                    // So if we set n.layoutOptions.partitionKey = `actor-${rank}`, 
                    // then Pass 0 will sort `actor-0`, `actor-1` globally and assign indices.
                    // This works perfectly for "Same Actor Lane" across slices if we use Actor Name.
                    // But user request implies "Different Actor values should be in different lanes".
                    // If we use Actor ID/Name as key, then same actor in different slices share lane index.
                    // If we want PER SLICE logic, we might need per-slice keys?
                    // "SCREEN elements with no Actor value should be in the same lane."
                    // This implies a consistent "No Actor Lane" (Top).

                    // Strategy: Use Actor Name/ID as the Partition Key directly.
                    // "null" -> "000_default" (to sort first)
                    // ActorA -> "ActorA"

                    const pKey = n.actor ? `actor_${n.actor}` : `000_default`;
                    n.layoutOptions['partitionKey'] = pKey;
                }
            });
        });

        // 0.6 Aggregate Lane Partitioning (Domain Events)
        nodes.forEach(n => {
            const type = (n.type || '').toUpperCase();
            if (type === 'DOMAIN_EVENT') {
                // Use Aggregate Name/ID as Partition Key
                // "null" -> "000_default_agg" (to sort first)
                const aggKey = n.aggregate ? `agg_${n.aggregate}` : `000_default_agg`;

                if (!n.layoutOptions) n.layoutOptions = {};
                n.layoutOptions['partitionKey'] = aggKey;
            }
        });

        const sanitizeOptions = (options?: Record<string, string | number | boolean>): LayoutOptions => {
            const result: Record<string, string> = {};
            if (!options) return result as LayoutOptions;
            Object.entries(options).forEach(([k, v]) => {
                if (v !== undefined && v !== null) result[k] = String(v);
            });
            return result as LayoutOptions;
        };

        // 0. Pre-calculate Global Partition Ranks (Alphabetical)
        const uniquePartitionKeys = new Set<string>();
        nodes.forEach(n => {
            const k = n.layoutOptions?.['partitionKey'];
            // Normalize: ignore empty strings so they fall to default 0
            if (k) uniquePartitionKeys.add(String(k));
        });
        const sortedPartitionKeys = Array.from(uniquePartitionKeys).sort();
        const partitionKeyMap = new Map<string, number>();
        sortedPartitionKeys.forEach((k, i) => partitionKeyMap.set(k, i + 1)); // Start at 1, 0 is default/empty

        // Helper: Create ELK Node
        const createElkNode = (node: WorkerNode): ElkNode => {
            const height = node.computedHeight || node.height || MIN_NODE_HEIGHT;
            const width = node.width || NODE_WIDTH;
            const typeKey = (node.type || '').toUpperCase().trim().replace(/ /g, '_');
            let basePartition = TYPE_RANKING[typeKey] ?? 99;

            // Dynamic Sub-Partitioning (Alphabetical)
            let subPartition = 0;
            const pKey = node.layoutOptions?.['partitionKey'];
            if (pKey) {
                subPartition = partitionKeyMap.get(String(pKey)) || 0;
            }

            // Using 100 as multiplier to allow up to 99 unique actors/aggregates without overlap
            const finalPartition = (basePartition * 100) + subPartition;

            return {
                id: node.id,
                width, height,
                layoutOptions: {
                    'org.eclipse.elk.partitioning.partition': String(finalPartition),
                    ...(node.pinned ? { 'org.eclipse.elk.noLayout': 'true' } : {}),
                    ...sanitizeOptions(node.layoutOptions)
                }
            };
        };

        // --- PASS 1: Layout Each Slice Independently (Vertical) ---
        const sliceInputs = new Map<string, ElkNode>();
        const sliceNodesList = new Map<string, WorkerNode[]>();

        nodes.forEach(node => {
            const sliceId = nodeSliceMap.get(node.id)!;
            if (!sliceNodesList.has(sliceId)) sliceNodesList.set(sliceId, []);
            sliceNodesList.get(sliceId)!.push(node);
        });

        const allSliceIds = Array.from(new Set([...slices.map(s => s.id), DEFAULT_SLICE_ID]));

        for (const sliceId of allSliceIds) {
            const sliceNodes = sliceNodesList.get(sliceId) || [];
            if (sliceNodes.length === 0) continue;

            const localEdges: ElkExtendedEdge[] = [];
            links.forEach(l => {
                if (nodeSliceMap.get(l.source) === sliceId && nodeSliceMap.get(l.target) === sliceId) {
                    localEdges.push({ id: l.id, sources: [l.source], targets: [l.target] });
                }
            });

            const elkSliceGraph: ElkNode = {
                id: sliceId,
                layoutOptions: sanitizeOptions({
                    'org.eclipse.elk.algorithm': 'layered',
                    'org.eclipse.elk.direction': 'DOWN',
                    'org.eclipse.elk.partitioning.activate': 'true',
                    'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
                    'org.eclipse.elk.spacing.edgeNode': '40',
                    'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '40', // Vertical node distance
                    'org.eclipse.elk.spacing.nodeNode': '80', // Horizontal node distance
                    'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
                    'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
                    'org.eclipse.elk.padding': '[top=40,left=40,bottom=40,right=40]',
                }),
                children: sliceNodes.map(createElkNode),
                edges: localEdges
            };
            sliceInputs.set(sliceId, elkSliceGraph);
        }

        const sliceResults = new Map<string, ElkNode>();
        await Promise.all(Array.from(sliceInputs.entries()).map(async ([id, input]) => {
            const res = await elk.layout(input);
            sliceResults.set(id, res);
        }));

        // --- PASS 2: Global Layout (Horizontal) ---

        // Prepare Connection Map
        const sliceChapterMap = new Map<string, string>();
        slices.forEach(s => sliceChapterMap.set(s.id, s.chapter || 'General'));
        if (!sliceChapterMap.has(DEFAULT_SLICE_ID)) sliceChapterMap.set(DEFAULT_SLICE_ID, 'General');

        const crossSliceLinks = links.filter(l => {
            const sId = nodeSliceMap.get(l.source);
            const tId = nodeSliceMap.get(l.target);
            return sId && tId && sId !== tId;
        });

        // Determine Siblings (Share same Target)
        // Map<SliceID, Set<TargetSliceID>>
        const sliceTargets = new Map<string, Set<string>>();
        crossSliceLinks.forEach(l => {
            const sId = nodeSliceMap.get(l.source)!;
            const tId = nodeSliceMap.get(l.target)!;
            if (!sliceTargets.has(sId)) sliceTargets.set(sId, new Set());
            sliceTargets.get(sId)!.add(tId);
        });

        const areSiblings = (s1: string, s2: string): boolean => {
            const t1 = sliceTargets.get(s1);
            const t2 = sliceTargets.get(s2);
            if (!t1 || !t2) return false;
            // Check intersection
            for (const target of t1) {
                if (t2.has(target)) return true;
            }
            return false;
        };

        const rootChildren: ElkNode[] = [];
        const rootEdges: ElkExtendedEdge[] = [];

        const slicesByChapter = new Map<string, string[]>();
        const chapterMinOrder = new Map<string, number>();

        sliceResults.forEach((_, id) => {
            const chapter = sliceChapterMap.get(id) || 'General';
            if (!slicesByChapter.has(chapter)) slicesByChapter.set(chapter, []);
            slicesByChapter.get(chapter)!.push(id);

            const s = slices.find(sl => sl.id === id);
            const currentMin = chapterMinOrder.get(chapter) ?? Infinity;
            if (s && s.order !== undefined) chapterMinOrder.set(chapter, Math.min(currentMin, s.order));
        });

        const sortedChapters = Array.from(chapterMinOrder.entries()).sort((a, b) => a[1] - b[1]).map(e => e[0]);
        Array.from(slicesByChapter.keys()).forEach(c => { if (!sortedChapters.includes(c)) sortedChapters.push(c); });

        const nodeRelativePos = new Map<string, { x: number, y: number }>();

        sortedChapters.forEach((chapterName, cIdx) => {
            // Sort slices within chapter based on order (Standard Timeline Order)
            let chapterSlices = slicesByChapter.get(chapterName)!;
            chapterSlices.sort((a, b) => {
                const dA = slices.find(s => s.id === a)?.order || 0;
                const dB = slices.find(s => s.id === b)?.order || 0;
                return dA - dB;
            });

            const elkChapter: ElkNode = {
                id: `chapter-${cIdx}`,
                layoutOptions: {
                    'org.eclipse.elk.algorithm': 'layered',
                    'org.eclipse.elk.direction': 'RIGHT', // Timeline
                    'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
                    'org.eclipse.elk.spacing.edgeNode': '60',
                    'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '40', // Horizontal spacing
                    'org.eclipse.elk.spacing.nodeNode': '40', // Vertical spacing

                    'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
                    'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
                    'org.eclipse.elk.padding': '[top=40,left=40,bottom=40,right=60]',
                    // NO PARTITIONING ACTIVATE! We want flow.
                    'org.eclipse.elk.layered.priority.activate': 'true',
                },
                children: [],
                edges: []
            };

            // Build Nodes (Slices)
            chapterSlices.forEach(sliceId => {
                const sliceRes = sliceResults.get(sliceId)!;
                const s = slices.find(sl => sl.id === sliceId);

                sliceRes.children?.forEach(child => {
                    nodeRelativePos.set(child.id, { x: child.x || 0, y: child.y || 0 });
                });

                const ports: ElkPort[] = [];
                const incoming = crossSliceLinks.filter(l => nodeSliceMap.get(l.target) === sliceId);
                incoming.forEach(l => {
                    const relative = nodeRelativePos.get(l.target);
                    if (relative) {
                        ports.push({
                            id: `port-in-${l.id}`,
                            width: 0, height: 0,
                            x: 0,
                            y: relative.y + (sliceRes.children?.find(n => n.id === l.target)?.height || MIN_NODE_HEIGHT) / 2,
                            layoutOptions: { 'org.eclipse.elk.port.side': 'WEST' }
                        });
                    }
                });
                const outgoing = crossSliceLinks.filter(l => nodeSliceMap.get(l.source) === sliceId);
                outgoing.forEach(l => {
                    const srcNode = nodeMap.get(l.source);
                    const relative = nodeRelativePos.get(l.source);
                    if (relative && srcNode) {
                        const isDomainEvent = (srcNode.type || '').toUpperCase() === 'DOMAIN_EVENT';
                        ports.push({
                            id: `port-out-${l.id}`,
                            width: 0, height: 0,
                            x: isDomainEvent ? relative.x + (srcNode.width || NODE_WIDTH) / 2 : (sliceRes.width || 150),
                            y: isDomainEvent ? (sliceRes.height || 150) : relative.y + (sliceRes.children?.find(n => n.id === l.source)?.height || MIN_NODE_HEIGHT) / 2,
                            layoutOptions: { 'org.eclipse.elk.port.side': isDomainEvent ? 'SOUTH' : 'EAST' }
                        });
                    }
                });

                elkChapter.children!.push({
                    id: sliceId,
                    width: sliceRes.width || 150,
                    height: sliceRes.height || 150,
                    ports: ports,
                    layoutOptions: {
                        'org.eclipse.elk.priority': String(s?.order || 0),
                    }
                });
            });

            // Structural Timeline Chaining (The Backbone)
            // Iterate sorted slices. chain i -> i+1 UNLESS:
            // 1. They are siblings.
            // 2. There is already a functional edge between them.
            for (let i = 0; i < chapterSlices.length - 1; i++) {
                const curr = chapterSlices[i];
                const next = chapterSlices[i + 1];

                const hasFunctionalEdge = crossSliceLinks.some(l =>
                    nodeSliceMap.get(l.source) === curr && nodeSliceMap.get(l.target) === next
                );

                // Chain UNLESS they share a target OR are already connected
                if (!areSiblings(curr, next) && !hasFunctionalEdge) {
                    // Add structural edge
                    elkChapter.edges!.push({
                        id: `chain-${curr}-${next}`,
                        sources: [curr],
                        targets: [next],
                        // Make it short but structural
                        layoutOptions: { 'org.eclipse.elk.layered.priority': '10' }
                    });
                }
            }

            rootChildren.push(elkChapter);
        });

        // --- PASS 3: Chain Chapters Horizontally ---
        for (let i = 0; i < sortedChapters.length - 1; i++) {
            rootEdges.push({
                id: `chapter-chain-${i}-${i + 1}`,
                sources: [`chapter-${i}`],
                targets: [`chapter-${i + 1}`],
                layoutOptions: { 'org.eclipse.elk.layered.priority': '10' }
            });
        }

        // Add Edges to Root connecting Ports
        crossSliceLinks.forEach(l => {
            rootEdges.push({
                id: l.id,
                sources: [`port-out-${l.id}`],
                targets: [`port-in-${l.id}`],
                layoutOptions: {}
            });
        });

        const rootGraph: ElkNode = {
            id: 'root',
            layoutOptions: sanitizeOptions({
                'org.eclipse.elk.algorithm': 'layered',
                'org.eclipse.elk.direction': 'RIGHT',
                'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
                'org.eclipse.elk.spacing.edgeNode': '40',
                'org.eclipse.elk.spacing.nodeNode': '40',
                'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
                'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
                'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
                ...globalOptions
            }),
            children: rootChildren,
            edges: rootEdges
        };

        const finalLayout = await elk.layout(rootGraph);

        // --- Post Processing --- 
        const positions: Record<string, { x: number, y: number }> = {};
        const edgeRoutes: Record<string, number[]> = {};
        const containerBounds: Record<string, { x: number, y: number, width: number, height: number }> = {};
        const GRID = 20;
        const snap = (v: number) => Math.round(v / GRID) * GRID;

        const processFinalNode = (node: ElkNode, pX: number, pY: number) => {
            const cX = pX + (node.x || 0);
            const cY = pY + (node.y || 0);

            if (allSliceIds.includes(node.id)) {
                containerBounds[node.id] = { x: snap(cX), y: snap(cY), width: snap(node.width || 0), height: snap(node.height || 0) };
                const sliceRes = sliceResults.get(node.id);
                if (sliceRes && sliceRes.children) {
                    sliceRes.children.forEach(inner => {
                        positions[inner.id] = { x: snap(cX + (inner.x || 0)), y: snap(cY + (inner.y || 0)) };
                    });
                    if (sliceRes.edges) {
                        sliceRes.edges.forEach(e => {
                            if (e.sections) {
                                const pts: number[] = [];
                                e.sections.forEach(s => {
                                    pts.push(snap(cX + s.startPoint.x));
                                    pts.push(snap(cY + s.startPoint.y));
                                    s.bendPoints?.forEach(b => { pts.push(snap(cX + b.x)); pts.push(snap(cY + b.y)); });
                                    pts.push(snap(cX + s.endPoint.x));
                                    pts.push(snap(cY + s.endPoint.y));
                                });
                                edgeRoutes[e.id] = pts;
                            }
                        });
                    }
                }
            }

            if (node.edges) {
                node.edges.forEach(e => {
                    // Filter out structural chains! They start with 'chain-'
                    if (e.id.startsWith('chain-')) return;

                    if (e.sections) {
                        const pts: number[] = [];
                        e.sections.forEach(s => {
                            pts.push(snap(cX + s.startPoint.x));
                            pts.push(snap(cY + s.startPoint.y));
                            s.bendPoints?.forEach(b => { pts.push(snap(cX + b.x)); pts.push(snap(cY + b.y)); });
                            pts.push(snap(cX + s.endPoint.x));
                            pts.push(snap(cY + s.endPoint.y));
                        });
                        edgeRoutes[e.id] = pts;
                    }
                });
            }

            if (node.children) {
                node.children.forEach(c => processFinalNode(c, cX, cY));
            }
        };

        if (finalLayout) processFinalNode(finalLayout, 0, 0);
        self.postMessage({ type: 'SUCCESS', positions, edgeRoutes, containerBounds, requestId });

    } catch (e) {
        console.error(e);
        self.postMessage({ type: 'ERROR', message: String(e), requestId });
    }
};