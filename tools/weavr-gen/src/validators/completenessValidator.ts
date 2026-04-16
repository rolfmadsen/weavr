/**
 * Completeness Validator
 * 
 * Validates Information Completeness (field lineage):
 * "No data appears out of thin air."
 * 
 * For each field on a Screen, traces backward through the dependency chain
 * to ensure it originates from a user input or a known source.
 */
import type { Slice, ModelingElement, ValidationResult, ValidationIssue } from '../types.js';

/**
 * Build a reverse dependency map: targetId → sourceElements[]
 */
function buildIncomingMap(slice: Slice): Map<string, ModelingElement[]> {
  const incoming = new Map<string, ModelingElement[]>();

  const allElements = [
    ...slice.commands,
    ...slice.events,
    ...slice.readmodels,
    ...slice.screens,
    ...slice.processors,
  ];

  // Build element lookup
  const elementMap = new Map<string, ModelingElement>();
  for (const el of allElements) {
    elementMap.set(el.id, el);
  }

  // For every OUTBOUND dependency, register the source element
  // as "incoming" to the target
  for (const el of allElements) {
    for (const dep of el.dependencies) {
      if (dep.type === 'OUTBOUND') {
        const list = incoming.get(dep.id) || [];
        list.push(el);
        incoming.set(dep.id, list);
      }
    }
  }

  return incoming;
}

/**
 * Validate field completeness for screens:
 * Every field on a Screen should be traceable to a ReadModel or other source
 */
export function validateCompleteness(slice: Slice): ValidationResult {
  const issues: ValidationIssue[] = [];
  const incoming = buildIncomingMap(slice);

  // 1. Screen field validation: fields should come from ReadModels
  for (const screen of slice.screens) {
    const screenFields = screen.fields || [];
    if (screenFields.length === 0) continue;

    // Find incoming ReadModels
    const sources = incoming.get(screen.id) || [];
    const readModelSources = sources.filter(s => s.type === 'READMODEL');

    if (readModelSources.length === 0 && screenFields.length > 0) {
      issues.push({
        severity: 'warning',
        rule: 'completeness-no-source',
        message: `Screen "${screen.title}" has ${screenFields.length} fields but no incoming ReadModel connection`,
        path: `screens/${screen.id}`,
        suggestion: 'Connect a ReadModel to this Screen to establish data lineage',
      });
      continue;
    }

    // Collect all available fields from incoming ReadModels
    const availableFields = new Set<string>();
    for (const rm of readModelSources) {
      for (const f of (rm.fields || [])) {
        availableFields.add(f.name);
      }
    }

    // Check each screen field
    for (const field of screenFields) {
      if (!availableFields.has(field.name)) {
        issues.push({
          severity: 'warning',
          rule: 'completeness-field',
          message: `Field '${field.name}' on Screen "${screen.title}" has no matching field in incoming ReadModels`,
          path: `screens/${screen.id}/fields/${field.name}`,
          suggestion: `Add '${field.name}' to the ReadModel that feeds this Screen, or mark the field as an input (role: 'input')`,
        });
      }
    }
  }

  // 2. Event field validation: fields should come from Commands
  for (const event of slice.events) {
    const eventFields = event.fields || [];
    if (eventFields.length === 0) continue;

    const sources = incoming.get(event.id) || [];
    const commandSources = sources.filter(s => s.type === 'COMMAND');

    if (commandSources.length === 0) continue; // May be from automation or integration

    const availableFields = new Set<string>();
    for (const cmd of commandSources) {
      for (const f of (cmd.fields || [])) {
        availableFields.add(f.name);
      }
    }

    for (const field of eventFields) {
      // Skip technical/generated fields
      if (field.technicalAttribute || field.generated || field.idAttribute) continue;

      if (!availableFields.has(field.name)) {
        issues.push({
          severity: 'info',
          rule: 'completeness-event-field',
          message: `Field '${field.name}' on Event "${event.title}" has no matching field in incoming Commands (may be generated)`,
          path: `events/${event.id}/fields/${field.name}`,
        });
      }
    }
  }

  // 3. ReadModel field validation: fields should come from Events
  for (const rm of slice.readmodels) {
    const rmFields = rm.fields || [];
    if (rmFields.length === 0) continue;

    const sources = incoming.get(rm.id) || [];
    const eventSources = sources.filter(s => s.type === 'EVENT');

    if (eventSources.length === 0) continue;

    const availableFields = new Set<string>();
    for (const evt of eventSources) {
      for (const f of (evt.fields || [])) {
        availableFields.add(f.name);
      }
    }

    for (const field of rmFields) {
      if (!availableFields.has(field.name)) {
        issues.push({
          severity: 'info',
          rule: 'completeness-readmodel-field',
          message: `Field '${field.name}' on ReadModel "${rm.title}" has no matching field in incoming Events`,
          path: `readmodels/${rm.id}/fields/${field.name}`,
        });
      }
    }
  }

  // 4. Command source validation: commands should come from Screens or Processors
  for (const command of slice.commands) {
    const sources = incoming.get(command.id) || [];
    const hasValidSource = sources.some(s => s.type === 'SCREEN' || s.type === 'AUTOMATION');

    if (!hasValidSource) {
      issues.push({
        severity: 'warning',
        rule: 'completeness-command-source',
        message: `Command "${command.title}" has no parent Screen or Automation`,
        path: `commands/${command.id}`,
        suggestion: 'Connect this Command from a Screen (UI) or an Automation (System trigger)',
      });
    }
  }

  return {
    valid: true, // Completeness issues are warnings/info, not hard failures
    issues,
  };
}
