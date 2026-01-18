import { Node, Link, ElementType } from '../../modeling';
import { ModelingEvent } from '../../modeling/domain/events';

export type HistoryAction =
    | { type: ModelingEvent.NodeAdded; payload: { id: string; type: ElementType; x: number; y: number }; undoPayload: { id: string } }
    | { type: ModelingEvent.NodeDeleted; payload: { id: string }; undoPayload: { node: Node; links: Link[] } }
    | { type: ModelingEvent.NodeMoved; payload: { id: string; x: number; y: number }; undoPayload: { id: string; x: number; y: number } }
    | { type: ModelingEvent.LinkAdded; payload: Link; undoPayload: { id: string } }
    | { type: ModelingEvent.LinkDeleted; payload: { id: string }; undoPayload: Link }
    | { type: ModelingEvent.NodeRenamed; payload: { id: string; data: Partial<Node> }; undoPayload: Partial<Node> }
    | { type: ModelingEvent.NodeUpdated; payload: { id: string; data: Partial<Node> }; undoPayload: Partial<Node> }
    | { type: ModelingEvent.LinkUpdated; payload: { id: string; data: Partial<Link> }; undoPayload: Partial<Link> }
    | { type: ModelingEvent.BatchMove; payload: { id: string; x: number; y: number }[]; undoPayload: { id: string; x: number; y: number }[] };
