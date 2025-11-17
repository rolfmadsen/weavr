import { ElementType } from './types';

export const ELEMENT_STYLE: Record<ElementType, { color: string; textColor: string; shape: 'rect' | 'circle' | 'diamond' | 'beveled-rect' }> = {
  [ElementType.Screen]: { color: '#e5e7eb', textColor: '#1f2937', shape: 'rect' }, // Light Gray
  [ElementType.Command]: { color: '#3b82f6', textColor: '#ffffff', shape: 'rect' }, // Blue
  [ElementType.EventInternal]: { color: '#f97316', textColor: '#ffffff', shape: 'circle' }, // Orange
  [ElementType.ReadModel]: { color: '#22c55e', textColor: '#ffffff', shape: 'rect' }, // Green
  [ElementType.EventExternal]: { color: '#facc15', textColor: '#1f2937', shape: 'beveled-rect' }, // Yellow with dark text
  [ElementType.Automation]: { color: '#14b8a6', textColor: '#ffffff', shape: 'rect' }, // Teal
};

export const NODE_WIDTH = 160;
export const MIN_NODE_HEIGHT = 60;
export const GRID_SIZE = 20;