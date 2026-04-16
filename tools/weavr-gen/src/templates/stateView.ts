/**
 * STATE_VIEW Template
 * 
 * Pattern: Screen ← ReadModel ← DomainEvent(s) [from other slices]
 * "A user views data without changing anything"
 */
import { v4 as uuidv4 } from 'uuid';
import type { Slice, ModelingElement, Specification, Field, Dependency } from '../types.js';

interface StateViewInput {
  title: string;
  sourceEvent?: string; // ID of event from another slice
  fields?: string;
  actor?: string;
  id?: string;
  modelData?: any;
  imageUrl?: string;
}

function parseFields(fieldsStr?: string): Field[] {
  if (!fieldsStr) return [];
  return fieldsStr.split(',').map(f => {
    const parts = f.trim().split(':');
    return { name: parts[0], type: parts[1] || 'String' };
  });
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function generateStateView(input: StateViewInput): Slice {
  const slug = slugify(input.title);
  const sliceId = input.id || `slice_${slug}`;
  const fields = parseFields(input.fields);

  const scrId = `scr_${slug}`;
  const rmId = `rm_${slug}`;
  if (input.modelData && input.sourceEvent) {
    const allEvents = input.modelData.eventModel?.slices.flatMap((s: any) => s.events) || [];
    const existing = allEvents.find((e: any) => e.id === input.sourceEvent);
    if (!existing) {
      console.warn(`[Contextual Gen] Source event ID '${input.sourceEvent}' not found in model.`);
    }
  }

  const screen: ModelingElement = {
    id: scrId,
    title: `${input.title} Screen`,
    type: 'SCREEN',
    description: `View for ${input.title}`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [],
    ...(input.imageUrl && { imageUrl: input.imageUrl }),
  };

  const readModelDeps: Dependency[] = [
    { id: scrId, type: 'OUTBOUND', title: 'displayed by', elementType: 'SCREEN' },
  ];

  if (input.sourceEvent) {
    readModelDeps.unshift({
      id: input.sourceEvent,
      type: 'INBOUND' as const,
      title: 'populates',
      elementType: 'EVENT' as const,
    });
  }

  const readModel: ModelingElement = {
    id: rmId,
    title: `${input.title} Projection`,
    type: 'READMODEL',
    description: `Projects data for ${input.title}`,
    fields: [
      { name: 'id', type: 'UUID' },
      ...fields.map(f => ({ ...f })),
    ],
    dependencies: readModelDeps,
  };

  const spec: Specification = {
    id: `spec_${slug}_view`,
    title: `${input.title} displays correct data`,
    linkedId: rmId,
    given: [
      {
        id: uuidv4(),
        title: `relevant domain events have been persisted`,
        type: 'SPEC_EVENT',
        linkedId: input.sourceEvent,
      },
    ],
    when: [
      {
        id: uuidv4(),
        title: `the projection is built from stored events`,
        type: 'SPEC_READMODEL',
        linkedId: rmId,
      },
    ],
    then: [
      {
        id: uuidv4(),
        title: `the screen displays the projected data`,
        type: 'SPEC_READMODEL',
        linkedId: rmId,
      },
    ],
  };

  return {
    id: sliceId,
    title: input.title,
    sliceType: 'STATE_VIEW',
    commands: [],
    events: [],
    readmodels: [readModel],
    screens: [screen],
    processors: [],
    tables: [],
    specifications: [spec],
    actors: input.actor ? [{ name: input.actor, authRequired: false }] : [],
    aggregates: [],
  };
}
