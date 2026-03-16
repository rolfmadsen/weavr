import { describe, it, expect } from 'vitest';
import { flattenDefinitions, filterItems } from './useFlattenedDictionary';
import { DataDefinition, DefinitionType } from '../../modeling/domain/types';

const makeDefinition = (overrides: Partial<DataDefinition> & { id: string; name: string }): DataDefinition => ({
  type: DefinitionType.Entity,
  attributes: [],
  ...overrides,
});

describe('flattenDefinitions', () => {
  it('returns empty array for empty definitions', () => {
    expect(flattenDefinitions([])).toEqual([]);
  });

  it('emits 1 entity item + N attribute items per non-aggregate definition', () => {
    const defs: DataDefinition[] = [
      makeDefinition({
        id: 'user-1',
        name: 'User',
        attributes: [
          { name: 'email', type: 'String' },
          { name: 'age', type: 'Int' },
          { name: 'active', type: 'Boolean' },
        ],
      }),
    ];
    const items = flattenDefinitions(defs);
    expect(items).toHaveLength(4); // 1 entity + 3 attributes
    expect(items[0]).toMatchObject({ kind: 'entity', name: 'User', entityId: 'user-1' });
    expect(items[1]).toMatchObject({ kind: 'attribute', name: 'email', parentName: 'User', isOrphan: false });
    expect(items[2]).toMatchObject({ kind: 'attribute', name: 'age', parentName: 'User', isOrphan: false });
    expect(items[3]).toMatchObject({ kind: 'attribute', name: 'active', parentName: 'User', isOrphan: false });
  });

  it('excludes Aggregate definitions from results', () => {
    const defs: DataDefinition[] = [
      makeDefinition({ id: 'agg-1', name: 'OrderAggregate', type: DefinitionType.Aggregate }),
      makeDefinition({
        id: 'entity-1',
        name: 'Order',
        parentId: 'agg-1',
        attributes: [{ name: 'orderId', type: 'UUID' }],
      }),
    ];
    const items = flattenDefinitions(defs);
    // Should only contain Order entity + its attribute, not the Aggregate
    expect(items.filter(i => i.kind === 'entity')).toHaveLength(1);
    expect(items.find(i => i.kind === 'entity')!.name).toBe('Order');
  });

  it('detects orphan definitions (single self-named attribute, no parent)', () => {
    const defs: DataDefinition[] = [
      makeDefinition({
        id: 'orphan-1',
        name: 'passengerAge',
        type: DefinitionType.Entity,
        attributes: [{ name: 'passengerAge', type: 'Int' }],
      }),
    ];
    const items = flattenDefinitions(defs);
    const attr = items.find(i => i.kind === 'attribute');
    expect(attr).toBeDefined();
    expect(attr!).toMatchObject({
      kind: 'attribute',
      name: 'passengerAge',
      isOrphan: true,
      parentEntityId: null,
      parentName: null,
    });
  });

  it('does NOT mark as orphan if definition has a parentId', () => {
    const defs: DataDefinition[] = [
      makeDefinition({
        id: 'child-1',
        name: 'Status',
        parentId: 'agg-123',
        attributes: [{ name: 'Status', type: 'String' }],
      }),
    ];
    const items = flattenDefinitions(defs);
    const attr = items.find(i => i.kind === 'attribute');
    expect(attr!).toMatchObject({ isOrphan: false, parentEntityId: 'child-1', parentName: 'Status' });
  });

  it('handles definitions with null/undefined attributes gracefully', () => {
    const defs: DataDefinition[] = [
      makeDefinition({ id: 'empty-1', name: 'EmptyEntity', attributes: null }),
      makeDefinition({ id: 'empty-2', name: 'NoAttrs', attributes: undefined }),
    ];
    const items = flattenDefinitions(defs);
    // Should emit entity items but no attribute items
    expect(items).toHaveLength(2);
    expect(items.every(i => i.kind === 'entity')).toBe(true);
  });
});

describe('filterItems', () => {
  const items = flattenDefinitions([
    makeDefinition({
      id: 'user-1',
      name: 'User',
      attributes: [
        { name: 'email', type: 'String' },
        { name: 'fullName', type: 'String' },
      ],
    }),
    makeDefinition({
      id: 'order-1',
      name: 'Order',
      attributes: [
        { name: 'orderId', type: 'UUID' },
        { name: 'totalAmount', type: 'Decimal' },
      ],
    }),
  ]);

  it('returns all items when query is empty', () => {
    expect(filterItems(items, '')).toEqual(items);
    expect(filterItems(items, '   ')).toEqual(items);
  });

  it('filters by item name (case-insensitive)', () => {
    const result = filterItems(items, 'email');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'attribute', name: 'email' });
  });

  it('filters entities by name', () => {
    const result = filterItems(items, 'order');
    // Matches entity "Order" + attributes "orderId", "totalAmount" doesn't match
    const entityMatches = result.filter(i => i.kind === 'entity');
    expect(entityMatches).toHaveLength(1);
    expect(entityMatches[0].name).toBe('Order');
  });

  it('filters attributes by parent name', () => {
    const result = filterItems(items, 'user');
    // "User" entity + "email" (parent=User) + "fullName" (parent=User)
    expect(result).toHaveLength(3);
  });
});
