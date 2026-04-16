/**
 * Generate Command
 * 
 * Scaffolds a complete slice following one of the 4 Event Modeling patterns.
 */
import { writeFileSync } from 'fs';
import { generateStateChange } from '../templates/stateChange.js';
import { generateStateView } from '../templates/stateView.js';
import { generateAutomation } from '../templates/automation.js';
import { generateIntegration } from '../templates/integration.js';
import { validateSlice, formatReport } from '../validators/index.js';
import type { Slice } from '../types.js';

export interface GenerateOptions {
  pattern: string;
  title: string;
  aggregate?: string;
  actor?: string;
  fields?: string;
  externalSystem?: string;
  direction?: string;
  output?: string;
  sourceEvent?: string;     // <-- New
  specExamples?: string;    // <-- New
  specComments?: string;    // <-- New
  skipValidation?: boolean;
  modelData?: any;          // <-- Pass existing model for context
  imageUrl?: string;        // <-- Support pasting images onto Screens
}

export function generateCore(options: GenerateOptions): Slice {
  const { pattern, title } = options;

  if (!title) {
    throw new Error('--title is required');
  }

  let slice: Slice;

  switch (pattern.toUpperCase()) {
    case 'STATE_CHANGE':
      slice = generateStateChange({
        title,
        aggregate: options.aggregate,
        actor: options.actor,
        fields: options.fields,
        modelData: options.modelData,
      });
      break;

    case 'STATE_VIEW':
      slice = generateStateView({
        title,
        sourceEvent: options.sourceEvent,
        actor: options.actor,
        fields: options.fields,
        modelData: options.modelData,
        imageUrl: options.imageUrl,
      });
      break;

    case 'AUTOMATION':
      slice = generateAutomation({
        title,
        triggerEventId: options.sourceEvent,
        aggregate: options.aggregate,
        fields: options.fields,
        modelData: options.modelData,
      });
      break;

    case 'INTEGRATION':
      if (!options.externalSystem) {
        throw new Error('--external-system is required for INTEGRATION pattern');
      }
      slice = generateIntegration({
        title,
        externalSystem: options.externalSystem,
        direction: (options.direction?.toUpperCase() as 'INBOUND' | 'OUTBOUND') || 'INBOUND',
        aggregate: options.aggregate,
        fields: options.fields,
        modelData: options.modelData,
      });
      break;

    default:
      throw new Error(`Unknown pattern: '${pattern}'. Valid patterns: STATE_CHANGE, STATE_VIEW, AUTOMATION, INTEGRATION`);
  }

  // --- Apply global spec enhancements ---
  if (options.specExamples || options.specComments) {
    let examplesObj: any = undefined;
    if (options.specExamples) {
      const lines = options.specExamples.split('|');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(s => s.trim());
        const rows = lines.slice(1).map(row => row.split(',').map(s => s.trim()));
        examplesObj = { headers, rows };
      }
    }

    const commentsArr: any[] = options.specComments 
      ? [{ description: options.specComments }] 
      : [];

    for (const spec of slice.specifications) {
      if (examplesObj && !spec.examples) {
        spec.examples = examplesObj;
      }
      if (commentsArr.length > 0) {
        spec.comments = commentsArr;
      }
    }
  }

  // Validate unless skipped
  if (!options.skipValidation) {
    const result = validateSlice(slice);
    if (!result.valid) {
      // Attach the formatted report to the error so caller can log it if desired
      const err = new Error('Generated slice failed validation.');
      (err as any).validationResult = result;
      throw err;
    }
  }

  return slice;
}

export function runGenerate(options: GenerateOptions): void {
  let slice: Slice;
  try {
    slice = generateCore(options);
  } catch (err: any) {
    console.error(`❌ ${err.message}`);
    if (err.validationResult) {
      console.log(formatReport(err.validationResult));
      console.error('❌ Generated slice failed validation. Use --skip-validation to output anyway.');
    }
    process.exit(1);
  }

  // Output
  const json = JSON.stringify(slice, null, 2);

  if (options.output) {
    writeFileSync(options.output, json, 'utf-8');
    console.log(`📄 Slice written to: ${options.output}`);
  } else {
    console.log(json);
  }
}
