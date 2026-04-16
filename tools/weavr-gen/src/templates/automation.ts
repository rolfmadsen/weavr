/**
 * AUTOMATION Template
 * 
 * Pattern: DomainEvent → Automation → Command → DomainEvent → ReadModel
 * "The system reacts automatically to an event"
 */
import { v4 as uuidv4 } from 'uuid';
import type { Slice, ModelingElement, Specification, Field, Dependency } from '../types.js';

interface AutomationInput {
  title: string;
  triggerEventId?: string;
  triggerEventTitle?: string;
  aggregate?: string;
  fields?: string;
  id?: string;
  modelData?: any;
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

export function generateAutomation(input: AutomationInput): Slice {
  const slug = slugify(input.title);
  const sliceId = input.id || `slice_${slug}`;
  const fields = parseFields(input.fields);

  const triggerEvtId = input.triggerEventId || `evt_${slug}_trigger`;

  // Contextual check: if modelData is provided, verify event existence
  if (input.modelData && input.triggerEventId) {
    const allEvents = input.modelData.eventModel?.slices.flatMap((s: any) => s.events) || [];
    const existing = allEvents.find((e: any) => e.id === input.triggerEventId);
    if (!existing) {
      console.warn(`[Contextual Gen] Trigger event ID '${input.triggerEventId}' not found in model.`);
    }
  }

  const autoId = `auto_${slug}`;
  const cmdId = `cmd_${slug}`;
  const resultEvtId = `evt_${slug}_completed`;

  const triggerEvent: ModelingElement = {
    id: triggerEvtId,
    title: input.triggerEventTitle || `${input.title} Trigger`,
    type: 'EVENT',
    description: `Event that triggers the ${input.title} automation`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [{ id: autoId, type: 'OUTBOUND', title: 'triggers', elementType: 'AUTOMATION' }],
  };

  const autoDeps: Dependency[] = [
    { id: cmdId, type: 'OUTBOUND', title: 'issues', elementType: 'COMMAND' }
  ];

  if (input.triggerEventId) {
    autoDeps.unshift({
      id: input.triggerEventId,
      type: 'INBOUND' as const,
      title: 'triggers',
      elementType: 'EVENT' as const,
    });
  }

  const automation: ModelingElement = {
    id: autoId,
    title: `${input.title} Process`,
    type: 'AUTOMATION',
    description: `Automated ${input.title} logic`,
    fields: [],
    dependencies: autoDeps,
  };

  const command: ModelingElement = {
    id: cmdId,
    title: `Execute ${input.title}`,
    type: 'COMMAND',
    description: `Command issued by ${input.title} automation`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [{ id: resultEvtId, type: 'OUTBOUND', title: 'results in', elementType: 'EVENT' }],
    ...(input.aggregate && { aggregate: input.aggregate }),
  };

  const resultEvent: ModelingElement = {
    id: resultEvtId,
    title: `${input.title} Completed`,
    type: 'EVENT',
    description: `${input.title} automation completed successfully`,
    fields: [
      { name: 'id', type: 'UUID', generated: true, idAttribute: true },
      ...fields.map(f => ({ ...f })),
      { name: 'timestamp', type: 'DateTime', generated: true, technicalAttribute: true },
    ],
    dependencies: [],
  };

  const happySpec: Specification = {
    id: `spec_${slug}_happy`,
    title: `${input.title} completes successfully`,
    linkedId: autoId,
    given: [
      {
        id: uuidv4(),
        title: `a triggering event has occurred`,
        type: 'SPEC_EVENT',
        linkedId: triggerEvtId,
      },
    ],
    when: [
      {
        id: uuidv4(),
        title: `the automation processes the event`,
        type: 'SPEC_COMMAND',
        linkedId: cmdId,
      },
    ],
    then: [
      {
        id: uuidv4(),
        title: `a completion event is persisted`,
        type: 'SPEC_EVENT',
        linkedId: resultEvtId,
      },
    ],
  };

  const errorSpec: Specification = {
    id: `spec_${slug}_error`,
    title: `${input.title} handles failure`,
    linkedId: autoId,
    given: [
      {
        id: uuidv4(),
        title: `a triggering event has occurred with problematic data`,
        type: 'SPEC_EVENT',
        linkedId: triggerEvtId,
      },
    ],
    when: [
      {
        id: uuidv4(),
        title: `the automation attempts to process the event`,
        type: 'SPEC_COMMAND',
        linkedId: cmdId,
      },
    ],
    then: [
      {
        id: uuidv4(),
        title: `the automation retries or logs the failure`,
        type: 'SPEC_ERROR',
      },
    ],
  };

  // Only include triggerEvent if we generated it (i.e., NO sourceEvent provided)
  const events = input.triggerEventId ? [resultEvent] : [triggerEvent, resultEvent];

  return {
    id: sliceId,
    title: input.title,
    sliceType: 'AUTOMATION',
    commands: [command],
    events,
    readmodels: [],
    screens: [],
    processors: [automation],
    tables: [],
    specifications: [happySpec, errorSpec],
    aggregates: input.aggregate ? [input.aggregate] : [],
  };
}
