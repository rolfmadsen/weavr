/**
 * Schema Validator
 * 
 * Validates a Weavr slice or project against weavr.schema.json using Ajv.
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ValidationResult, ValidationIssue } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the schema relative to the weavr project root
const SCHEMA_PATH = resolve(__dirname, '../../../../schemas/weavr.schema.json');

let cachedSchema: object | null = null;

function loadSchema(): object {
  if (cachedSchema) return cachedSchema;
  try {
    const raw = readFileSync(SCHEMA_PATH, 'utf-8');
    cachedSchema = JSON.parse(raw);
    return cachedSchema!;
  } catch (e) {
    throw new Error(`Failed to load weavr.schema.json from ${SCHEMA_PATH}: ${e}`);
  }
}

/**
 * Validate a single slice against the Slice definition in weavr.schema.json
 */
export function validateSliceSchema(slice: unknown): ValidationResult {
  const schema = loadSchema();
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const schemaWithDefs = {
    $ref: '#/definitions/Slice',
    definitions: (schema as any).definitions,
  };

  const validate = ajv.compile(schemaWithDefs);
  const valid = validate(slice);

  if (valid) {
    return { valid: true, issues: [] };
  }

  const issues: ValidationIssue[] = (validate.errors || []).map(err => ({
    severity: 'error' as const,
    rule: 'schema',
    message: `${err.instancePath || '/'} ${err.message}`,
    path: err.instancePath || '/',
    suggestion: err.params ? JSON.stringify(err.params) : undefined,
  }));

  return { valid: false, issues };
}

/**
 * Validate a full Weavr project against the complete schema
 */
export function validateProjectSchema(project: unknown): ValidationResult {
  const schema = loadSchema();
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(project);

  if (valid) {
    return { valid: true, issues: [] };
  }

  const issues: ValidationIssue[] = (validate.errors || []).map(err => ({
    severity: 'error' as const,
    rule: 'schema',
    message: `${err.instancePath || '/'} ${err.message}`,
    path: err.instancePath || '/',
    suggestion: err.params ? JSON.stringify(err.params) : undefined,
  }));

  return { valid: false, issues };
}
