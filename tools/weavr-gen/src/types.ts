/**
 * Weavr-Gen Shared Types
 * 
 * Self-contained type definitions that mirror the Weavr domain model.
 * These are standalone to avoid import dependencies on the main Weavr src.
 */

// ─── Element Types ───────────────────────────────────────────────

export enum ElementType {
  Screen = 'SCREEN',
  Command = 'COMMAND',
  DomainEvent = 'DOMAIN_EVENT',
  ReadModel = 'READ_MODEL',
  IntegrationEvent = 'INTEGRATION_EVENT',
  Automation = 'AUTOMATION',
}

/** Schema-level element type (used in JSON export) */
export type SchemaElementType = 'COMMAND' | 'EVENT' | 'READMODEL' | 'SCREEN' | 'AUTOMATION';

// ─── Slice Types (The 4 Patterns) ────────────────────────────────

export enum SliceType {
  StateChange = 'STATE_CHANGE',
  StateView = 'STATE_VIEW',
  Automation = 'AUTOMATION',
  Integration = 'INTEGRATION',
}

// ─── Field ───────────────────────────────────────────────────────

export type FieldType = 'String' | 'Boolean' | 'Double' | 'Decimal' | 'Long' | 'Custom' | 'Date' | 'DateTime' | 'UUID' | 'Int';

export interface Field {
  name: string;
  type: FieldType | string;
  example?: string | object;
  subfields?: Field[];
  mapping?: string;
  optional?: boolean;
  technicalAttribute?: boolean;
  generated?: boolean;
  idAttribute?: boolean;
  schema?: string;
  cardinality?: 'List' | 'Single';
}

// ─── Dependency ──────────────────────────────────────────────────

export interface Dependency {
  id: string;
  type: 'INBOUND' | 'OUTBOUND';
  title: string;
  elementType: SchemaElementType;
}

// ─── ModelingElement ─────────────────────────────────────────────

export interface ModelingElement {
  id: string;
  title: string;
  type: SchemaElementType;
  description?: string;
  fields: Field[];
  dependencies: Dependency[];
  groupId?: string;
  tags?: string[];
  domain?: string;
  modelContext?: string;
  context?: 'INTERNAL' | 'EXTERNAL';
  slice?: string;
  aggregate?: string;
  aggregateDependencies?: string[];
  apiEndpoint?: string;
  service?: string | null;
  createsAggregate?: boolean;
  triggers?: string[];
  sketched?: boolean;
  prototype?: object;
  listElement?: boolean;
  imageUrl?: string;
}

// ─── Specification ───────────────────────────────────────────────

export type SpecStepType = 'SPEC_EVENT' | 'SPEC_COMMAND' | 'SPEC_READMODEL' | 'SPEC_ERROR';

export interface SpecificationStep {
  id: string;
  title: string;
  type: SpecStepType;
  tags?: string[];
  examples?: Record<string, unknown>[];
  index?: number;
  specRow?: number;
  fields?: Field[];
  linkedId?: string;
  expectEmptyList?: boolean;
}

export interface Comment {
  description: string;
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
  linkedId: string;
  examples?: SpecificationExample;
  modelData?: any;
}

// ─── Actor ───────────────────────────────────────────────────────

export interface Actor {
  name: string;
  authRequired: boolean;
}

// ─── Screen Image ────────────────────────────────────────────────

export interface ScreenImage {
  id: string;
  title: string;
  url?: string;
}

// ─── Table ───────────────────────────────────────────────────────

export interface Table {
  id: string;
  title: string;
  fields: Field[];
}

// ─── Slice ───────────────────────────────────────────────────────

export interface Slice {
  id: string;
  title: string;
  sliceType: SliceType | string;
  status?: string;
  index?: number;
  context?: string;
  commands: ModelingElement[];
  events: ModelingElement[];
  readmodels: ModelingElement[];
  screens: ModelingElement[];
  screenImages?: ScreenImage[];
  processors: ModelingElement[];
  tables: Table[];
  specifications: Specification[];
  actors?: Actor[];
  aggregates?: string[];
}

export interface Attribute {
  name: string;
  type: string;
  isPII?: boolean;
}

export type DefinitionType = 'Aggregate' | 'Value Object' | 'Entity' | 'Enum';

export interface DataDefinition {
  id: string;
  name: string;
  type: DefinitionType | string;
  description?: string | null;
  attributes?: Attribute[] | null;
  parentId?: string | null;
  isRoot?: boolean | null;
  aggregate?: string | null;
}

export interface WeavrMeta {
  version: string;
  generator: 'Weavr';
  createdAt?: string;
  updatedAt: string;
  projectId?: string;
  projectName?: string;
}

export interface WeavrProject {
  meta: WeavrMeta;
  eventModel: {
    slices: Slice[];
  };
  layout?: Record<string, unknown>;
  dataDictionary?: {
    definitions: Record<string, DataDefinition | unknown>;
  };
}

// ─── Validation Result ───────────────────────────────────────────

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: Severity;
  rule: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ─── Connection Rule ─────────────────────────────────────────────

export interface ConnectionRule {
  source: string;
  target: string;
  verb: string;
  description: string;
}

// ─── Pattern Rule ────────────────────────────────────────────────

export interface PatternRule {
  required: SchemaElementType[];
  requiredFlow: string[];
  optional: SchemaElementType[];
  forbidden: SchemaElementType[];
}

// ─── Spec Step Constraints ───────────────────────────────────────

export interface StepTypeConstraints {
  given: { allowed: SpecStepType[]; recommended: SpecStepType[] };
  when: { allowed: SpecStepType[]; recommended: SpecStepType[] };
  then: { allowed: SpecStepType[]; recommended: SpecStepType[] };
}
