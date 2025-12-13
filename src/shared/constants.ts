import { ElementType } from '../features/modeling/types';

type LegacyType = 'EVENT_INTERNAL' | 'EVENT_EXTERNAL';
export const ELEMENT_STYLE: Record<ElementType | LegacyType, { color: string; textColor: string; shape: 'rect' | 'circle' | 'diamond' | 'beveled-rect' }> = {
  [ElementType.Screen]: { color: '#e5e7eb', textColor: '#1f2937', shape: 'rect' }, // Light Gray
  [ElementType.Command]: { color: '#3b82f6', textColor: '#ffffff', shape: 'rect' }, // Blue
  [ElementType.DomainEvent]: { color: '#f97316', textColor: '#ffffff', shape: 'circle' }, // Orange
  [ElementType.ReadModel]: { color: '#22c55e', textColor: '#ffffff', shape: 'rect' }, // Green
  [ElementType.IntegrationEvent]: { color: '#facc15', textColor: '#1f2937', shape: 'beveled-rect' }, // Yellow with dark text
  [ElementType.Automation]: { color: '#14b8a6', textColor: '#ffffff', shape: 'rect' }, // Teal
  // Legacy Types Support
  'EVENT_INTERNAL': { color: '#f97316', textColor: '#ffffff', shape: 'circle' },
  'EVENT_EXTERNAL': { color: '#facc15', textColor: '#1f2937', shape: 'beveled-rect' },
};

export const NODE_WIDTH = 160;
export const MIN_NODE_HEIGHT = 80;
export const GRID_SIZE = 20;
export const NODE_PADDING = 20; // 10

export const FONT_FAMILY = 'Roboto, sans-serif';
export const FONT_SIZE = 14;
export const LINE_HEIGHT = 1.2; // Multiplier

export const SLICE_WIDTH = 280;
export const SLICE_GAP = 40;
export const SLICE_PADDING = 20;

export const SLICE_TYPE_COLORS: Record<string, string> = {
  'STATE_CHANGE': '#3b82f6', // Blue
  'STATE_VIEW': '#22c55e',   // Green
  'AUTOMATION': '#f97316',   // Orange
};