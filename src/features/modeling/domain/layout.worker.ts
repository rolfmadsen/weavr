import ELK from 'elkjs/lib/elk.bundled.js';
// @ts-ignore - Vite worker import
import ElkWorker from 'elkjs/lib/elk-worker.js?worker';
import type { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs';
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
}

// Hierarchical ranks for vertical flow (Partitions within a Slice)
const TYPE_RANKING: Record<string, number> = {
    'SCREEN': 0,
    'AUTOMATION': 1,
    'COMMAND': 2,
    'READ_MODEL': 3,
    'DOMAIN_EVENT': 4,
    'INTEGRATION_EVENT': 5
};

const elk = new ELK({
    workerFactory: () => new ElkWorker()
});

self.onmessage = async (e: MessageEvent) => {
    // console.log("[ELK Worker] Message Received", e.data);
    console.log("[ELK Worker v6] STRICT HORIZONTAL PARTITIONS active");

    const { requestId, nodes, links, slices, globalOptions = {} } = e.data as {
        requestId: number,
        nodes: WorkerNode[],
        links: WorkerLink[],
        slices: WorkerSlice[],
        globalOptions?: Record<string, string | number | boolean>
    };

    try {
        const nodeMap = new Map<string, WorkerNode>();
        nodes.forEach(n => nodeMap.set(n.id, n));
        const validNodeIds = new Set(nodes.map(n => n.id));
        const nodeSliceMap = new Map<string, string>();

        // Map nodes to slices
        nodes.forEach(node => {
            if (node.sliceId && slices.some(s => s.id === node.sliceId)) {
                nodeSliceMap.set(node.id, node.sliceId);
            }
        });

        const DEFAULT_SLICE_ID = '__default_slice__';
        nodes.forEach(node => {
            if (!nodeSliceMap.has(node.id)) {
                nodeSliceMap.set(node.id, DEFAULT_SLICE_ID);
            }
        });

        const sanitizeOptions = (options?: Record<string, string | number | boolean>): LayoutOptions => {
            return Object.fromEntries(
                Object.entries(options || {}).map(([k, v]) => [k, String(v)])
            ) as LayoutOptions;
        };

        const createElkNode = (node: WorkerNode): ElkNode => {
            const height = node.computedHeight || node.height || MIN_NODE_HEIGHT;
            const width = node.width || NODE_WIDTH;
            const typeKey = (node.type || '').toUpperCase().trim().replace(/ /g, '_');
            const partition = TYPE_RANKING[typeKey] ?? 99;

            return {
                id: node.id,
                width: width,
                height: height,
                layoutOptions: {
                    'org.eclipse.elk.partitioning.partition': String(partition),
                    'org.eclipse.elk.portConstraints': 'UNDEFINED',
                    ...(node.pinned ? { 'org.eclipse.elk.noLayout': 'true' } : {}),
                    ...sanitizeOptions(node.layoutOptions)
                },
                x: node.x,
                y: node.y
            };
        };

        const sliceNodesMap = new Map<string, ElkNode[]>();
        nodes.forEach(node => {
            const sliceId = nodeSliceMap.get(node.id)!;
            if (!sliceNodesMap.has(sliceId)) sliceNodesMap.set(sliceId, []);
            sliceNodesMap.get(sliceId)!.push(createElkNode(node));
        });

        // ---------------------------------------------------------------------
        // 1. Slice Layout Configuration (Vertical Flow inside Slices)
        // ---------------------------------------------------------------------
        const sliceLayoutOptions: LayoutOptions = sanitizeOptions({
            'org.eclipse.elk.nodeLabels.placement': 'INSIDE V_CENTER H_RIGHT',
            'org.eclipse.elk.algorithm': 'layered',
            'org.eclipse.elk.direction': 'DOWN',
            'org.eclipse.elk.partitioning.activate': 'true', // Ordering of nodes in partitions (e.g. SCREEN, AUTOMATION, COMMAND, etc. in Slices)

            'org.eclipse.elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
            'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
            'org.eclipse.elk.layered.edgeRouting': 'ORTHOGONAL',//TEST//
            'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            'org.eclipse.elk.layered.unnecessaryBendpoints': 'true',
            'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': '20',
            'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'org.eclipse.elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS',
            'org.eclipse.elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
            'org.eclipse.elk.insideSelfLoops.activate': 'true',
            'org.eclipse.elk.separateConnectedComponents': 'false',
            'org.eclipse.elk.spacing.componentComponent': '40',
            'org.eclipse.elk.spacing.nodeNode': '40',
            'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '40',
            'org.eclipse.elk.layered.nodePlacement.favorStraightEdges': 'true',
            //'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            //TEST//'org.eclipse.elk.layered.considerModelOrder.crossingCounterNodeInfluence': '0.001',
            'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'org.eclipse.elk.spacing.edgeLabel': '0',
            'org.eclipse.elk.spacing.edgeNode': '20',
            'org.eclipse.elk.layered.edgeLabels.sideSelection': 'ALWAYS_UP',
            'org.eclipse.elk.spacing.portPort': '10',
            'org.eclipse.elk.padding': '[top=20,left=20,bottom=20,right=20]',
        });

        const rootChildren: ElkNode[] = [];
        const rootEdges: ElkExtendedEdge[] = [];

        // Pre-calculate inter-slice edges for rank calculation
        const allSliceIds = [...slices.map(s => s.id), DEFAULT_SLICE_ID];
        const interSliceLinksForRoot: { source: string, target: string, id: string }[] = [];
        const sliceIncoming = new Map<string, Set<string>>();

        links.forEach(link => {
            const sourceSliceId = nodeSliceMap.get(link.source);
            const targetSliceId = nodeSliceMap.get(link.target);

            if (sourceSliceId && targetSliceId && sourceSliceId !== targetSliceId) {
                interSliceLinksForRoot.push({ source: sourceSliceId, target: targetSliceId, id: link.id });
                if (!sliceIncoming.has(targetSliceId)) sliceIncoming.set(targetSliceId, new Set());
                sliceIncoming.get(targetSliceId)!.add(sourceSliceId);
            }
        });

        // 2. Calculate Slice Ranks (to allow vertical stacking/centering)
        const sliceRanks = new Map<string, number>();
        let lastAutoRank = -1;

        allSliceIds.forEach((sliceId, index) => {
            const sources = sliceIncoming.get(sliceId);

            // We only care about FORWARD dependencies for ranking
            let maxSourceRank = -1;
            if (sources) {
                sources.forEach(srcId => {
                    const srcIdx = allSliceIds.indexOf(srcId);
                    if (srcIdx < index) { // Only forward links influence rank
                        const srcRank = sliceRanks.get(srcId);
                        if (srcRank !== undefined) {
                            maxSourceRank = Math.max(maxSourceRank, srcRank);
                        }
                    }
                });
            }

            let rank: number;
            if (maxSourceRank !== -1) {
                // Hierarchical rank based on dependencies
                rank = maxSourceRank + 1;
            } else {
                // Sequential rank based on model order
                rank = lastAutoRank + 1;
            }

            sliceRanks.set(sliceId, rank);
            lastAutoRank = rank;
        });

        // Build containers (Slices)
        allSliceIds.forEach((sliceId) => {
            const children = sliceNodesMap.get(sliceId) || [];
            if (children.length === 0) return;

            const sliceOrder = sliceRanks.get(sliceId) ?? 0;

            rootChildren.push({
                id: sliceId,
                children: children,
                layoutOptions: {
                    ...sliceLayoutOptions,
                    'org.eclipse.elk.partitioning.partition': String(sliceOrder),
                },
                edges: []
            });
        });

        // Process Edges
        links.forEach(link => {
            if (!validNodeIds.has(link.source) || !validNodeIds.has(link.target)) return;

            const sourceNode = nodeMap.get(link.source);
            const targetNode = nodeMap.get(link.target);
            const sourceTypeKey = (sourceNode?.type || '').toUpperCase().trim().replace(/ /g, '_');
            const targetTypeKey = (targetNode?.type || '').toUpperCase().trim().replace(/ /g, '_');
            const sourceRank = TYPE_RANKING[sourceTypeKey] ?? 99;
            const targetRank = TYPE_RANKING[targetTypeKey] ?? 99;

            const sourceSliceId = nodeSliceMap.get(link.source);
            const targetSliceId = nodeSliceMap.get(link.target);

            const elkEdge: ElkExtendedEdge = {
                id: link.id,
                sources: [link.source],
                targets: [link.target],
                layoutOptions: {}
            };

            // Detect Feedback Edges (Upwards in hierarchy or Backwards in slices)
            const sourceSliceIndex = allSliceIds.indexOf(sourceSliceId!);
            const targetSliceIndex = allSliceIds.indexOf(targetSliceId!);

            if (sourceRank > targetRank || sourceSliceIndex > targetSliceIndex) {
                elkEdge.layoutOptions!['org.eclipse.elk.layered.feedbackEdges'] = 'true';
            }

            if (sourceSliceId === targetSliceId) {
                // Intra-slice edge
                const slice = rootChildren.find(c => c.id === sourceSliceId);
                if (slice && slice.edges) {
                    slice.edges.push(elkEdge);
                }
            } else if (sourceSliceId && targetSliceId) {
                // Inter-slice edge -> Add as an edge between slices to the root graph
                // This informs ELK about the interdependence of slices for centering
                const existing = rootEdges.find(e => e.sources![0] === sourceSliceId && e.targets![0] === targetSliceId);
                if (!existing) {
                    rootEdges.push({
                        id: `root-edge-${sourceSliceId}-${targetSliceId}`,
                        sources: [sourceSliceId],
                        targets: [targetSliceId],
                        layoutOptions: {
                            ...(sourceSliceIndex > targetSliceIndex ? { 'org.eclipse.elk.layered.feedbackEdges': 'true' } : {})
                        }
                    });
                }
            }
        });

        // ---------------------------------------------------------------------
        // 3. Root Graph Configuration (Horizontal Flow of Slices)
        // ---------------------------------------------------------------------
        const rootGraph: ElkNode = {
            id: 'root',
            layoutOptions: sanitizeOptions({
                'org.eclipse.elk.algorithm': 'org.eclipse.elk.layered',
                'org.eclipse.elk.direction': 'RIGHT',
                'elk.direction': 'RIGHT',
                'org.eclipse.elk.hierarchyHandling': 'SEPARATE_CHILDREN',
                'org.eclipse.elk.partitioning.activate': 'true', // EXPLICITLY ACTIVATE PARTITIONING
                'org.eclipse.elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
                'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
                'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '80',
                'org.eclipse.elk.spacing.nodeNode': '75',
                'org.eclipse.elk.insideSelfLoops.activate': 'true',
                'org.eclipse.elk.separateConnectedComponents': 'false',
                'org.eclipse.elk.spacing.edgeLabel': '0',
                'org.eclipse.elk.spacing.edgeNode': '24',
                'org.eclipse.elk.layered.edgeLabels.sideSelection': 'ALWAYS_UP',
                'org.eclipse.elk.spacing.portPort': '5',
                'org.eclipse.elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
                'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
                'org.eclipse.elk.padding': '[top=20,left=20,bottom=20,right=20]',

                ...globalOptions
            }),
            children: rootChildren,
            edges: rootEdges
        };

        const layout = await elk.layout(rootGraph);

        // Process Results
        const positions: Record<string, { x: number, y: number }> = {};
        const edgeRoutes: Record<string, number[]> = {};

        const processNode = (node: ElkNode, parentX = 0, parentY = 0) => {
            const currentX = parentX + (node.x || 0);
            const currentY = parentY + (node.y || 0);

            const GRID = 20;
            const snap = (v: number) => Math.round(v / GRID) * GRID;

            if (validNodeIds.has(node.id)) {
                positions[node.id] = {
                    x: snap(currentX),
                    y: snap(currentY)
                };
            }

            const interSliceEdgeIds = new Set(rootEdges.map(e => e.id));

            if (node.edges) {
                node.edges.forEach(edge => {
                    // SKIP Inter-Slice Edges (Let Frontend handle smart routing)
                    if (interSliceEdgeIds.has(edge.id)) return;

                    if (edge.sections && edge.sections.length > 0) {
                        const points: number[] = [];
                        edge.sections.forEach(section => {
                            points.push(snap(currentX + section.startPoint.x));
                            points.push(snap(currentY + section.startPoint.y));
                            if (section.bendPoints) {
                                section.bendPoints.forEach(bp => {
                                    points.push(snap(currentX + bp.x));
                                    points.push(snap(currentY + bp.y));
                                });
                            }
                            points.push(snap(currentX + section.endPoint.x));
                            points.push(snap(currentY + section.endPoint.y));
                        });
                        edgeRoutes[edge.id] = points;
                    }
                });
            }

            if (node.children) {
                node.children.forEach(child => processNode(child, currentX, currentY));
            }
        };

        if (layout) processNode(layout);
        self.postMessage({ type: 'SUCCESS', positions, edgeRoutes, requestId });

    } catch (error) {
        console.error("[ELK Worker] Fatal Error", error);
        self.postMessage({ type: 'ERROR', message: String(error), requestId });
    }
};