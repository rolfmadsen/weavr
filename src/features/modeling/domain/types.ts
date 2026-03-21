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
  isPII?: boolean; // Added for GDPR
  definitionId?: string; // New: Linkage to Dictionary
  attributeKey?: string; // New: Linkage to Dictionary
  description?: string;
  schema?: string; // Link to Data Definition
  role?: 'display' | 'input'; // ICC: display (from source) vs input (captured here)
  subfields?: Field[];
}

export interface Actor {
  id: string;
  name: string;
  description?: string;
  color?: string;
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
  actor?: string; // Added for Screen/Automation
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
  layout?: Record<string, { x: number, y: number }>;
  sliceBounds?: Record<string, { x: number, y: number, width: number, height: number }>;
  edgeRoutes?: Record<string, number[]>;
}


export enum SliceType {
  StateChange = 'STATE_CHANGE',
  StateView = 'STATE_VIEW',
  Automation = 'AUTOMATION',
  Integration = 'INTEGRATION'
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
  chapter?: string; // Added for Structuring Large Models
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
  fields?: Field[]; // Field definition can be complex, keeping loose for now or import Field
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
  isPII?: boolean; // NEW
}

export enum DefinitionType {
  Aggregate = 'Aggregate',
  ValueObject = 'Value Object',
  Entity = 'Entity',
  Enum = 'Enum'
}

export interface DataDefinition {
  id: string;
  name: string;
  type: DefinitionType;
  description?: string | null;
  attributes?: Attribute[] | null;
  parentId?: string | null;
  isRoot?: boolean | null;
}


export interface CrossModelSlice {
  id: string;
  label: string;
  modelName: string;
  originalData: Slice;
}

export interface CrossModelDefinition {
  id: string;
  label: string;
  modelName: string;
  originalData: DataDefinition;
}

/**
 * Utility type for GunDB persistence.
 * GunDB does not support arrays natively in the same way we use them (it prefers graph nodes).
 * For simple storage, we JSON.stringify arrays, so their persisted type is 'string'.
 */
export type GunPersisted<T> = {
  [K in keyof T]: (T[K] extends Array<any> | undefined | null ? string : T[K]) | null | undefined
};

export interface ViewState {
  x: number;
  y: number;
  scale: number;
  width?: number;
  height?: number;
}