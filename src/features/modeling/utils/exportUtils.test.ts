import { describe, it, expect } from 'vitest';
import { exportWeavrProject, importWeavrProject } from './exportUtils';
import { DefinitionType, DataDefinition } from '../types';

describe('exportUtils Data Dictionary', () => {
    const mockNodes: any[] = [];
    const mockLinks: any[] = [];
    const mockSlices: any[] = [];
    const mockEdgeRoutes = new Map();

    it('should export Data Dictionary with Enums', () => {
        const definitions: DataDefinition[] = [
            {
                id: '1',
                name: 'OrderStatus',
                type: DefinitionType.Enum,
                description: 'Status of an order',
                attributes: [
                    { name: 'Pending', type: 'String' },
                    { name: 'Shipped', type: 'String' }
                ]
            }
        ];

        const json = exportWeavrProject(mockNodes, mockLinks, mockSlices, mockEdgeRoutes, 'model-1', 'Test', 'WEAVR', definitions);

        expect(json.dataDictionary).toBeDefined();
        expect(json.dataDictionary.definitions['OrderStatus']).toBeDefined();
        expect(json.dataDictionary.definitions['OrderStatus'].type).toBe('string');
        expect(json.dataDictionary.definitions['OrderStatus'].enum).toEqual(['Pending', 'Shipped']);
    });

    it('should export Data Dictionary with Entities', () => {
        const definitions: DataDefinition[] = [
            {
                id: '2',
                name: 'Customer',
                type: DefinitionType.Entity,
                description: 'A customer',
                attributes: [
                    { name: 'name', type: 'String' },
                    { name: 'age', type: 'Int' }
                ]
            }
        ];

        const json = exportWeavrProject(mockNodes, mockLinks, mockSlices, mockEdgeRoutes, 'model-1', 'Test', 'WEAVR', definitions);

        expect(json.dataDictionary.definitions['Customer']).toBeDefined();
        expect(json.dataDictionary.definitions['Customer'].type).toBe('object');
        expect(json.dataDictionary.definitions['Customer'].properties['name'].type).toBe('string');
        expect(json.dataDictionary.definitions['Customer'].properties['age'].type).toBe('integer');
    });

    it('should import Data Dictionary', () => {
        const json = {
            meta: {
                version: "1.0.0",
                generator: "Weavr",
                createdAt: "2023-01-01T00:00:00.000Z",
                updatedAt: "2023-01-01T00:00:00.000Z",
                projectId: "model-1",
                projectName: "Test"
            },
            eventModel: { slices: [] },
            layout: {},
            dataDictionary: {
                definitions: {
                    'OrderStatus': {
                        type: 'string',
                        enum: ['Pending', 'Shipped'],
                        title: 'OrderStatus'
                    },
                    'Customer': {
                        type: 'object',
                        title: 'Customer',
                        properties: {
                            'name': { type: 'string' },
                            'age': { type: 'integer' }
                        }
                    }
                }
            }
        };

        const result = importWeavrProject(json);

        expect(result.definitions).toBeDefined();
        expect(result.definitions?.length).toBe(2);

        const orderStatus = result.definitions?.find(d => d.name === 'OrderStatus');
        expect(orderStatus?.type).toBe(DefinitionType.Enum);
        expect(orderStatus?.attributes).toHaveLength(2);
        expect(orderStatus?.attributes?.[0].name).toBe('Pending');

        const customer = result.definitions?.find(d => d.name === 'Customer');
        // Type deduction logic in importWeavrProject defaults to Entity if not Enum/String
        expect(customer?.type).toBe(DefinitionType.Entity);
        expect(customer?.attributes).toHaveLength(2);
        expect(customer?.attributes?.find(a => a.name === 'age')?.type).toBe('Int');
    });
});
