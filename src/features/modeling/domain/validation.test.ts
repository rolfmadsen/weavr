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
});
