export enum ElementType {
  Screen = 'SCREEN',
  Command = 'COMMAND',
  DomainEvent = 'DOMAIN_EVENT',
  ReadModel = 'READ_MODEL',
  IntegrationEvent = 'INTEGRATION_EVENT',
  Automation = 'AUTOMATION',
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
  computedHeight?: number;
  sliceId?: string;
  schemaBinding?: string;
  entityIds?: string[];
  // Strict Mode Properties
  service?: string;
  aggregate?: string;
  technicalTimestamp?: boolean;
  externalSystem?: string; // For External Events/Systems
  pinned?: boolean;
}


export interface Link {
  id: string;
  source: string; // node id
  target: string; // node id
  label: string;
  type?: 'FLOW' | 'DATA_DEPENDENCY';
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
  slices?: Record<string, Slice>; // Added for Strict Mode Storage
  nodeSliceMap?: Record<string, string>;
  definitions?: DataDefinition[];
}


export enum SliceType {
  StateChange = 'STATE_CHANGE',
  StateView = 'STATE_VIEW',
  Automation = 'AUTOMATION'
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
  order?: number; // Added for Strict Mode
  title?: string; // Added for Strict Mode
  // Strict Mode Properties
  sliceType?: SliceType;
  context?: string;
  actors?: string[];
  aggregates?: string[];
  specifications?: Specification[];
}

export interface SpecificationStep {
  id: string;
  title: string;
  comments?: string[];
  conjunction?: 'AND' | 'OR';
}

export interface SpecificationExample {
  headers: string[];
  rows: string[][];
}

export interface Specification {
  id: string;
  title: string;
  given: SpecificationStep[];
  when: SpecificationStep[];
  then: SpecificationStep[];
  examples?: SpecificationExample;
}

export interface StrictSlice {
  id: string;
  title: string;
  order: number;
  nodeIds?: string[]; // Optional in strict export, but useful
}

export interface StrictEventModel {
  slices: StrictSlice[];
}

export interface Attribute {
  name: string;
  type: string;
}

export enum DefinitionType {
  ValueObject = 'Value Object',
  Entity = 'Entity',
  Enum = 'Enum'
}

export interface DataDefinition {
  id: string;
  name: string;
  type: DefinitionType;
  description?: string;
  attributes?: Attribute[];
}

export interface StorageEventModel {
  slices: Record<string, StrictSlice>;
}