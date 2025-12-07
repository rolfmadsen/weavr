import { useEffect } from 'react';
import { Node, ElementType, DataDefinition } from '../modeling/types';

interface UseDataMigrationProps {
    nodes: Node[];
    updateNode: (id: string, data: Partial<Node>) => void;
    definitions: DataDefinition[];
    updateDefinition: (id: string, data: Partial<DataDefinition>) => void;
}

const TYPE_MAPPINGS: Record<string, string> = {
    'string': 'String',
    'text': 'String',
    'bool': 'Boolean',
    'boolean': 'Boolean',
    'int': 'Int',
    'integer': 'Int',
    'float': 'Double',
    'double': 'Double',
    'number': 'Double',
    'date': 'Date',
    'datetime': 'DateTime',
    'uuid': 'UUID'
};

export const useDataMigration = ({ nodes, updateNode, definitions, updateDefinition }: UseDataMigrationProps) => {
    // Migration 1: Rename Legacy Event Types
    useEffect(() => {
        if (nodes.length > 0) {
            nodes.forEach(node => {
                // Explicitly cast to any to check for legacy types
                const legacyType = node.type as any;
                if (legacyType === 'EVENT_INTERNAL') {
                    console.log(`Migrating node ${node.id}: EVENT_INTERNAL -> DOMAIN_EVENT`);
                    updateNode(node.id, { type: ElementType.DomainEvent });
                } else if (legacyType === 'EVENT_EXTERNAL') {
                    console.log(`Migrating node ${node.id}: EVENT_EXTERNAL -> INTEGRATION_EVENT`);
                    updateNode(node.id, { type: ElementType.IntegrationEvent });
                }
            });
        }
    }, [nodes, updateNode]);

    // Migration 2: Normalize Attribute Types
    useEffect(() => {
        if (definitions.length > 0) {
            definitions.forEach(def => {
                if (!def.attributes) return;

                let hasChanges = false;
                const newAttributes = def.attributes.map(attr => {
                    const lowerType = attr.type.toLowerCase();
                    const normalizedType = TYPE_MAPPINGS[lowerType];

                    if (normalizedType && attr.type !== normalizedType) {
                        hasChanges = true;
                        return { ...attr, type: normalizedType };
                    }
                    return attr;
                });

                if (hasChanges) {
                    console.log(`Migrating definition ${def.name}: Normalizing attribute types`);
                    updateDefinition(def.id, { attributes: newAttributes });
                }
            });
        }
    }, [definitions, updateDefinition]);
};
