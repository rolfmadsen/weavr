/**
 * Connection Rule Validator
 * 
 * Validates that all dependencies (links) between elements follow
 * the Weavr Modeling Alphabet rules from validation.ts.
 */
import type { Slice, ValidationResult, ValidationIssue, ConnectionRule } from '../types.js';

/**
 * The canonical connection rules — ported from
 * src/features/modeling/domain/validation.ts
 */
const CONNECTION_RULES: ConnectionRule[] = [
  // State Change & State View patterns
  { source: 'SCREEN', target: 'COMMAND', verb: 'triggers', description: 'A user interaction on a screen triggers a command.' },
  { source: 'COMMAND', target: 'EVENT', verb: 'results in', description: 'A successful command results in one or more domain events.' },
  { source: 'EVENT', target: 'READMODEL', verb: 'populates', description: 'Domain events are used to build and update read models.' },
  { source: 'READMODEL', target: 'SCREEN', verb: 'is displayed on', description: 'Data from a read model is displayed on a screen.' },

  // Automation & Translation patterns
  { source: 'AUTOMATION', target: 'COMMAND', verb: 'issues', description: 'An automation issues a command to perform a system action.' },
  { source: 'EVENT', target: 'AUTOMATION', verb: 'triggers', description: 'A domain event triggers an automation process.' },
  { source: 'EVENT', target: 'EVENT', verb: 'triggers', description: 'An integration event triggers a translation process.' }, // IE→Automation is IE(EVENT)→AUTO
  { source: 'READMODEL', target: 'AUTOMATION', verb: 'informs', description: 'A read model provides data to inform an automation.' },

  // Integration Event connections  
  { source: 'EVENT', target: 'READMODEL', verb: 'populates', description: 'Data from an integration event can populate a read model.' },
  { source: 'READMODEL', target: 'EVENT', verb: 'triggers', description: 'A read model triggers an integration event.' },
  { source: 'COMMAND', target: 'EVENT', verb: 'results in', description: 'A command results in an external integration event.' },
];

/**
 * Check if a connection from sourceType → targetType is valid
 */
function isValidConnection(sourceType: string, targetType: string): ConnectionRule | undefined {
  return CONNECTION_RULES.find(rule =>
    rule.source === sourceType && rule.target === targetType
  );
}

/**
 * Build a map of element ID → element type for quick lookup within a slice
 */
function buildElementTypeMap(slice: Slice): Map<string, string> {
  const map = new Map<string, string>();

  for (const el of slice.commands) map.set(el.id, el.type);
  for (const el of slice.events) map.set(el.id, el.type);
  for (const el of slice.readmodels) map.set(el.id, el.type);
  for (const el of slice.screens) map.set(el.id, el.type);
  for (const el of slice.processors) map.set(el.id, el.type);

  return map;
}

/**
 * Validate all dependencies within a slice follow the connection rules.
 */
export function validateConnections(slice: Slice): ValidationResult {
  const issues: ValidationIssue[] = [];
  const elementMap = buildElementTypeMap(slice);

  const allElements = [
    ...slice.commands,
    ...slice.events,
    ...slice.readmodels,
    ...slice.screens,
    ...slice.processors,
  ];

  for (const element of allElements) {
    for (const dep of element.dependencies) {
      if (dep.type !== 'OUTBOUND') continue;

      const sourceType = element.type;
      const targetType = dep.elementType;

      const rule = isValidConnection(sourceType, targetType);

      if (!rule) {
        issues.push({
          severity: 'error',
          rule: 'connection',
          message: `Forbidden connection: ${element.title} (${sourceType}) → ${dep.title || dep.id} (${targetType})`,
          path: `elements/${element.id}/dependencies/${dep.id}`,
          suggestion: `Valid targets for ${sourceType}: ${CONNECTION_RULES.filter(r => r.source === sourceType).map(r => r.target).join(', ')}`,
        });
      }

      // Check if target element actually exists in the slice
      if (!elementMap.has(dep.id)) {
        issues.push({
          severity: 'warning',
          rule: 'connection-ref',
          message: `Dependency target '${dep.id}' in ${element.title} not found in this slice (may be cross-slice reference)`,
          path: `elements/${element.id}/dependencies/${dep.id}`,
        });
      }
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * Export the rules for use in prompts / docs
 */
export function getConnectionRules(): readonly ConnectionRule[] {
  return CONNECTION_RULES;
}
