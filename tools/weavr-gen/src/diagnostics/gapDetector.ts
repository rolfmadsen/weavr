import type { WeavrProject, ModelingElement } from '../types.js';

export interface GapDiagnostic {
  type: 'DANGLING_EVENT' | 'ORPHAN_READMODEL' | 'ORPHAN_SCREEN';
  elementId: string;
  title: string;
  message: string;
  suggestion: string;
  sliceId: string;
}

export function detectGaps(model: WeavrProject): GapDiagnostic[] {
  const diagnostics: GapDiagnostic[] = [];
  const slices = model.eventModel?.slices || [];

  const allEvents = new Map<string, ModelingElement>();
  const allReadModels = new Map<string, ModelingElement>();
  const allScreens = new Map<string, ModelingElement>();
  const allCommands = new Map<string, ModelingElement>();

  // Extract all elements and tag with slice ID
  for (const s of slices) {
    s.events.forEach(e => { allEvents.set(e.id, { ...e, sliceId: s.id } as ModelingElement & { sliceId: string }); });
    s.readmodels.forEach(r => { allReadModels.set(r.id, { ...r, sliceId: s.id } as ModelingElement & { sliceId: string }); });
    s.screens.forEach(sc => { allScreens.set(sc.id, { ...sc, sliceId: s.id } as ModelingElement & { sliceId: string }); });
    s.commands.forEach(c => { allCommands.set(c.id, { ...c, sliceId: s.id } as ModelingElement & { sliceId: string }); });
  }

  // 1. DANGLING_EVENT
  for (const [id, e] of allEvents) {
    let isConsumed = false;
    
    for (const r of allReadModels.values()) {
      if (r.dependencies.some(d => d.id === id && d.type === 'INBOUND')) isConsumed = true;
    }
    for (const c of allCommands.values()) {
      if (c.dependencies.some(d => d.id === id && d.type === 'INBOUND')) isConsumed = true;
    }

    if (!isConsumed) {
      diagnostics.push({
        type: 'DANGLING_EVENT',
        elementId: id,
        title: e.title,
        message: `Event '${e.title}' is emitted but never consumed by a ReadModel or Automation.`,
        suggestion: 'Create a STATE_VIEW or AUTOMATION slice that handles this event.',
        sliceId: (e as any).sliceId
      });
    }
  }

  // 2. ORPHAN_READMODEL
  for (const [id, r] of allReadModels) {
    const hasEventInbound = r.dependencies.some(d => d.type === 'INBOUND' && d.elementType === 'EVENT');
    
    if (!hasEventInbound) {
      diagnostics.push({
        type: 'ORPHAN_READMODEL',
        elementId: id,
        title: r.title,
        message: `ReadModel '${r.title}' has no INBOUND event dependency updating it.`,
        suggestion: 'Link this ReadModel to an existing Domain Event or Integration Event.',
        sliceId: (r as any).sliceId
      });
    }
  }

  // 3. ORPHAN_SCREEN
  for (const [id, sc] of allScreens) {
    const hasReadModelInbound = sc.dependencies.some(d => d.type === 'INBOUND' && d.elementType === 'READMODEL');
    
    // Some screens are static / command-only, but usually forms need state or context. 
    // If it has fields but no INBOUND readmodel, flag it.
    if (!hasReadModelInbound && sc.fields && sc.fields.length > 0) {
      diagnostics.push({
        type: 'ORPHAN_SCREEN',
        elementId: id,
        title: sc.title,
        message: `Screen '${sc.title}' requires data fields but has no INBOUND ReadModel.`,
        suggestion: 'Connect a ReadModel to provide the required data fields to the UI.',
        sliceId: (sc as any).sliceId
      });
    }
  }

  return diagnostics;
}
