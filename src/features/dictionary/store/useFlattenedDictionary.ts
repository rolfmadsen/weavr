import { useMemo } from 'react';
import { DataDefinition, DefinitionType, Attribute } from '../../modeling/domain/types';

// ─── Public Types ────────────────────────────────────────────────────
export type SearchableItem =
  | SearchableAttribute
  | SearchableEntity;

export interface SearchableAttribute {
  kind: 'attribute';
  name: string;
  parentEntityId: string | null;
  parentName: string | null;
  isOrphan: boolean;
  entityType: DefinitionType;
  attribute: Attribute;
}

export interface SearchableEntity {
  kind: 'entity';
  name: string;
  entityId: string;
  entityType: DefinitionType;
  definition: DataDefinition;
}

// ─── Pure Flatten Logic (exported for testing) ───────────────────────
export function flattenDefinitions(definitions: DataDefinition[]): SearchableItem[] {
  const items: SearchableItem[] = [];

  for (const def of definitions) {
    if (def.type === DefinitionType.Aggregate) continue;

    const attrs = Array.isArray(def.attributes) ? def.attributes : [];

    // Detect "orphan" definitions: no parent, with a single self-named attribute
    const isOrphanDef =
      !def.parentId &&
      attrs.length === 1 &&
      attrs[0].name.toLowerCase() === def.name.toLowerCase();

    // Emit entity item
    items.push({
      kind: 'entity',
      name: def.name,
      entityId: def.id,
      entityType: def.type,
      definition: def,
    });

    // Emit attribute items
    for (const attr of attrs) {
      items.push({
        kind: 'attribute',
        name: attr.name,
        parentEntityId: isOrphanDef ? null : def.id,
        parentName: isOrphanDef ? null : def.name,
        isOrphan: isOrphanDef,
        entityType: def.type,
        attribute: attr,
      });
    }
  }

  return items;
}

// ─── Filter Logic (exported for testing) ─────────────────────────────
export function filterItems(items: SearchableItem[], query: string): SearchableItem[] {
  if (!query.trim()) return items;
  const lower = query.toLowerCase();

  return items.filter((item) => {
    if (item.name.toLowerCase().includes(lower)) return true;
    if (item.kind === 'attribute' && item.parentName?.toLowerCase().includes(lower)) return true;
    return false;
  });
}

// ─── React Hook ──────────────────────────────────────────────────────
export function useFlattenedDictionary(
  definitions: DataDefinition[],
  query: string = ''
) {
  const flatItems = useMemo(() => flattenDefinitions(definitions), [definitions]);

  const filteredItems = useMemo(() => filterItems(flatItems, query), [flatItems, query]);

  const entities = useMemo(
    () => filteredItems.filter((i): i is SearchableEntity => i.kind === 'entity'),
    [filteredItems]
  );

  const attributes = useMemo(
    () => filteredItems.filter((i): i is SearchableAttribute => i.kind === 'attribute'),
    [filteredItems]
  );

  return { flatItems, filteredItems, entities, attributes };
}
