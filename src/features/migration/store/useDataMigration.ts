import { useEffect } from 'react';
import { Node, DataDefinition } from '../../modeling';
import { migrateNodeType, normalizeAttributes } from '../domain/migrations';

interface UseDataMigrationProps {
    nodes: Node[];
    updateNode: (id: string, data: Partial<Node>) => void;
    definitions: DataDefinition[];
    updateDefinition: (id: string, data: Partial<DataDefinition>) => void;
}

export const useDataMigration = ({ nodes, updateNode, definitions, updateDefinition }: UseDataMigrationProps) => {
    // Migration 1: Rename Legacy Event Types
    useEffect(() => {
        if (nodes.length > 0) {
            nodes.forEach(node => {
                const update = migrateNodeType(node);
                if (update) {
                    console.log(`Migrating node ${node.id}: Legacy Type -> ${update.type}`);
                    updateNode(node.id, update);
                }
            });
        }
    }, [nodes, updateNode]);

    // Migration 2: Normalize Attribute Types
    useEffect(() => {
        if (definitions.length > 0) {
            definitions.forEach(def => {
                const newAttributes = normalizeAttributes(def);
                if (newAttributes) {
                    console.log(`Migrating definition ${def.name}: Normalizing attribute types`);
                    updateDefinition(def.id, { attributes: newAttributes });
                }
            });
        }
    }, [definitions, updateDefinition]);
};
