import { describe, it, expect } from 'vitest';
import validationService from './validation';
import { Node, ElementType } from './types';

describe('ValidationService', () => {
    const createNode = (type: ElementType): Node => ({
        id: 'test-id',
        type,
        name: 'Test Node',
        description: 'Test Description',
        x: 0,
        y: 0,
    });

    describe('isValidConnection', () => {
        it('should validate Screen -> Command', () => {
            const source = createNode(ElementType.Screen);
            const target = createNode(ElementType.Command);
            expect(validationService.isValidConnection(source, target)).toBe(true);
        });

        it('should validate Command -> DomainEvent', () => {
            const source = createNode(ElementType.Command);
            const target = createNode(ElementType.DomainEvent);
            expect(validationService.isValidConnection(source, target)).toBe(true);
        });

        it('should validate DomainEvent -> ReadModel', () => {
            const source = createNode(ElementType.DomainEvent);
            const target = createNode(ElementType.ReadModel);
            expect(validationService.isValidConnection(source, target)).toBe(true);
        });

        it('should validate ReadModel -> Screen', () => {
            const source = createNode(ElementType.ReadModel);
            const target = createNode(ElementType.Screen);
            expect(validationService.isValidConnection(source, target)).toBe(true);
        });

        it('should invalidate Screen -> Screen', () => {
            const source = createNode(ElementType.Screen);
            const target = createNode(ElementType.Screen);
            expect(validationService.isValidConnection(source, target)).toBe(false);
        });

        it('should invalidate Command -> Screen', () => {
            const source = createNode(ElementType.Command);
            const target = createNode(ElementType.Screen);
            expect(validationService.isValidConnection(source, target)).toBe(false);
        });

        it('should validate Automation -> Command', () => {
            const source = createNode(ElementType.Automation);
            const target = createNode(ElementType.Command);
            expect(validationService.isValidConnection(source, target)).toBe(true);
        });

        // Strict Mode Tests
        it('should validate IntegrationEvent -> ReadModel', () => {
            const source = createNode(ElementType.IntegrationEvent);
            const target = createNode(ElementType.ReadModel);
            expect(validationService.isValidConnection(source, target)).toBe(true);
        });

        it('should validate IntegrationEvent -> Automation (Translation Pattern)', () => {
            const source = createNode(ElementType.IntegrationEvent);
            const target = createNode(ElementType.Automation);
            expect(validationService.isValidConnection(source, target)).toBe(true);
        });

        it('should validate Command -> IntegrationEvent', () => {
            const source = createNode(ElementType.Command);
            const target = createNode(ElementType.IntegrationEvent);
            expect(validationService.isValidConnection(source, target)).toBe(true);
        });
    });


    describe('getConnectionRule', () => {
        it('should return the correct rule for Screen -> Command', () => {
            const source = createNode(ElementType.Screen);
            const target = createNode(ElementType.Command);
            const rule = validationService.getConnectionRule(source, target);
            expect(rule).toBeDefined();
            expect(rule?.verb).toBe('triggers');
        });

        it('should return undefined for invalid connection', () => {
            const source = createNode(ElementType.Screen);
            const target = createNode(ElementType.Screen);
            const rule = validationService.getConnectionRule(source, target);
            expect(rule).toBeUndefined();
        });
    });

    describe('validateCompleteness', () => {
        it('should return valid if ReadModel has no required fields', () => {
            const node = createNode(ElementType.ReadModel);
            const result = validationService.validateCompleteness(node, [], []);
            expect(result.isValid).toBe(true);
        });

        it('should fail if ReadModel has required fields but no source DomainEvents', () => {
            const node = createNode(ElementType.ReadModel);
            node.fields = [{ name: 'total', type: 'number', required: true }];

            const result = validationService.validateCompleteness(node, [], []);
            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('total');
        });

        it('should pass if ReadModel required fields are present in source DomainEvents', () => {
            const eventNode = createNode(ElementType.DomainEvent);
            eventNode.id = 'event-1';
            eventNode.fields = [{ name: 'total', type: 'number', required: false }];

            const readNode = createNode(ElementType.ReadModel);
            readNode.fields = [{ name: 'total', type: 'number', required: true }];

            const links = [{ id: 'link-1', source: 'event-1', target: readNode.id, label: '' }];

            const result = validationService.validateCompleteness(readNode, links, [eventNode]);
            expect(result.isValid).toBe(true);
        });

        it('should fail if ReadModel required fields are NOT in source DomainEvents', () => {
            const eventNode = createNode(ElementType.DomainEvent);
            eventNode.id = 'event-1';
            eventNode.fields = [{ name: 'other', type: 'string', required: false }];

            const readNode = createNode(ElementType.ReadModel);
            readNode.fields = [{ name: 'total', type: 'number', required: true }];

            const links = [{ id: 'link-1', source: 'event-1', target: readNode.id, label: '' }];

            const result = validationService.validateCompleteness(readNode, links, [eventNode]);
            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('total');
        });

        it('should pass Command validation if connected to Screen (User Input assumed)', () => {
            const screenNode = createNode(ElementType.Screen);
            screenNode.id = 'screen-1';
            // Now requires explicit fields to pass strict validation
            screenNode.fields = [{ name: 'amount', type: 'number', required: true }];

            const cmdNode = createNode(ElementType.Command);
            cmdNode.fields = [{ name: 'amount', type: 'number', required: true }];

            const links = [{ id: 'link-1', source: 'screen-1', target: cmdNode.id, label: '' }];

            const result = validationService.validateCompleteness(cmdNode, links, [screenNode]);
            expect(result.isValid).toBe(true);
        });

        it('should pass Command validation if Automation provides required input', () => {
            const automationNode = createNode(ElementType.Automation);
            automationNode.id = 'auto-1';
            automationNode.fields = [{ name: 'amount', type: 'number', required: true }];

            const cmdNode = createNode(ElementType.Command);
            cmdNode.fields = [{ name: 'amount', type: 'number', required: true }];

            const links = [{ id: 'link-1', source: 'auto-1', target: cmdNode.id, label: '' }];

            const result = validationService.validateCompleteness(cmdNode, links, [automationNode]);
            expect(result.isValid).toBe(true);
        });

        it('should fail Command validation if Automation input is missing required fields', () => {
            const automationNode = createNode(ElementType.Automation);
            automationNode.id = 'auto-1';
            automationNode.fields = [{ name: 'other', type: 'string', required: false }];

            const cmdNode = createNode(ElementType.Command);
            cmdNode.fields = [{ name: 'amount', type: 'number', required: true }];

            const links = [{ id: 'link-1', source: 'auto-1', target: cmdNode.id, label: '' }];

            const result = validationService.validateCompleteness(cmdNode, links, [automationNode]);
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('is missing data from');
        });

        it('should validate IntegrationEvent sourcing from Automation', () => {
            const autoNode = createNode(ElementType.Automation);
            autoNode.id = 'auto-1';
            autoNode.fields = [{ name: 'data', type: 'string', required: false }];

            const eventNode = createNode(ElementType.IntegrationEvent);
            eventNode.fields = [{ name: 'data', type: 'string', required: true }];

            const links = [{ id: 'link-1', source: 'auto-1', target: eventNode.id, label: '' }];

            const result = validationService.validateCompleteness(eventNode, links, [autoNode]);
            expect(result.isValid).toBe(true);
        });

        it('should fail Automation validation if ReadModel is missing required fields', () => {
            const rmNode = createNode(ElementType.ReadModel);
            rmNode.id = 'rm-1';
            rmNode.fields = [{ name: 'id', type: 'string', required: false }];

            const autoNode = createNode(ElementType.Automation);
            autoNode.fields = [{ name: 'name', type: 'string', required: true }];

            const links = [{ id: 'link-1', source: 'rm-1', target: autoNode.id, label: '' }];

            const result = validationService.validateCompleteness(autoNode, links, [rmNode]);
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('is missing data from');
        });


        it('should pass Automation validation if ReadModel provides required fields', () => {
            const rmNode = createNode(ElementType.ReadModel);
            rmNode.id = 'rm-1';
            rmNode.fields = [{ name: 'name', type: 'string', required: false }];

            const autoNode = createNode(ElementType.Automation);
            autoNode.fields = [{ name: 'name', type: 'string', required: true }];

            const links = [{ id: 'link-1', source: 'rm-1', target: autoNode.id, label: '' }];

            const result = validationService.validateCompleteness(autoNode, links, [rmNode]);
            expect(result.isValid).toBe(true);
        });

        it('should fail Screen validation if ReadModel is missing required fields', () => {
            const rmNode = createNode(ElementType.ReadModel);
            rmNode.id = 'rm-1';
            rmNode.fields = [{ name: 'other', type: 'string' }];

            const screenNode = createNode(ElementType.Screen);
            screenNode.fields = [{ name: 'title', type: 'string', required: true, role: 'display' }];

            const links = [{ id: 'link-1', source: 'rm-1', target: screenNode.id, label: '' }];

            const result = validationService.validateCompleteness(screenNode, links, [rmNode]);
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('is missing data from');
        });

        it('should fail for Unlinked node with required fields', () => {
            const cmdNode = createNode(ElementType.Command);
            cmdNode.fields = [{ name: 'amount', type: 'number', required: true }];

            const result = validationService.validateCompleteness(cmdNode, [], []);
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('is missing a data source');
        });

        it('should pass for Integration Event as root source (no incoming links)', () => {
            const eventNode = createNode(ElementType.IntegrationEvent);
            eventNode.fields = [{ name: 'externalId', type: 'string', required: true }];

            const result = validationService.validateCompleteness(eventNode, [], []);
            expect(result.isValid).toBe(true); // Root sources are valid without lineage
        });
    });

    describe('Strict Entity Validation (Definition Binding)', () => {
        // Helper to create nodes with bound definitions
        const createBoundNode = (type: ElementType, id: string, fieldName: string, defId: string) => {
            const node = createNode(type);
            node.id = id;
            node.fields = [{
                name: fieldName,
                type: 'string',
                required: true,
                definitionId: defId
            }];
            return node;
        };

        it('should FAIL Validation if Automation provides wrong Entity type to Command', () => {
            // Context: Automation outputs 'Person' (def-1), Command wants 'OrgPerson' (def-2)
            const autoNode = createBoundNode(ElementType.Automation, 'auto-1', 'name', 'def-1');
            const cmdNode = createBoundNode(ElementType.Command, 'cmd-1', 'name', 'def-2');

            const links = [{ id: 'l1', source: autoNode.id, target: cmdNode.id, label: '' }];
            const result = validationService.validateCompleteness(cmdNode, links, [autoNode]);

            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('name');
        });

        it('should FAIL Validation if Screen provides wrong Entity type to Command', () => {
            // Context: Screen has 'Person' input (def-1), Command wants 'OrgPerson' (def-2)
            const screenNode = createBoundNode(ElementType.Screen, 'screen-1', 'name', 'def-1');
            const cmdNode = createBoundNode(ElementType.Command, 'cmd-1', 'name', 'def-2');

            const links = [{ id: 'l1', source: screenNode.id, target: cmdNode.id, label: '' }];
            const result = validationService.validateCompleteness(cmdNode, links, [screenNode]);

            expect(result.isValid).toBe(false);
        });

        it('should PASS Validation if Screen provides correct Entity type to Command', () => {
            // Context: Screen has 'Person' (def-1), Command wants 'Person' (def-1)
            const screenNode = createBoundNode(ElementType.Screen, 'screen-1', 'name', 'def-1');
            const cmdNode = createBoundNode(ElementType.Command, 'cmd-1', 'name', 'def-1');

            const links = [{ id: 'l1', source: screenNode.id, target: cmdNode.id, label: '' }];
            const result = validationService.validateCompleteness(cmdNode, links, [screenNode]);

            expect(result.isValid).toBe(true);
        });

        it('should FAIL Validation if IntegrationEvent provides wrong Entity type to Automation', () => {
            // Context: Event has 'LegacyData' (def-A), Automation wants 'NewData' (def-B)
            const eventNode = createBoundNode(ElementType.IntegrationEvent, 'evt-1', 'data', 'def-A');
            const autoNode = createBoundNode(ElementType.Automation, 'auto-1', 'data', 'def-B');

            const links = [{ id: 'l1', source: eventNode.id, target: autoNode.id, label: '' }];
            const result = validationService.validateCompleteness(autoNode, links, [eventNode]);

            expect(result.isValid).toBe(false);
        });
    });
});



