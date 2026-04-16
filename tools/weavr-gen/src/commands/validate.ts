import { readFileSync } from 'fs';
import { validateSlice, validateProject, formatReport } from '../validators/index.js';
import type { FullValidationResult } from '../validators/index.js';
import type { WeavrProject, Slice } from '../types.js';
import { setUseColors } from '../utils/colors.js';

export interface ValidateOptions {
  file: string;
  full?: boolean;
  format?: 'json' | 'text';
}

export function validateCore(data: unknown, full?: boolean): FullValidationResult {
  const isProject = full || (typeof data === 'object' && data !== null && 'eventModel' in data);
  if (isProject) {
    return validateProject(data as WeavrProject);
  } else {
    return validateSlice(data as Slice);
  }
}

export function runValidate(options: ValidateOptions): void {
  const { file, format = 'text' } = options;

  if (format === 'json') {
    setUseColors(false);
  }

  let raw: string;
  try {
    raw = readFileSync(file, 'utf-8');
  } catch (e) {
    if (format === 'json') {
      console.log(JSON.stringify({ valid: false, error: `Could not read file: ${file}` }));
      process.exit(1);
    }
    console.error(`❌ Could not read file: ${file}`);
    process.exit(1);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e: any) {
    const errorMsg = e.message || String(e);
    if (format === 'json') {
      console.log(JSON.stringify({ valid: false, error: `Invalid JSON in ${file}: ${errorMsg}` }));
      process.exit(1);
    }
    
    console.error(`❌ Invalid JSON in: ${file}`);
    console.error(`   Error: ${errorMsg}`);
    
    if (errorMsg.includes('Unexpected non-whitespace character after JSON')) {
      console.error(`   💡 Suggestion: It looks like there is trailing garbage after the closing '}'.`);
      console.error(`      Check the end of the file for extra characters or multiple JSON objects.`);
    }
    
    process.exit(1);
  }

  const isProject = options.full || (typeof data === 'object' && data !== null && 'eventModel' in data);
  const result = validateCore(data, options.full);

  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (isProject) {
      console.log(`🔍 Validating full project: ${file}`);
      const project = data as WeavrProject;
      const sliceCount = project.eventModel?.slices?.length || 0;
      console.log(`   ${sliceCount} slice(s) found`);
    } else {
      console.log(`🔍 Validating slice: ${file}`);
    }
    console.log(formatReport(result));
  }

  process.exit(result.valid ? 0 : 1);
}
