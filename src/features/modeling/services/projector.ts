import { bus } from '../../../shared/events/eventBus';
import { useModelingData } from '../store/modelingStore';
import { eventLog } from '../../../shared/store/eventLog';
import { initWorkspaceProjector } from '../../workspace/services/projector';

export const initProjector = () => {
    // We get the store actions *outside* React components via the vanilla API
    // Initialize feature-specific projectors
    initWorkspaceProjector();
    // const store = useModelingData.getState();

    // ------------------------------------------------------------------
    // NODE PROJECTIONS
    // ------------------------------------------------------------------

    bus.on('node:created', (node) => {
        // 1. Update In-Memory Store (Fast for UI)
        useModelingData.getState().addNode(node);

        // 2. Persist to Log
        eventLog.append('current-model', { type: 'node:created', payload: node }); // Todo: get actual model ID
    });

    bus.on('node:moved', (payload) => {
        useModelingData.getState().updateNode(payload.id, { x: payload.x, y: payload.y, pinned: payload.pinned });
        eventLog.append('current-model', { type: 'node:moved', payload });
    });

    bus.on('nodes:moved', (event) => {
        const state = useModelingData.getState();
        // Since store doesn't support batch update natively, loops are fine here (Zustand updates are synchronous)
        // Or we could add `updateNodes` to store but that requires more refactoring.
        // For performance, loop is OK if not triggering re-renders too heavily (Zustand with selectors handles this well).
        event.updates.forEach(u => {
            state.updateNode(u.id, { x: u.x, y: u.y, pinned: event.pinned ?? undefined });
        });
        eventLog.append('current-model', { type: 'nodes:moved', payload: event });
    });

    bus.on('node:updated', (payload) => {
        useModelingData.getState().updateNode(payload.id, payload.changes);
        eventLog.append('current-model', { type: 'node:updated', payload });
    });

    bus.on('node:deleted', (payload) => {
        useModelingData.getState().removeNode(payload.id);
        eventLog.append('current-model', { type: 'node:deleted', payload });
    });

    bus.on('node:pinned', (payload) => {
        useModelingData.getState().updateNode(payload.id, { pinned: payload.pinned });
        eventLog.append('current-model', { type: 'node:pinned', payload });
    });

    bus.on('nodes:pinned', (payload) => {
        const state = useModelingData.getState();
        payload.ids.forEach(id => {
            state.updateNode(id, { pinned: payload.pinned });
        });
        eventLog.append('current-model', { type: 'nodes:pinned', payload });
    });

    // ------------------------------------------------------------------
    // LINK PROJECTIONS
    // ------------------------------------------------------------------
    bus.on('link:created', (link) => {
        useModelingData.getState().addLink(link);
        eventLog.append('current-model', { type: 'link:created', payload: link });
    });

    bus.on('link:deleted', (payload) => {
        useModelingData.getState().removeLink(payload.id);
        eventLog.append('current-model', { type: 'link:deleted', payload });
    });

    bus.on('link:updated', (payload) => {
        // Todo: Add updateLink to store if needed, or use setLinks
        const state = useModelingData.getState();
        state.setLinks(state.links.map(l => l.id === payload.id ? { ...l, ...payload.changes } : l));
        eventLog.append('current-model', { type: 'link:updated', payload });
    });

    // ------------------------------------------------------------------
    // SLICE PROJECTIONS
    // ------------------------------------------------------------------
    bus.on('slice:created', (slice) => {
        const state = useModelingData.getState();
        state.setSlices([...state.slices, slice]);
        eventLog.append('current-model', { type: 'slice:created', payload: slice });
    });

    bus.on('slice:updated', (payload) => {
        const state = useModelingData.getState();
        state.setSlices(state.slices.map(s => s.id === payload.id ? { ...s, ...payload.changes } : s));
        eventLog.append('current-model', { type: 'slice:updated', payload });
    });

    bus.on('slice:deleted', (payload) => {
        const state = useModelingData.getState();
        state.setSlices(state.slices.filter(s => s.id !== payload.id));
        eventLog.append('current-model', { type: 'slice:deleted', payload });
    });

    // ------------------------------------------------------------------
    // DEFINITION PROJECTIONS
    // ------------------------------------------------------------------
    bus.on('definition:created', (def) => {
        useModelingData.getState().addDefinition(def);
        eventLog.append('current-model', { type: 'definition:created', payload: def });
    });

    bus.on('definition:updated', (payload) => {
        useModelingData.getState().updateDefinition(payload.id, payload.changes);
        eventLog.append('current-model', { type: 'definition:updated', payload });
    });

    bus.on('definition:deleted', (payload) => {
        useModelingData.getState().removeDefinition(payload.id);
        eventLog.append('current-model', { type: 'definition:deleted', payload });
    });

    // ------------------------------------------------------------------
    // MODEL PROJECTIONS
    // ------------------------------------------------------------------
    bus.on('modelName:updated', (payload) => {
        // Model name is currently handled by useGraphSync state, 
        // but we log it for history consistency.
        eventLog.append('current-model', { type: 'modelName:updated', payload });
    });

    console.log('[Projector] Initialized');
};
