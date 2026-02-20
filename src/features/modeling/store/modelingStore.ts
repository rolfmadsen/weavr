import { create } from 'zustand';
import { Node, Link, Slice, DataDefinition, Actor } from '../domain/types';

interface ModelingState {
    nodes: Node[];
    links: Link[];
    slices: Slice[];
    definitions: DataDefinition[];

    // Actions (Mutators)
    // In strict EDA, these are only called by the Projector, not by UI directly.
    setNodes: (nodes: Node[]) => void;
    addNode: (node: Node) => void;
    updateNode: (id: string, changes: Partial<Node>) => void;
    removeNode: (id: string) => void;

    setLinks: (links: Link[]) => void;
    addLink: (link: Link) => void;
    removeLink: (id: string) => void;

    setSlices: (slices: Slice[]) => void;

    // Definition Actions
    addDefinition: (def: DataDefinition) => void;
    updateDefinition: (id: string, changes: Partial<DataDefinition>) => void;
    removeDefinition: (id: string) => void;
    setDefinitions: (definitions: DataDefinition[]) => void;

    // Actor Actions
    actors: Actor[];
    setActors: (actors: Actor[]) => void;
    addActor: (actor: Actor) => void;
    updateActor: (id: string, changes: Partial<Actor>) => void;
    removeActor: (id: string) => void;
}

export const useModelingData = create<ModelingState>((set) => ({
    nodes: [],
    links: [],
    slices: [],
    definitions: [],

    setNodes: (nodes) => set({ nodes }),
    addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
    updateNode: (id, changes) => set((state) => ({
        nodes: state.nodes.map(n => n.id === id ? { ...n, ...changes } : n)
    })),
    removeNode: (id) => set((state) => ({
        nodes: state.nodes.filter(n => n.id !== id)
    })),

    setLinks: (links) => set({ links }),
    addLink: (link) => set((state) => ({ links: [...state.links, link] })),
    removeLink: (id) => set((state) => ({
        links: state.links.filter(l => l.id !== id)
    })),

    setSlices: (slices) => set({ slices }),

    addDefinition: (def) => set((state) => ({ definitions: [...state.definitions, def] })),
    updateDefinition: (id, changes) => set((state) => ({
        definitions: state.definitions.map(d => d.id === id ? { ...d, ...changes } : d)
    })),
    removeDefinition: (id) => set((state) => ({
        definitions: state.definitions.filter(d => d.id !== id)
    })),
    setDefinitions: (definitions: DataDefinition[]) => set({ definitions }),

    actors: [],
    setActors: (actors) => set({ actors }),
    addActor: (actor) => set((state) => ({ actors: [...state.actors, actor] })),
    updateActor: (id, changes) => set((state) => ({
        actors: state.actors.map(a => a.id === id ? { ...a, ...changes } : a)
    })),
    removeActor: (id) => set((state) => ({
        actors: state.actors.filter(a => a.id !== id)
    })),
}));
