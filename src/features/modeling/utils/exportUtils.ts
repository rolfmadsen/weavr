import { Node, Link, Slice, ElementType, ModelData, DataDefinition, DefinitionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface WeavrExportData {
    meta: {
        version: string;
        generator: string;
        createdAt: string;
        updatedAt: string;
        projectId: string;
        projectName: string;
    };
    eventModel: {
        slices: any[];
    };
    layout: Record<string, any>;
    dataDictionary: {
        definitions: Record<string, any>;
    };
}

export interface StandardExportData {
    slices: any[];
}

export type ExportData = WeavrExportData | StandardExportData;

// Helper to get current ISO date
const now = () => new Date().toISOString();

// Map internal ElementType to Schema Element Type
const mapTypeToSchema = (type: ElementType): string => {
    switch (type) {
        case ElementType.ReadModel: return 'READMODEL';
        case ElementType.DomainEvent: return 'EVENT';
        case ElementType.IntegrationEvent: return 'EVENT';
        case ElementType.Command: return 'COMMAND';
        case ElementType.Screen: return 'SCREEN';
        case ElementType.Automation: return 'AUTOMATION';
        default: return 'COMMAND'; // Fallback
    }
};

// Map Schema Element Type to internal ElementType
const mapSchemaToType = (type: string, context?: string): ElementType => {
    switch (type) {
        case 'READMODEL': return ElementType.ReadModel;
        case 'EVENT': return context === 'EXTERNAL' ? ElementType.IntegrationEvent : ElementType.DomainEvent;
        case 'COMMAND': return ElementType.Command;
        case 'SCREEN': return ElementType.Screen;
        case 'AUTOMATION': return ElementType.Automation;
        default: return ElementType.Command;
    }
};

export const exportWeavrProject = (
    nodes: Node[],
    links: Link[],
    slices: Slice[],
    edgeRoutes: Map<string, number[]>,
    modelId: string,
    projectName: string = 'Untitled Project',
    format: 'WEAVR' | 'STANDARD' = 'WEAVR',
    definitions: DataDefinition[] = []
): ExportData => {
    // 1. Meta
    const meta = {
        version: "1.0.0",
        generator: "Weavr",
        createdAt: now(),
        updatedAt: now(),
        projectId: modelId,
        projectName: projectName
    };

    // 2. Event Model (Strict)
    // Group nodes by slice
    const sliceMap = new Map<string, any>();

    // Initialize slices from the slices array
    slices.forEach(slice => {
        sliceMap.set(slice.id, {
            id: slice.id,
            title: slice.title || 'Untitled Slice',
            sliceType: 'STATE_CHANGE', // Default, as we don't track this yet
            commands: [],
            events: [],
            readmodels: [],
            screens: [],
            screenImages: [],
            processors: [],
            tables: [],
            specifications: [],
            actors: [],
            aggregates: []
        });
    });

    // 3. Data Dictionary
    const dictionary: Record<string, any> = {};

    definitions.forEach(def => {
        if (def.type === DefinitionType.Enum) {
            // Map Enum to String with Enum restriction
            // We assume attributes contain the enum values as 'name'
            const enumValues = (def.attributes || []).map(attr => attr.name);
            dictionary[def.name] = {
                type: 'string',
                title: def.name,
                description: def.description || '',
                enum: enumValues
            };
        } else {
            // Map Entity/ValueObject to Object
            const properties: Record<string, any> = {};
            // const required: string[] = [];

            (def.attributes || []).forEach(attr => {
                // Determine JSON Schema type
                let schemaType = 'string'; // Default
                switch (attr.type) {
                    case 'Boolean': schemaType = 'boolean'; break;
                    case 'Int': schemaType = 'integer'; break;
                    case 'Double':
                    case 'Decimal':
                    case 'Long':
                    case 'Number': schemaType = 'number'; break;
                    // String, Date, DateTime, UUID, Custom stay as string (or could be refined)
                }

                properties[attr.name] = {
                    type: schemaType
                };
            });

            dictionary[def.name] = {
                type: 'object',
                title: def.name,
                description: def.description || '',
                properties,
                // required // We don't track required yet
            };
        }
    });

    const layout: Record<string, any> = {};

    // Map Nodes
    // Map Nodes
    nodes.forEach(node => {
        // Layout Sidecar (Enriched with Metadata as requested)
        layout[node.id] = {
            x: node.x,
            y: node.y,
            height: node.computedHeight,
            // redundant meta data for readability in raw JSON
            type: mapTypeToSchema(node.type),
            title: node.name
        };

        // Event Model Element
        const element = {
            id: node.id,
            title: node.name,
            type: mapTypeToSchema(node.type),
            description: node.description || '',
            dependencies: [], // Populated below
            fields: [] // Required by schema
        };

        let sId = node.sliceId && sliceMap.has(node.sliceId) ? node.sliceId : null;

        // Handle Orphans: If no valid slice, put in "Unassigned" slice
        if (!sId) {
            const unassignedId = 'unassigned';
            if (!sliceMap.has(unassignedId)) {
                sliceMap.set(unassignedId, {
                    id: unassignedId,
                    title: 'Unassigned',
                    sliceType: 'App',
                    commands: [],
                    events: [],
                    readmodels: [],
                    screens: [],
                    screenImages: [],
                    processors: [],
                    tables: [],
                    specifications: [],
                    actors: [],
                    aggregates: []
                });
            }
            sId = unassignedId;
        }

        if (sId) {
            const slice = sliceMap.get(sId);
            switch (node.type) {
                case ElementType.Command: slice.commands.push(element); break;
                case ElementType.DomainEvent:
                case ElementType.IntegrationEvent: slice.events.push(element); break;
                case ElementType.ReadModel: slice.readmodels.push(element); break;
                case ElementType.Screen: slice.screens.push(element); break;
                case ElementType.Automation: slice.processors.push(element); break;
            }
        }
    });

    // Map Links to Dependencies and Layout
    // We need to find the element object to push dependencies to.
    // Since we pushed them into arrays in slices, we can look them up if we index them,
    // or we can iterate slices again? Better to index elements by ID.
    const elementMap = new Map<string, any>();
    Array.from(sliceMap.values()).forEach((slice: any) => {
        [...slice.commands, ...slice.events, ...slice.readmodels, ...slice.screens, ...slice.processors].forEach(el => {
            elementMap.set(el.id, el);
        });
    });

    links.forEach(link => {
        const sourceEl = elementMap.get(link.source);
        const targetEl = elementMap.get(link.target);

        if (sourceEl && targetEl) {
            // Add Dependency to Source
            // Note: Schema Dependency ID is usually the Target ID or a unique ID?
            // "Dependency ... id: string". If it's the target ID, we can't have multiple links to same target easily?
            // Let's assume ID is the Target ID for standard compliance.
            // But to store layout, we need a unique key.
            // We'll use the Link ID for the layout key, but we can't link it to the dependency easily 
            // unless Dependency.id IS the Link ID?
            // If Dependency.id is the Link ID, how do we know the target?
            // Standard Event Modeling usually implies dependencies by ID reference.
            // Let's use Target ID as Dependency ID (Standard).

            sourceEl.dependencies.push({
                id: link.target, // Target ID
                type: 'OUTBOUND',
                title: link.label || '',
                elementType: targetEl.type
            });

            // Store Edge Route in Layout
            // We use a composite key: "sourceId_targetId"
            // If multiple links exist, this overwrites. Weavr currently allows multiple? 
            // If so, this is a limitation of the standard mapping without extra metadata.
            // But for now, this is the best standard-compliant approach.
            const routeKey = `${link.source}_${link.target}`;
            const points = edgeRoutes.get(link.id);

            if (points) {
                layout[routeKey] = {
                    x: 0, y: 0, // Dummy required fields
                    points: points
                };
            }
        }
    });

    if (format === 'STANDARD') {
        return {
            slices: Array.from(sliceMap.values())
        };
    }

    return {
        meta,
        eventModel: {
            slices: Array.from(sliceMap.values())
        },
        layout,
        dataDictionary: {
            definitions: dictionary
        }
    };
};

export const importWeavrProject = (json: any): ModelData & { edgeRoutes?: Record<string, number[]>, definitions?: DataDefinition[] } => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const edgeRoutes: Record<string, number[]> = {};
    const slices: Slice[] = [];
    const definitions: DataDefinition[] = [];

    // Import Data Dictionary
    if (json.dataDictionary && json.dataDictionary.definitions) {
        Object.keys(json.dataDictionary.definitions).forEach(key => {
            const schema = json.dataDictionary.definitions[key];
            const isEnum = schema.type === 'string' && Array.isArray(schema.enum);
            const isObject = schema.type === 'object';

            let type = DefinitionType.Entity;
            if (isEnum) type = DefinitionType.Enum;
            // We can't distinguish ValueObject from Entity purely by schema easily without extra metadata, 
            // so default to Entity unless we add metadata later.
            // Or if we check the name? 

            const attributes: any[] = [];

            if (isEnum) {
                (schema.enum || []).forEach((val: string) => {
                    attributes.push({ name: val, type: 'String' });
                });
            } else if (isObject && schema.properties) {
                Object.keys(schema.properties).forEach(propKey => {
                    const prop = schema.properties[propKey];
                    // Reverse map type
                    let myType = 'String';
                    if (prop.type === 'boolean') myType = 'Boolean';
                    if (prop.type === 'integer') myType = 'Int';
                    if (prop.type === 'number') myType = 'Double';

                    attributes.push({ name: propKey, type: myType });
                });
            }

            definitions.push({
                id: uuidv4(),
                name: schema.title || key,
                type,
                description: schema.description,
                attributes
            });
        });
    }

    // Determine source of slices
    let sourceSlices: any[] = [];
    let layoutSource: any = {};

    if (json.slices && Array.isArray(json.slices)) {
        // Standard Format (Root slices)
        sourceSlices = json.slices;
        // No layout in standard format
    } else if (json.eventModel && json.eventModel.slices) {
        // Weavr Format
        sourceSlices = json.eventModel.slices;
        layoutSource = json.layout || {};
    }

    // 1. Reconstruct Slices
    sourceSlices.forEach((s: any) => {
        slices.push({
            id: s.id,
            title: s.title,
            nodeIds: new Set(), // Will populate
            color: '#ffffff' // Default
        });

        // Flatten elements
        const elements = [
            ...(s.commands || []),
            ...(s.events || []),
            ...(s.readmodels || []),
            ...(s.screens || []),
            ...(s.processors || [])
        ];

        elements.forEach((el: any) => {
            const layoutData = layoutSource[el.id] || {};
            const elId = String(el.id);

            nodes.push({
                id: elId,
                name: el.title,
                description: el.description,
                type: mapSchemaToType(el.type, el.context),
                sliceId: String(s.id),
                x: layoutData.x || 0,
                y: layoutData.y || 0,
                computedHeight: layoutData.height,
                fx: layoutData.x, // Fix position if imported
                fy: layoutData.y,
                entityIds: [] // Initialize empty to prevent merging with existing state
            });

            // Reconstruct Links from Dependencies
            if (el.dependencies) {
                el.dependencies.forEach((dep: any) => {
                    if (dep.type === 'OUTBOUND') { // Only process outbound to avoid duplicates
                        const targetId = String(dep.id);
                        const linkId = uuidv4(); // Generate new ID as standard doesn't preserve it

                        links.push({
                            id: linkId,
                            source: elId,
                            target: targetId,
                            label: dep.title || ''
                        });

                        // Try to find edge route
                        // Key: sourceId_targetId
                        const routeKey = `${elId}_${targetId}`;
                        const routeData = layoutSource[routeKey];
                        if (routeData && routeData.points) {
                            edgeRoutes[linkId] = routeData.points;
                        }
                    }
                });
            }
        });
    });

    const slicesRecord: Record<string, Slice> = {};
    slices.forEach(s => {
        slicesRecord[s.id] = s;
    });

    return {
        nodes,
        links,
        slices: slicesRecord,
        edgeRoutes,
        definitions
    };
};
