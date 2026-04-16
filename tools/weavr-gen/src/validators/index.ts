/**
 * Validator Orchestrator
 * 
 * Runs all 5 validators and produces a unified report.
 */
import { validateSliceSchema, validateProjectSchema } from './schemaValidator.js';
import { validateConnections } from './connectionValidator.js';
import { validatePattern } from './patternValidator.js';
import { validateSpecifications } from './specificationValidator.js';
import { validateCompleteness } from './completenessValidator.js';
import type { Slice, WeavrProject, ValidationResult, ValidationIssue } from '../types.js';
import { green, red, bold, formatSeverity } from '../utils/colors.js';

export interface FullValidationResult {
  valid: boolean;
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  sections: {
    schema: ValidationResult;
    connections: ValidationResult;
    pattern: ValidationResult;
    specifications: ValidationResult;
    completeness: ValidationResult;
    projectWide?: ValidationResult;
  };
  allIssues: ValidationIssue[];
}

/**
 * Validate cross-slice dependencies, duplicate IDs, and Aggregate Root rules.
 */
function validateProjectWideRules(project: WeavrProject): ValidationResult {
  const issues: ValidationIssue[] = [];
  const allElementIds = new Set<string>();
  const idToElementType = new Map<string, string>();
  const allSliceIds = new Set<string>();

  // 1. Traverse everything to collect IDs and find duplicates
  for (const slice of project.eventModel.slices) {
    if (allSliceIds.has(slice.id)) {
      issues.push({
        severity: 'error',
        rule: 'project-duplicate-id',
        message: `Duplicate slice ID found: '${slice.id}'`,
        path: `slices/${slice.id}`
      });
    }
    allSliceIds.add(slice.id);

    const elements = [
      ...slice.commands,
      ...slice.events,
      ...slice.readmodels,
      ...slice.screens,
      ...slice.processors,
      ...(slice.tables || [])
    ];

    for (const el of elements) {
      if (allElementIds.has(el.id)) {
        issues.push({
          severity: 'error',
          rule: 'project-duplicate-id',
          message: `Duplicate element ID found: '${el.id}' (in slice '${slice.title}')`,
          path: `slices/${slice.id}/elements/${el.id}`
        });
      }
      allElementIds.add(el.id);
      idToElementType.set(el.id, ('type' in el) ? (el.type as string) : 'TABLE');
    }
  }

  // 2. Validate cross-slice dependencies (all INBOUND/OUTBOUND must point to existing IDs)
  for (const slice of project.eventModel.slices) {
    const elements = [
      ...slice.commands,
      ...slice.events,
      ...slice.readmodels,
      ...slice.screens,
      ...slice.processors
    ];

    for (const el of elements) {
      for (const dep of el.dependencies || []) {
        if (!allElementIds.has(dep.id)) {
          issues.push({
            severity: 'error',
            rule: 'project-missing-dependency',
            message: `Element '${el.title}' (${el.id}) references missing dependency '${dep.id}'`,
            path: `slices/${slice.id}/${el.id}/dependencies/${dep.id}`
          });
        }
      }
    }
  }

  // 3. Aggregate Root rule enforcement (If Data Dictionary exists)
  if (project.dataDictionary?.definitions) {
    const definitions = Object.values(project.dataDictionary.definitions) as any[];
    
    // Group definitions by their aggregate (either they are an aggregate root, or they belong to one)
    const aggregateMap = new Map<string, { roots: number, members: string[] }>();
    
    // Quick pass to find all aggregates
    for (const def of definitions) {
      if (def.type === 'Aggregate' || def.aggregate) {
        // We use def.aggregate (if it explicitly declares belonging to one) or def.name if it's the Aggregate itself
        const aggName = def.aggregate || def.name;
        if (!aggregateMap.has(aggName)) {
          aggregateMap.set(aggName, { roots: 0, members: [] });
        }
        
        const aggState = aggregateMap.get(aggName)!;
        aggState.members.push(def.name);
        
        if (def.isRoot) {
          aggState.roots += 1;
        }
      }
    }

    // Evaluate root rule
    for (const [aggName, state] of aggregateMap.entries()) {
      if (state.roots === 0) {
        issues.push({
          severity: 'error',
          rule: 'project-aggregate-root',
          message: `Aggregate '${aggName}' has NO root entity (isRoot: true). Exactly one is required.`,
          path: `dataDictionary/definitions`,
          suggestion: `Members found: ${state.members.join(', ')}`
        });
      } else if (state.roots > 1) {
        issues.push({
          severity: 'error',
          rule: 'project-aggregate-root',
          message: `Aggregate '${aggName}' has MULTIPLE root entities (${state.roots}). Exactly one is allowed.`,
          path: `dataDictionary/definitions`
        });
      }
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues
  };
}

/**
 * Run all 5 validators on a single slice
 */
export function validateSlice(slice: Slice): FullValidationResult {
  const schema = validateSliceSchema(slice);
  const connections = validateConnections(slice);
  const pattern = validatePattern(slice);
  const specifications = validateSpecifications(slice);
  const completeness = validateCompleteness(slice);

  const allIssues = [
    ...schema.issues,
    ...connections.issues,
    ...pattern.issues,
    ...specifications.issues,
    ...completeness.issues,
  ];

  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const info = allIssues.filter(i => i.severity === 'info').length;

  return {
    valid: errors === 0,
    summary: { errors, warnings, info },
    sections: { schema, connections, pattern, specifications, completeness },
    allIssues,
  };
}

/**
 * Run all validators on a full Weavr project
 */
export function validateProject(project: WeavrProject): FullValidationResult {
  // First validate the overall schema
  const schemaResult = validateProjectSchema(project);

  // Then validate each slice individually
  const sliceResults: FullValidationResult[] = [];
  for (const slice of project.eventModel.slices) {
    sliceResults.push(validateSlice(slice));
  }

  // Validate Project-Wide rules
  const projectWide = validateProjectWideRules(project);

  // Merge all results
  const allIssues = [
    ...schemaResult.issues,
    ...projectWide.issues,
    ...sliceResults.flatMap(r => r.allIssues),
  ];

  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const info = allIssues.filter(i => i.severity === 'info').length;

  // Build merged section results
  const mergedConnections: ValidationResult = {
    valid: sliceResults.every(r => r.sections.connections.valid),
    issues: sliceResults.flatMap(r => r.sections.connections.issues),
  };
  const mergedPattern: ValidationResult = {
    valid: sliceResults.every(r => r.sections.pattern.valid),
    issues: sliceResults.flatMap(r => r.sections.pattern.issues),
  };
  const mergedSpecs: ValidationResult = {
    valid: sliceResults.every(r => r.sections.specifications.valid),
    issues: sliceResults.flatMap(r => r.sections.specifications.issues),
  };
  const mergedCompleteness: ValidationResult = {
    valid: sliceResults.every(r => r.sections.completeness.valid),
    issues: sliceResults.flatMap(r => r.sections.completeness.issues),
  };

  return {
    valid: errors === 0,
    summary: { errors, warnings, info },
    sections: {
      schema: schemaResult,
      connections: mergedConnections,
      pattern: mergedPattern,
      specifications: mergedSpecs,
      completeness: mergedCompleteness,
      projectWide
    },
    allIssues,
  };
}

/**
 * Format validation results for terminal output
 */
export function formatReport(result: FullValidationResult): string {
  const lines: string[] = [];
  const { summary, sections } = result;

  lines.push('');
  lines.push(result.valid
    ? green(bold('✅ Validation PASSED'))
    : red(bold('❌ Validation FAILED'))
  );
  lines.push(`   ${summary.errors} error(s), ${summary.warnings} warning(s), ${summary.info} info(s)`);
  lines.push('');

  const sectionEntries = Object.entries(sections) as [string, ValidationResult][];
  for (const [name, section] of sectionEntries) {
    if (!section) continue; // Optional sections like projectWide
    
    const icon = section.valid ? green('✅') : red('❌');
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    const issueCount = section.issues.length;
    lines.push(`${icon} ${bold(label)}: ${issueCount === 0 ? 'Valid' : `${issueCount} issue(s)`}`);

    for (const issue of section.issues) {
      lines.push(`  ${formatSeverity(issue.severity)} ${issue.message}`);
      if (issue.path) {
        lines.push(`     path: ${issue.path}`);
      }
      if (issue.suggestion) {
        lines.push(`     💡 ${issue.suggestion}`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

// Re-export individual validators
export { validateSliceSchema, validateProjectSchema } from './schemaValidator.js';
export { validateConnections, getConnectionRules } from './connectionValidator.js';
export { validatePattern, getPatternRules } from './patternValidator.js';
export { validateSpecifications, getSpecStepRules } from './specificationValidator.js';
export { validateCompleteness } from './completenessValidator.js';
