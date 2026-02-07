import { vi, describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../../shared/events/eventBus';
import gunService from '../../collaboration/store/gunClient';
import { initCommandHandler } from './commandHandler';
import { ElementType } from '../domain/types';


// Mock Modules
vi.mock('../../collaboration/store/gunClient', () => ({
    default: {
        getModel: vi.fn(),
    }
}));

vi.mock('../../../shared/utils/modelUtils', () => ({
    getModelId: () => 'test-model-id'
}));

describe('CommandHandler Integration', () => {
    let mockGun: any;
    let mockPut: any;
    let mockContextRef: any;

    beforeEach(() => {
        vi.clearAllMocks();
        bus.all.clear(); // Reset bus listeners

        // Setup Gun Mock Chain
        mockPut = vi.fn();

        // Chain: gun.getModel().get('nodes').get('id').put()
        const mockItemRef = {
            put: mockPut
        };

        mockContextRef = {
            get: vi.fn().mockReturnValue(mockItemRef), // .get('nodeId') -> item
            put: mockPut
        };



        // If command handler uses get('nodes').get(id), we need to ensure get('nodes') returns something that has .get(id)
        mockContextRef.get.mockReturnValue(mockItemRef);

        // Retrying Mock Structure specific to implementation:
        // gun.getModel(id).get('nodes').get(nodeId).put({...})

        const mockNodeItem = { put: mockPut };
        const mockNodesCollection = { get: vi.fn().mockReturnValue(mockNodeItem) };
        const mockModelRoot = {
            get: vi.fn().mockImplementation((key) => {
                if (key === 'nodes') return mockNodesCollection;
                if (key === 'links') return mockNodesCollection; // Reuse for simplicity
                if (key === 'slices') return mockNodesCollection;
                return mockNodesCollection;
            })
        };

        (gunService.getModel as any).mockReturnValue(mockModelRoot);
        mockGun = { mockPut, mockNodesCollection, mockModelRoot };

        // Initialize Handler
        initCommandHandler();
    });

    it('should persist creating a node', () => {
        const cmd = { id: 'node1', type: ElementType.Screen, x: 100, y: 100 };
        bus.emit('command:createNode', cmd);

        expect(gunService.getModel).toHaveBeenCalledWith('test-model-id');
        expect(mockGun.mockModelRoot.get).toHaveBeenCalledWith('nodes');
        expect(mockGun.mockNodesCollection.get).toHaveBeenCalledWith('node1');
        expect(mockGun.mockPut).toHaveBeenCalledWith(expect.objectContaining({
            id: 'node1',
            type: 'SCREEN',
            x: 100,
            y: 100
        }));
    });

    it('should persist creating a link', () => {
        const cmd = { sourceId: 'a', targetId: 'b' };
        // Assuming linkCommands handles ID generation or we pass it? 
        // Let's check initLinkCommands imp. It usually generates ID.
        // Wait, initLinkCommands was "extracted". Let's assume it works.
        // If it generates internal ID, we might not capture it easily unless we spy on `put`.

        bus.emit('command:createLink', cmd);

        expect(gunService.getModel).toHaveBeenCalledWith('test-model-id');
        expect(mockGun.mockModelRoot.get).toHaveBeenCalledWith('links');
        expect(mockGun.mockPut).toHaveBeenCalledWith(expect.objectContaining({
            source: 'a',
            target: 'b'
        }));
    });

    it('should persist updating a node', () => {
        const cmd = { id: 'node1', changes: { x: 200 } };
        bus.emit('command:updateNode', cmd);

        expect(mockGun.mockPut).toHaveBeenCalledWith({ x: 200 });
    });

    it('should persist creating a definition', () => {
        const cmd = { id: 'def1', name: 'User', type: 'Entity', description: 'Test', attributes: [] };
        bus.emit('command:createDefinition', cmd);

        expect(gunService.getModel).toHaveBeenCalledWith('test-model-id');
        expect(mockGun.mockModelRoot.get).toHaveBeenCalledWith('definitions');
        expect(mockGun.mockNodesCollection.get).toHaveBeenCalledWith('def1');
        expect(mockGun.mockPut).toHaveBeenCalledWith(expect.objectContaining({
            id: 'def1',
            name: 'User',
            attributes: '[]' // Should be stringified
        }));
    });

    it('should persist updating a definition', () => {
        const cmd = { id: 'def1', changes: { description: 'Updated' } };
        bus.emit('command:updateDefinition', cmd);

        expect(mockGun.mockPut).toHaveBeenCalledWith({ description: 'Updated' });
    });
});
