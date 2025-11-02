export enum ElementType {
  Screen = 'SCREEN',
  Command = 'COMMAND',
  EventInternal = 'EVENT_INTERNAL',
  ReadModel = 'READ_MODEL',
  EventExternal = 'EVENT_EXTERNAL',
}

export interface Node {
  id: string;
  type: ElementType;
  name: string;
  description: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link {
  id: string;
  source: string; // node id
  target: string; // node id
  label: string;
}

export interface SimulationNode extends Node {
  index?: number;
  vx?: number;
  vy?: number;
  computedHeight?: number;
  manualPosition?: { x: number, y: number };
}

export interface SimulationLink extends Omit<Link, 'source' | 'target'> {
  source: SimulationNode;
  target: SimulationNode;
  index?: number;
}

export interface ModelData {
  nodes: Node[];
  links: Link[];
  nodeSliceMap?: Record<string, string>;
}

export interface Slice {
    id: string;
    nodeIds: Set<string>;
    color: string;
    // Bounding box for rendering
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}