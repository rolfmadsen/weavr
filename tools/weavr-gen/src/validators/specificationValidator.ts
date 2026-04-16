/**
 * Specification Validator
 * 
 * Validates Given/When/Then specifications within a slice:
 * - Presence (min 1 spec per slice)
 * - linkedId integrity (references existing elements)
 * - Step type correctness per pattern
 * - Error scenario coverage
 */
import type {
  Slice,
  Specification,
  SpecificationStep,
  ValidationResult,
  ValidationIssue,
  StepTypeConstraints,
} from '../types.js';
import { SliceType } from '../types.js';

/**
 * Step type constraints per Event Modeling pattern.
 * Defines which SPEC_* types are allowed/recommended in each GWT section.
 */
const SPEC_STEP_RULES: Record<string, StepTypeConstraints> = {
  [SliceType.StateChange]: {
    given: {
      allowed: ['SPEC_READMODEL', 'SPEC_EVENT'],
      recommended: ['SPEC_READMODEL'],
    },
    when: {
      allowed: ['SPEC_COMMAND'],
      recommended: ['SPEC_COMMAND'],
    },
    then: {
      allowed: ['SPEC_EVENT', 'SPEC_READMODEL', 'SPEC_ERROR'],
      recommended: ['SPEC_EVENT'],
    },
  },
  [SliceType.StateView]: {
    given: {
      allowed: ['SPEC_EVENT', 'SPEC_READMODEL'],
      recommended: ['SPEC_EVENT'],
    },
    when: {
      allowed: ['SPEC_READMODEL'],
      recommended: ['SPEC_READMODEL'],
    },
    then: {
      allowed: ['SPEC_READMODEL', 'SPEC_ERROR'],
      recommended: ['SPEC_READMODEL'],
    },
  },
  [SliceType.Automation]: {
    given: {
      allowed: ['SPEC_EVENT', 'SPEC_READMODEL'],
      recommended: ['SPEC_EVENT'],
    },
    when: {
      allowed: ['SPEC_COMMAND'],
      recommended: ['SPEC_COMMAND'],
    },
    then: {
      allowed: ['SPEC_EVENT', 'SPEC_READMODEL', 'SPEC_ERROR'],
      recommended: ['SPEC_EVENT'],
    },
  },
  [SliceType.Integration]: {
    given: {
      allowed: ['SPEC_EVENT', 'SPEC_READMODEL'],
      recommended: ['SPEC_EVENT'],
    },
    when: {
      allowed: ['SPEC_COMMAND'],
      recommended: ['SPEC_COMMAND'],
    },
    then: {
      allowed: ['SPEC_EVENT', 'SPEC_READMODEL', 'SPEC_ERROR'],
      recommended: ['SPEC_EVENT'],
    },
  },
};

/**
 * Collect all element IDs in a slice for linkedId validation
 */
function collectElementIds(slice: Slice): Set<string> {
  const ids = new Set<string>();
  for (const el of slice.commands) ids.add(el.id);
  for (const el of slice.events) ids.add(el.id);
  for (const el of slice.readmodels) ids.add(el.id);
  for (const el of slice.screens) ids.add(el.id);
  for (const el of slice.processors) ids.add(el.id);
  return ids;
}

/**
 * Validate a single specification
 */
function validateSpec(
  spec: Specification,
  sliceType: string | undefined,
  elementIds: Set<string>,
  specIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const specPath = `specifications[${specIndex}]`;

  // Rule: linkedId must reference an existing element
  if (spec.linkedId && !elementIds.has(spec.linkedId)) {
    issues.push({
      severity: 'error',
      rule: 'spec-linkedId',
      message: `Specification "${spec.title}" linkedId '${spec.linkedId}' does not match any element in this slice`,
      path: `${specPath}/linkedId`,
      suggestion: `Valid element IDs: ${Array.from(elementIds).join(', ')}`,
    });
  }

  // Rule: When section must not be empty
  if (spec.when.length === 0) {
    issues.push({
      severity: 'error',
      rule: 'spec-when-empty',
      message: `Specification "${spec.title}" has empty 'when' section — the action must be described`,
      path: `${specPath}/when`,
    });
  }

  // Rule: Then section must not be empty
  if (spec.then.length === 0) {
    issues.push({
      severity: 'error',
      rule: 'spec-then-empty',
      message: `Specification "${spec.title}" has empty 'then' section — the expected result must be described`,
      path: `${specPath}/then`,
    });
  }

  // Rule: Given section should not be empty (warning)
  if (spec.given.length === 0) {
    issues.push({
      severity: 'warning',
      rule: 'spec-given-empty',
      message: `Specification "${spec.title}" has empty 'given' section — preconditions should be described`,
      path: `${specPath}/given`,
    });
  }

  // Validate step types if we know the pattern
  if (sliceType && SPEC_STEP_RULES[sliceType]) {
    const rules = SPEC_STEP_RULES[sliceType];

    const validateStepTypes = (
      steps: SpecificationStep[],
      section: 'given' | 'when' | 'then',
    ) => {
      const sectionRules = rules[section];
      for (const step of steps) {
        // Check if step type is allowed
        if (!sectionRules.allowed.includes(step.type)) {
          issues.push({
            severity: 'warning',
            rule: 'spec-step-type',
            message: `Step "${step.title}" uses type '${step.type}' in '${section}' section. For ${sliceType}, allowed types are: ${sectionRules.allowed.join(', ')}`,
            path: `${specPath}/${section}/${step.id}`,
          });
        }

        // Check if step linkedId references an existing element
        if (step.linkedId && !elementIds.has(step.linkedId)) {
          issues.push({
            severity: 'warning',
            rule: 'spec-step-linkedId',
            message: `Step "${step.title}" linkedId '${step.linkedId}' does not match any element in this slice`,
            path: `${specPath}/${section}/${step.id}/linkedId`,
          });
        }
      }
    };

    validateStepTypes(spec.given, 'given');
    validateStepTypes(spec.when, 'when');
    validateStepTypes(spec.then, 'then');
  }

  return issues;
}

/**
 * Validate all specifications within a slice
 */
export function validateSpecifications(slice: Slice): ValidationResult {
  const issues: ValidationIssue[] = [];
  const elementIds = collectElementIds(slice);
  const specs = slice.specifications || [];

  // Rule: At least 1 specification per slice
  if (specs.length === 0) {
    issues.push({
      severity: 'error',
      rule: 'spec-minimum',
      message: `Slice "${slice.title}" has no specifications — at least 1 Given/When/Then scenario is required`,
      path: `slices/${slice.id}/specifications`,
      suggestion: 'Add a Specification describing the main business rule for this slice',
    });
    return { valid: false, issues };
  }

  // Validate each specification
  for (let i = 0; i < specs.length; i++) {
    const specIssues = validateSpec(specs[i], slice.sliceType, elementIds, i);
    issues.push(...specIssues);
  }

  // Rule: At least one specification should have a SPEC_ERROR step (error scenario coverage)
  const hasErrorScenario = specs.some(spec =>
    spec.then.some(step => step.type === 'SPEC_ERROR')
  );
  if (!hasErrorScenario) {
    issues.push({
      severity: 'warning',
      rule: 'spec-error-coverage',
      message: `Slice "${slice.title}" has no error scenarios — consider adding a specification with a SPEC_ERROR step in 'then'`,
      path: `slices/${slice.id}/specifications`,
      suggestion: 'Add a scenario that describes what happens when validation fails or an error occurs',
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * Export step rules for use in prompts
 */
export function getSpecStepRules(): Record<string, StepTypeConstraints> {
  return { ...SPEC_STEP_RULES };
}
