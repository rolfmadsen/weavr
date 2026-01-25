import Konva from 'konva';

export type CursorType = 'default' | 'grab' | 'grabbing' | 'crosshair' | 'pointer' | 'text' | 'not-allowed';

/**
 * Centralized function to set the cursor style for the Konva stage container.
 * This ensures consistency and allows for debugging or overriding behavior globally.
 */
export const setCanvasCursor = (stageOrEvent: Konva.Stage | Konva.KonvaEventObject<any> | null, type: CursorType) => {
    let stage: Konva.Stage | null = null;

    if (!stageOrEvent) return;

    if (stageOrEvent instanceof Konva.Stage) {
        stage = stageOrEvent;
    } else if (stageOrEvent.target) {
        stage = stageOrEvent.target.getStage();
    }

    if (stage && stage.container()) {
        stage.container().style.cursor = type;
    }
};
