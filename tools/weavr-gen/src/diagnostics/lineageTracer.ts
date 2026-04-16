import type { WeavrProject, ModelingElement } from '../types.js';

export interface LineageDiagnostic {
  type: 'FIELD_LINEAGE_BREAK';
  elementId: string;
  title: string;
  fieldName: string;
  message: string;
  sliceId: string;
}

export function traceLineage(model: WeavrProject): LineageDiagnostic[] {
  const diagnostics: LineageDiagnostic[] = [];
  const slices = model.eventModel?.slices || [];

  const allElements = new Map<string, ModelingElement>();
  for (const s of slices) {
    const add = (el: ModelingElement) => allElements.set(el.id, { ...el, sliceId: s.id } as any);
    s.commands.forEach(add);
    s.events.forEach(add);
    s.readmodels.forEach(add);
    s.screens.forEach(add);
  }

  for (const [, el] of allElements) {
    // Only verify projection lineage (Screen -> ReadModel -> Event)
    if (el.type === 'SCREEN') {
      const inboundReadModels = el.dependencies
        .filter(d => d.type === 'INBOUND' && d.elementType === 'READMODEL')
        .map(d => allElements.get(d.id))
        .filter(e => e !== undefined) as ModelingElement[];

      for (const field of el.fields || []) {
        // Did this field come from an upstream ReadModel?
        const foundInRM = inboundReadModels.some(rm => 
          rm.fields?.some(f => f.name === field.name)
        );

        if (!foundInRM && !field.optional && inboundReadModels.length > 0) {
          diagnostics.push({
            type: 'FIELD_LINEAGE_BREAK',
            elementId: el.id,
            title: el.title,
            fieldName: field.name,
            message: `Screen '${el.title}' expects field '${field.name}', but it is not provided by any connected ReadModel.`,
            sliceId: (el as any).sliceId
          });
        }
      }
    } 
    else if (el.type === 'READMODEL') {
      const inboundEvents = el.dependencies
        .filter(d => d.type === 'INBOUND' && d.elementType === 'EVENT')
        .map(d => allElements.get(d.id))
        .filter(e => e !== undefined) as ModelingElement[];

      for (const field of el.fields || []) {
        const foundInEvt = inboundEvents.some(evt => 
          evt.fields?.some(f => f.name === field.name)
        );

        if (!foundInEvt && inboundEvents.length > 0) {
          diagnostics.push({
            type: 'FIELD_LINEAGE_BREAK',
            elementId: el.id,
            title: el.title,
            fieldName: field.name,
            message: `ReadModel '${el.title}' projects field '${field.name}', but no connected Event contains this field.`,
            sliceId: (el as any).sliceId
          });
        }
      }
    }
    else if (el.type === 'EVENT') {
      const inboundCommands = el.dependencies
        .filter(d => d.type === 'INBOUND' && d.elementType === 'COMMAND')
        .map(d => allElements.get(d.id))
        .filter(e => e !== undefined) as ModelingElement[];

      for (const field of el.fields || []) {
        // Technical fields (id, timestamp) don't need user provenance
        if (field.generated || field.technicalAttribute) continue;

        const foundInCmd = inboundCommands.some(cmd => 
          cmd.fields?.some(f => f.name === field.name)
        );

        if (!foundInCmd && inboundCommands.length > 0) {
          diagnostics.push({
            type: 'FIELD_LINEAGE_BREAK',
            elementId: el.id,
            title: el.title,
            fieldName: field.name,
            message: `Event '${el.title}' contains field '${field.name}', but it is not provided by any connected Command (Data out of thin air).`,
            sliceId: (el as any).sliceId
          });
        }
      }
    }
  }

  return diagnostics;
}
