/**
 * Event Model Layout Worker
 * 
 * Thin Web Worker wrapper around the pure layout algorithm.
 * Handles message passing between main thread and the computeLayout function.
 */

import { computeLayout } from './eventModelLayout.algorithm';
import type { WorkerNode, WorkerLink, WorkerSlice } from './eventModelLayout.algorithm';

self.onmessage = (e: MessageEvent) => {
    const { requestId, nodes: rawNodes, links: rawLinks, slices: rawSlices } = e.data;

    try {
        const nodes: WorkerNode[] = (rawNodes || []).filter((n: any) => n && n.id);
        const links: WorkerLink[] = (rawLinks || []).filter((l: any) => l && l.id && l.source && l.target);
        const slices: WorkerSlice[] = (rawSlices || [])
            .filter((s: any) => s && s.id)
            .sort((a: WorkerSlice, b: WorkerSlice) => (a.order || 0) - (b.order || 0));

        const result = computeLayout(nodes, links, slices);

        self.postMessage({
            type: 'SUCCESS',
            positions: result.positions,
            edgeRoutes: result.edgeRoutes,
            containerBounds: result.containerBounds,
            requestId,
        });
    } catch (err) {
        console.error('[EventModelLayoutWorker]', err);
        self.postMessage({
            type: 'ERROR',
            message: String(err),
            requestId,
        });
    }
};
