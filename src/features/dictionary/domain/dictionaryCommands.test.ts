import { vi, describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../../shared/events/eventBus';
import gunService from '../../collaboration/store/gunClient';
import { initDictionaryCommands } from './dictionaryCommands';
import { DefinitionType } from '../../modeling/domain/types';
import { useModelingData } from '../../modeling/store/modelingStore';

// Mock Modules
vi.mock('../../collaboration/store/gunClient', () => ({
    default: {
        getModel: vi.fn(),
    }
}));

vi.mock('../../../shared/utils/modelUtils', () => ({
    getModelId: () => 'test-model-id'
}));

describe('DictionaryCommands', () => {
    let mockPut: any;
    let mockGet: any;
    let mockModelRoot: any;

    beforeEach(() => {
        vi.clearAllMocks();
        bus.all.clear();

        // Reset Zustand store
        useModelingData.getState().setDefinitions([]);

        mockPut = vi.fn();
        mockGet = vi.fn().mockReturnValue({ put: mockPut });
        mockModelRoot = {
            get: vi.fn().mockImplementation((key) => {
                if (key === 'definitions') return { get: mockGet };
                return { get: mockGet };
            })
        };

        (gunService.getModel as any).mockReturnValue(mockModelRoot);

        initDictionaryCommands();
    });

    it('should persist new definition with serialized attributes', () => {
        const cmd = {
            id: 'def-123',
            name: 'User',
            type: DefinitionType.Entity,
            attributes: [{ name: 'email', type: 'String' }]
        };

        bus.emit('command:createDefinition', cmd);

        expect(gunService.getModel).toHaveBeenCalledWith('test-model-id');
        expect(mockModelRoot.get).toHaveBeenCalledWith('definitions');
        expect(mockGet).toHaveBeenCalledWith('def-123');
        expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
            name: 'User',
            attributes: JSON.stringify([{ name: 'email', type: 'String' }])
        }));
    });

    it('should not double-stringify attributes if they are already a string', () => {
        const cmd = {
            id: 'def-456',
            name: 'Order',
            type: DefinitionType.ValueObject,
            attributes: JSON.stringify([{ name: 'id', type: 'String' }])
        } as any;

        bus.emit('command:createDefinition', cmd);

        expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
            attributes: JSON.stringify([{ name: 'id', type: 'String' }])
        }));
    });

    it('should handle partial updates and serialize attributes if present', () => {
        // First add a definition to the store
        useModelingData.getState().setDefinitions([{
            id: 'def-789',
            name: 'Payment',
            type: DefinitionType.Entity,
            attributes: []
        }]);

        const cmd = {
            id: 'def-789',
            changes: {
                attributes: [{ name: 'amount', type: 'Decimal' }]
            }
        };

        bus.emit('command:updateDefinition', cmd);

        expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
            attributes: JSON.stringify([{ name: 'amount', type: 'Decimal' }])
        }));
    });

    it('should persist deletion by putting null to GunDB', () => {
        useModelingData.getState().setDefinitions([{
            id: 'def-delete',
            name: 'OldDef',
            type: DefinitionType.Entity,
            attributes: []
        }]);

        bus.emit('command:deleteDefinition', { id: 'def-delete' });

        expect(mockGet).toHaveBeenCalledWith('def-delete');
        expect(mockPut).toHaveBeenCalledWith(null);
    });
});
