export enum ElementType {
  Screen = 'SCREEN',
  Command = 'COMMAND',
  DomainEvent = 'DOMAIN_EVENT',
  ReadModel = 'READ_MODEL',
  IntegrationEvent = 'INTEGRATION_EVENT',
  Automation = 'AUTOMATION',
}

// Strict Mode Properties
export interface Field {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  schema?: string; // Link to Data Definition
  subfields?: Field[];
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
  context?: 'INTERNAL' | 'EXTERNAL';
  pinned?: boolean;

  // New Schema Properties
  apiEndpoint?: string;
  domain?: string;
  fields?: Field[];
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
  status?: string;
  actors?: string[];
  aggregates?: string[];
  specifications?: Specification[];
}

export interface Comment {
  description: string;
}

export interface SpecificationStep {
  id: string;
  title: string;
  tags?: string[];
  examples?: Record<string, any>[]; // generic object for flexible examples
  index?: number;
  specRow?: number;
  type: 'SPEC_EVENT' | 'SPEC_COMMAND' | 'SPEC_READMODEL' | 'SPEC_ERROR';
  fields?: any[]; // Field definition can be complex, keeping loose for now or import Field
  linkedId?: string;
  expectEmptyList?: boolean;
  comments?: Comment[];
}

export interface SpecificationExample {
  headers: string[];
  rows: string[][];
}

export interface Specification {
  id: string;
  title: string;
  vertical?: boolean;
  sliceName?: string;
  given: SpecificationStep[];
  when: SpecificationStep[];
  then: SpecificationStep[];
  comments?: Comment[];
  linkedId?: string;
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