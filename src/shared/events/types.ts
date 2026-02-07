import { ElementType, Node, Link, Slice, DataDefinition, Actor, Attribute } from '../../features/modeling/domain/types';

// ==========================================
// 1. COMMANDS (User Intents)
// Sent by UI -> EventBus
// ==========================================
export type ModelingCommand =
    | { type: 'command:createNode'; payload: { type: ElementType; x: number; y: number; id?: string; sliceId?: string; pinned?: boolean; context?: 'INTERNAL' | 'EXTERNAL' } }
    | { type: 'command:moveNode'; payload: { id: string; x: number; y: number; isDragEnd?: boolean; pinned?: boolean } }
    | { type: 'command:moveNodes'; payload: { updates: { id: string; x: number; y: number }[]; pinned?: boolean } }
    | { type: 'command:updateNode'; payload: { id: string; changes: Partial<Node> } }
    | { type: 'command:deleteNode'; payload: { id: string } }
    | { type: 'command:pinNode'; payload: { id: string } }
    | { type: 'command:unpinNode'; payload: { id: string } }
    | { type: 'command:pinNodes'; payload: { ids: string[] } }
    | { type: 'command:unpinNodes'; payload: { ids: string[] } }
    | { type: 'command:createLink'; payload: { sourceId: string; targetId: string; id?: string } }
    | { type: 'command:updateLink'; payload: { id: string; changes: Partial<Link> } }
    | { type: 'command:deleteLink'; payload: { id: string } }
    | { type: 'command:createSlice'; payload: { title: string; order?: number; id?: string } }
    | { type: 'command:updateSlice'; payload: { id: string; changes: Partial<Slice> } }
    | { type: 'command:deleteSlice'; payload: { id: string } }
    | { type: 'command:createDefinition'; payload: { name: string; type?: string; id?: string; description?: string | null; parentId?: string | null; isRoot?: boolean | null; attributes?: Attribute[] | null } }
    | { type: 'command:updateDefinition'; payload: { id: string; changes: Partial<DataDefinition> } }
    | { type: 'command:deleteDefinition'; payload: { id: string } }
    | { type: 'command:createActor'; payload: { name: string; description?: string; id?: string; color?: string } }
    | { type: 'command:updateActor'; payload: { id: string; changes: Partial<Actor> } }
    | { type: 'command:deleteActor'; payload: { id: string } }
    | { type: 'command:updateModelName'; payload: { name: string } }
    | { type: 'command:undo'; payload?: void }
    | { type: 'command:redo'; payload?: void }
    | { type: 'history:clear'; payload?: void };

// ==========================================
// 2. EVENTS (Facts)
// Sent by Logic/GunAdapter -> EventBus
// Used by Projectors and History Log
// ==========================================
export type ModelingEvent =
    | { type: 'node:created'; payload: Node }
    | { type: 'node:moved'; payload: { id: string; x: number; y: number; pinned: boolean; previous?: { x: number; y: number; pinned: boolean } } }
    | { type: 'nodes:moved'; payload: { updates: { id: string; x: number; y: number }[]; previous: { id: string; x: number; y: number; pinned: boolean }[]; pinned?: boolean } }
    | { type: 'node:updated'; payload: { id: string; changes: Partial<Node>; previous?: Partial<Node> } }
    | { type: 'node:deleted'; payload: { id: string; node: Node } }
    | { type: 'node:pinned'; payload: { id: string; pinned: boolean } }
    | { type: 'nodes:pinned'; payload: { ids: string[]; pinned: boolean } }
    | { type: 'link:created'; payload: Link }
    | { type: 'link:updated'; payload: { id: string; changes: Partial<Link>; previous?: Partial<Link> } }
    | { type: 'link:deleted'; payload: { id: string; link: Link } }
    | { type: 'slice:created'; payload: Slice }
    | { type: 'slice:updated'; payload: { id: string; changes: Partial<Slice>; previous?: Partial<Slice> } }
    | { type: 'slice:deleted'; payload: { id: string; slice: Slice } }
    | { type: 'definition:created'; payload: DataDefinition }
    | { type: 'definition:updated'; payload: { id: string; changes: Partial<DataDefinition>; previous?: Partial<DataDefinition> } }
    | { type: 'definition:deleted'; payload: { id: string; definition: DataDefinition } }
    | { type: 'actor:created'; payload: Actor }
    | { type: 'actor:updated'; payload: { id: string; changes: Partial<Actor>; previous?: Partial<Actor> } }
    | { type: 'actor:deleted'; payload: { id: string; actor: Actor } }
    | { type: 'modelName:updated'; payload: { name: string; previous?: string } }
    // External Events (From GunDB remote peer)
    | { type: 'external:stateChanged'; payload: { type: 'node' | 'link' | 'slice'; id: string; data: any } };

// Helper map for Mitt to enforce types
export type EventBusMap = {
    [K in ModelingCommand['type']]: Extract<ModelingCommand, { type: K }> extends { payload: infer P } ? P : void;
} & {
    [K in ModelingEvent['type']]: Extract<ModelingEvent, { type: K }> extends { payload: infer P } ? P : void;
} & {
    // Wildcard support if needed (handled manually in generic wrappers)
    '*': any;
};
