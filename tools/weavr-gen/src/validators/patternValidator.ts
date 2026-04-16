/**
 * Pattern Validator
 * 
 * Validates that a slice contains the correct element composition
 * for its declared sliceType (one of the 4 Event Modeling patterns).
 */
import type { Slice, ValidationResult, ValidationIssue, PatternRule, SchemaElementType } from '../types.js';
import { SliceType } from '../types.js';

/**
 * Pattern rules define which element types are required, optional,
 * and forbidden for each of the 4 Event Modeling patterns.
 */
const PATTERN_RULES: Record<string, PatternRule> = {
  [SliceType.StateChange]: {
    required: ['SCREEN', 'COMMAND', 'EVENT', 'READMODEL'],
    requiredFlow: ['SCREEN→COMMAND', 'COMMAND→EVENT', 'EVENT→READMODEL', 'READMODEL→SCREEN'],
    optional: ['AUTOMATION'],
    forbidden: [],
  },
  [SliceType.StateView]: {
    required: ['SCREEN', 'READMODEL'],
    requiredFlow: ['READMODEL→SCREEN'],
    optional: ['EVENT'],
    forbidden: ['COMMAND'],
  },
  [SliceType.Automation]: {
    required: ['AUTOMATION', 'COMMAND', 'EVENT'],
    requiredFlow: ['EVENT→AUTOMATION', 'AUTOMATION→COMMAND', 'COMMAND→EVENT'],
    optional: ['READMODEL'],
    forbidden: ['SCREEN'],
  },
  [SliceType.Integration]: {
    required: ['EVENT', 'AUTOMATION'],
    requiredFlow: ['EVENT→AUTOMATION'],
    optional: ['COMMAND', 'READMODEL'],
    forbidden: [],
  },
};

/**
 * Get which schema-level element types are present in a slice
 */
function getPresentTypes(slice: Slice): Set<SchemaElementType> {
  const types = new Set<SchemaElementType>();
  if (slice.screens.length > 0) types.add('SCREEN');
  if (slice.commands.length > 0) types.add('COMMAND');
  if (slice.events.length > 0) types.add('EVENT');
  if (slice.readmodels.length > 0) types.add('READMODEL');
  if (slice.processors.length > 0) types.add('AUTOMATION');
  return types;
}

/**
 * Build a set of actual flows (dependency connections) present in the slice
 */
function getActualFlows(slice: Slice): Set<string> {
  const flows = new Set<string>();

  const allElements = [
    ...slice.commands,
    ...slice.events,
    ...slice.readmodels,
    ...slice.screens,
    ...slice.processors,
  ];

  // Build ID→type map
  const typeMap = new Map<string, string>();
  for (const el of allElements) {
    typeMap.set(el.id, el.type);
  }

  for (const el of allElements) {
    for (const dep of el.dependencies) {
      if (dep.type === 'OUTBOUND') {
        flows.add(`${el.type}→${dep.elementType}`);
      }
    }
  }

  return flows;
}

/**
 * Validate a slice's element composition against its declared pattern
 */
export function validatePattern(slice: Slice): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!slice.sliceType) {
    issues.push({
      severity: 'warning',
      rule: 'pattern-type',
      message: 'Slice has no sliceType declared — cannot validate pattern composition',
      path: `slices/${slice.id}`,
      suggestion: `Set sliceType to one of: ${Object.values(SliceType).join(', ')}`,
    });
    return { valid: true, issues };
  }

  const rule = PATTERN_RULES[slice.sliceType];
  if (!rule) {
    issues.push({
      severity: 'error',
      rule: 'pattern-type',
      message: `Unknown sliceType: '${slice.sliceType}'`,
      path: `slices/${slice.id}`,
      suggestion: `Valid types: ${Object.values(SliceType).join(', ')}`,
    });
    return { valid: false, issues };
  }

  const presentTypes = getPresentTypes(slice);
  const actualFlows = getActualFlows(slice);

  // Check required element types
  for (const requiredType of rule.required) {
    if (!presentTypes.has(requiredType)) {
      issues.push({
        severity: 'error',
        rule: 'pattern-required',
        message: `Pattern ${slice.sliceType} requires at least one ${requiredType} element`,
        path: `slices/${slice.id}`,
        suggestion: `Add a ${requiredType} element to complete the ${slice.sliceType} pattern`,
      });
    }
  }

  // Check forbidden element types
  for (const forbiddenType of rule.forbidden) {
    if (presentTypes.has(forbiddenType)) {
      issues.push({
        severity: 'warning',
        rule: 'pattern-forbidden',
        message: `Pattern ${slice.sliceType} typically does not include ${forbiddenType} elements`,
        path: `slices/${slice.id}`,
        suggestion: `Consider removing ${forbiddenType} or changing the sliceType`,
      });
    }
  }

  // Check required flows (connections)
  for (const requiredFlow of rule.requiredFlow) {
    if (!actualFlows.has(requiredFlow)) {
      issues.push({
        severity: 'warning',
        rule: 'pattern-flow',
        message: `Pattern ${slice.sliceType} expects flow ${requiredFlow} but it was not found`,
        path: `slices/${slice.id}`,
        suggestion: `Add a dependency connecting ${requiredFlow.replace('→', ' to ')}`,
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * Export pattern rules for use in prompts / docs
 */
export function getPatternRules(): Record<string, PatternRule> {
  return { ...PATTERN_RULES };
}
