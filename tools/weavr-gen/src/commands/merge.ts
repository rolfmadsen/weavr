import { readFileSync, writeFileSync } from 'fs';
import { validateSlice, formatReport } from '../validators/index.js';
import type { WeavrProject, Slice } from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { green, bold, yellow } from '../utils/colors.js';

export interface MergeOptions {
  model: string;
  slice: string;
  output?: string;
}

export interface MergeResult {
  updatedModel: WeavrProject;
  addedElements: number;
  addedDefinitions: number;
  addedFields: number;
}

export function mergeCore(model: WeavrProject, slice: Slice, overwrite: boolean = false): MergeResult {
  // Validate the slice first
  const validation = validateSlice(slice);
  if (!validation.valid) {
    const err = new Error('Slice validation failed. Fix errors before merging.');
    (err as any).validationResult = validation;
    throw err;
  }

  // Check for duplicate slice ID
  const existingIds = new Set(model.eventModel.slices.map((s: Slice) => s.id));
  if (existingIds.has(slice.id)) {
    if (!overwrite) {
      throw new Error(`Slice ID '${slice.id}' already exists in the model. Use a unique ID or set overwrite=true.`);
    } else {
      // Remove the old slice to be replaced below
      model.eventModel.slices = model.eventModel.slices.filter(s => s.id !== slice.id);
    }
  }

  const addedElements = [
    ...slice.commands,
    ...slice.events,
    ...slice.readmodels,
    ...slice.screens,
    ...slice.processors
  ];

  // --- Data Dictionary Merging ---
  if (!model.dataDictionary) {
    model.dataDictionary = { definitions: {} };
  }
  const definitions = model.dataDictionary.definitions as Record<string, any>;
  let addedDictEntries = 0;
  let addedFields = 0;

  // Extract fields and group by aggregate
  for (const el of addedElements) {
    if (el.aggregate && el.fields && el.fields.length > 0) {
      const aggName = el.aggregate;

      const existingDefKeys = Object.keys(definitions).filter(
        k => definitions[k].name === aggName || definitions[k].aggregate === aggName
      );

      let targetDefKey: string | null = existingDefKeys.length > 0 ? existingDefKeys[0] : null;

      if (!targetDefKey) {
        targetDefKey = uuidv4();
        definitions[targetDefKey] = {
          id: targetDefKey,
          name: aggName,
          type: 'Aggregate',
          attributes: [],
          isRoot: true,
          description: `Auto-generated from slice ${slice.title}`
        };
        addedDictEntries++;
      }

      const targetDef = definitions[targetDefKey];
      if (!targetDef.attributes) targetDef.attributes = [];

      const existingFieldNames = new Set(targetDef.attributes.map((a: any) => a.name));

      for (const field of el.fields) {
        if (!existingFieldNames.has(field.name) && !field.technicalAttribute && !field.generated) {
          targetDef.attributes.push({
            name: field.name,
            type: field.type || 'String',
          });
          existingFieldNames.add(field.name);
          addedFields++;
        }
      }
    }
  }

  // Merge
  model.eventModel.slices.push(slice);
  model.meta.updatedAt = new Date().toISOString();

  return {
    updatedModel: model,
    addedElements: addedElements.length,
    addedDefinitions: addedDictEntries,
    addedFields,
  };
}

export function runMerge(options: MergeOptions): void {
  // Read the slice
  let sliceRaw: string;
  try {
    sliceRaw = readFileSync(options.slice, 'utf-8');
  } catch (e) {
    console.error(`❌ Could not read slice: ${options.slice}`);
    process.exit(1);
  }

  let slice: Slice;
  try {
    slice = JSON.parse(sliceRaw);
  } catch (e) {
    console.error(`❌ Invalid JSON in slice: ${options.slice}`);
    process.exit(1);
  }

  // Read the target model
  let modelRaw: string;
  try {
    modelRaw = readFileSync(options.model, 'utf-8');
  } catch (e) {
    console.error(`❌ Could not read model: ${options.model}`);
    process.exit(1);
  }

  let model: WeavrProject;
  try {
    model = JSON.parse(modelRaw);
  } catch (e) {
    console.error(`❌ Invalid JSON in model: ${options.model}`);
    process.exit(1);
  }

  let result: MergeResult;
  try {
    result = mergeCore(model, slice, (options as any).overwrite);
  } catch (err: any) {
    console.error(`❌ ${err.message}`);
    if (err.validationResult) {
      console.log(formatReport(err.validationResult));
    }
    process.exit(1);
  }

  // --- Diff output ---
  console.log(`\n${bold('Diff: Additions to Model')}`);
  console.log('='.repeat(50));
  console.log(`+ Slice: ${green(slice.title)} (${slice.id})`);

  const addedElements = [
    ...slice.commands,
    ...slice.events,
    ...slice.readmodels,
    ...slice.screens,
    ...slice.processors
  ];

  for (const el of addedElements) {
    console.log(`  + [${el.type}] ${green(el.title)}`);
  }

  if (result.addedDefinitions > 0) {
    console.log(`  + [Dictionary] Added ${result.addedDefinitions} new Aggregate(s) with ${result.addedFields} Field(s)`);
  } else {
    console.log(`  ${yellow('No new Dictionary aggregates added.')}`);
  }

  // Write output
  const outputPath = options.output || options.model;
  const json = JSON.stringify(result.updatedModel, null, 2);
  writeFileSync(outputPath, json, 'utf-8');

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Slice "${slice.title}" merged into ${outputPath}`);
  console.log(`   Total slices: ${model.eventModel.slices.length}`);
}