import { Node, ElementType, DataDefinition } from '../../modeling';

export const TYPE_MAPPINGS: Record<string, string> = {
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

export function migrateNodeType(node: Node): { type: ElementType } | null {
    // Explicitly cast to any to check for legacy types
    const legacyType = (node as any).type as string;
    if (legacyType === 'EVENT_INTERNAL') {
        return { type: ElementType.DomainEvent };
    } else if (legacyType === 'EVENT_EXTERNAL') {
        return { type: ElementType.IntegrationEvent };
    }
    return null;
}

export function normalizeAttributes(definition: DataDefinition): DataDefinition['attributes'] | null {
    if (!definition.attributes || !Array.isArray(definition.attributes)) return null;

    let hasChanges = false;
    const newAttributes = definition.attributes.map(attr => {
        const lowerType = attr.type.toLowerCase();
        const normalizedType = TYPE_MAPPINGS[lowerType];

        if (normalizedType && attr.type !== normalizedType) {
            hasChanges = true;
            return { ...attr, type: normalizedType };
        }
        return attr;
    });

    return hasChanges ? newAttributes : null;
}
