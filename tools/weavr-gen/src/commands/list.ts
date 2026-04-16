import { readFileSync } from 'fs';
import type { WeavrProject } from '../types.js';
import { green, bold } from '../utils/colors.js';

export interface ListOptions {
  model: string;
}

export function listCore(project: WeavrProject): Record<string, any[]> {
  const slices = project.eventModel?.slices || [];

  const groups: Record<string, typeof slices> = {};
  for (const s of slices) {
    const type = typeof s.sliceType === 'string' ? s.sliceType : 'UNKNOWN';
    if (!groups[type]) groups[type] = [];
    groups[type].push(s);
  }

  return groups;
}

export function runList(options: ListOptions): void {
  let raw: string;
  try {
    raw = readFileSync(options.model, 'utf-8');
  } catch (e) {
    console.error(`❌ Could not read model: ${options.model}`);
    process.exit(1);
  }

  let project: WeavrProject;
  try {
    project = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Invalid JSON in model: ${options.model}`);
    process.exit(1);
  }

  const slices = project.eventModel?.slices || [];
  const groups = listCore(project);

  console.log(`\n📄 ${bold('Weavr Project Slices')} (${slices.length} total)`);
  console.log('='.repeat(50));

  if (slices.length === 0) {
    console.log('No slices found in project.');
    return;
  }

  for (const [pattern, patternSlices] of Object.entries(groups)) {
    console.log(`\n${bold(pattern)} (${patternSlices.length})`);
    console.log('-'.repeat(50));
    for (const s of patternSlices) {
      console.log(`  ${green(s.id.padEnd(25))} | ${s.title}`);
    }
  }

  console.log('');
}
