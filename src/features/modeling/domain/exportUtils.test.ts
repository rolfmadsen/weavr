import { describe, it, expect } from 'vitest';
import { exportWeavrProject, importWeavrProject, type WeavrExportData } from './exportUtils';
import { DefinitionType, DataDefinition } from './types';

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

        const json = exportWeavrProject(mockNodes, mockLinks, mockSlices, mockEdgeRoutes, 'model-1', 'Test', 'WEAVR', definitions) as WeavrExportData;

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

        const json = exportWeavrProject(mockNodes, mockLinks, mockSlices, mockEdgeRoutes, 'model-1', 'Test', 'WEAVR', definitions) as WeavrExportData;

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

    it('should export and import Slice Chapters', () => {
        const slicesWithChapters: any[] = [
            { id: 's1', title: 'Slice 1', chapter: 'Chapter A' },
            { id: 's2', title: 'Slice 2' } // No chapter
        ];

        const json = exportWeavrProject([], [], slicesWithChapters, mockEdgeRoutes, 'model-chap', 'Chapters', 'WEAVR', []) as WeavrExportData;

        // Verify Export
        const exportedSlices = json.eventModel.slices;
        expect(exportedSlices.find(s => s.id === 's1').chapter).toBe('Chapter A');
        expect(exportedSlices.find(s => s.id === 's2').chapter).toBeUndefined();

        // Verify Import
        const result = importWeavrProject(json);
        expect(result.slices?.['s1']?.chapter).toBe('Chapter A');
        expect(result.slices?.['s2']?.chapter).toBeUndefined();
    });

    it('should export and import Slice Specifications', () => {
        const specStep = { id: 's1', title: 'Step 1', type: 'SPEC_COMMAND' };
        const specs = [{
            id: 'spec1',
            title: 'My Spec',
            given: [],
            when: [specStep],
            then: []
        }];

        const slicesWithSpecs: any[] = [
            { id: 's1', title: 'Slice 1', specifications: specs }
        ];

        const json = exportWeavrProject([], [], slicesWithSpecs, mockEdgeRoutes, 'model-spec', 'Specs', 'WEAVR', []) as WeavrExportData;

        // Verify Export
        const exportedSlices = json.eventModel.slices;
        expect(exportedSlices.find(s => s.id === 's1').specifications).toHaveLength(1);
        expect(exportedSlices.find(s => s.id === 's1').specifications[0].title).toBe('My Spec');

        // Verify Import
        const result = importWeavrProject(json);
        expect(result.slices?.['s1']?.specifications).toHaveLength(1);
        expect(result.slices?.['s1']?.specifications?.[0].title).toBe('My Spec');
    });
});
