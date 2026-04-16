#!/usr/bin/env node
/**
 * weavr-gen CLI
 * 
 * AI-assisted Event Model generation harness with validation guardrails.
 * 
 * Usage:
 *   weavr-gen generate --pattern STATE_CHANGE --title "Create Student" --fields "name:String,email:String"
 *   weavr-gen validate slice.json
 *   weavr-gen merge --model project.json --slice slice.json
 */
import { Command } from 'commander';
import { runGenerate } from './commands/generate.js';
import { runValidate } from './commands/validate.js';
import { runMerge } from './commands/merge.js';
import { runList } from './commands/list.js';

const program = new Command();

program
  .name('weavr-gen')
  .description('AI-assisted Event Model generation harness with validation guardrails')
  .version('1.0.0');

// ─── generate ────────────────────────────────────────────────────

program
  .command('generate')
  .description('Generate a validated Event Modeling slice from one of the 4 patterns')
  .requiredOption('-p, --pattern <type>', 'Slice pattern: STATE_CHANGE, STATE_VIEW, AUTOMATION, INTEGRATION')
  .requiredOption('-t, --title <title>', 'Slice title (e.g. "Create Student")')
  .option('-a, --aggregate <name>', 'Aggregate name (e.g. "Student")')
  .option('--actor <name>', 'Actor name (e.g. "Administrator")')
  .option('-f, --fields <fields>', 'Comma-separated fields (e.g. "name:String,email:String")')
  .option('-e, --external-system <name>', 'External system name (required for INTEGRATION)')
  .option('-d, --direction <dir>', 'Integration direction: INBOUND or OUTBOUND (default: INBOUND)')
  .option('-o, --output <path>', 'Output file path (defaults to stdout)')
  .option('--source-event <id>', 'ID of source event (for STATE_VIEW or AUTOMATION)')
  .option('--spec-examples <examples>', 'Pipe-separated rows, comma-separated headers (e.g. "hdr1,hdr2|val1,val2|val3,val4")')
  .option('--spec-comments <comments>', 'Comment to attach to spec')
  .option('--skip-validation', 'Skip validation of generated output')
  .action((opts) => {
    runGenerate(opts);
  });

// ─── validate ────────────────────────────────────────────────────

program
  .command('validate <file>')
  .description('Validate a slice or Weavr project against all rules')
  .option('--full', 'Force validation as a full Weavr project')
  .option('--format <format>', 'Output format: text or json (default: text)')
  .action((file, opts) => {
    runValidate({ file, full: opts.full, format: opts.format });
  });

// ─── merge ───────────────────────────────────────────────────────

program
  .command('merge')
  .description('Merge a validated slice into an existing Weavr project')
  .requiredOption('-m, --model <path>', 'Path to the Weavr project file')
  .requiredOption('-s, --slice <path>', 'Path to the slice file to merge')
  .option('-o, --output <path>', 'Output path (defaults to overwriting the model)')
  .action((opts) => {
    runMerge(opts);
  });

// ─── list ────────────────────────────────────────────────────────

program
  .command('list <model>')
  .description('List all slices in a Weavr project')
  .action((model) => {
    runList({ model });
  });

program.parse();
