/**
 * STATE_CHANGE Template
 * 
 * Pattern: Screen → Command → DomainEvent → ReadModel → Screen
 * "A user does something that changes state"
 */
import { v4 as uuidv4 } from 'uuid';
import type { Slice, ModelingElement, Specification, Field } from '../types.js';

interface StateChangeInput {
  title: string;
  aggregate?: string;
  actor?: string;
  fields?: string; // "name:String,cpr:String:pii,email:String"
  id?: string;
  modelData?: any;
}

function parseFields(fieldsStr?: string): Field[] {
  if (!fieldsStr) return [];
  return fieldsStr.split(',').map(f => {
    const parts = f.trim().split(':');
    return {
      name: parts[0],
      type: parts[1] || 'String',
    };
  });
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function generateStateChange(input: StateChangeInput): Slice {
  const slug = slugify(input.title);
  const sliceId = input.id || `slice_${slug}`;
  const fields = parseFields(input.fields);

  // Generate element IDs following convention
  const scrId = `scr_${slug}`;
  const cmdId = `cmd_${slug}`;
  const evtId = `evt_${slug}_completed`;
  const rmId = `rm_${slug}_view`;

  // Build elements
  const screen: ModelingElement = {
    id: scrId,
    title: `${input.title} Screen`,
    type: 'SCREEN',
    description: `UI for ${input.title}`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [{ id: cmdId, type: 'OUTBOUND', title: 'triggers', elementType: 'COMMAND' }],
  };

  const command: ModelingElement = {
    id: cmdId,
    title: input.title,
    type: 'COMMAND',
    description: `Execute ${input.title}`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [{ id: evtId, type: 'OUTBOUND', title: 'results in', elementType: 'EVENT' }],
    ...(input.aggregate && { aggregate: input.aggregate }),
  };

  const event: ModelingElement = {
    id: evtId,
    title: `${input.title} Completed`,
    type: 'EVENT',
    description: `${input.title} was successfully completed`,
    fields: [
      { name: 'id', type: 'UUID', generated: true, idAttribute: true },
      ...fields.map(f => ({ ...f })),
      { name: 'timestamp', type: 'DateTime', generated: true, technicalAttribute: true },
    ],
    dependencies: [{ id: rmId, type: 'OUTBOUND', title: 'populates', elementType: 'READMODEL' }],
  };

  const readModel: ModelingElement = {
    id: rmId,
    title: `${input.title} View`,
    type: 'READMODEL',
    description: `Projection of ${input.title} state`,
    fields: [
      { name: 'id', type: 'UUID' },
      ...fields.map(f => ({ ...f })),
    ],
    dependencies: [{ id: scrId, type: 'OUTBOUND', title: 'displayed by', elementType: 'SCREEN' }],
  };

  // Build specification (happy path)
  const happySpec: Specification = {
    id: `spec_${slug}_happy`,
    title: `${input.title} with valid data`,
    linkedId: cmdId,
    given: [
      {
        id: uuidv4(),
        title: `the system is in a ready state`,
        type: 'SPEC_READMODEL',
        linkedId: rmId,
      },
    ],
    when: [
      {
        id: uuidv4(),
        title: `the user submits ${input.title} with valid data`,
        type: 'SPEC_COMMAND',
        linkedId: cmdId,
        fields: fields.map(f => ({ ...f })),
      },
    ],
    then: [
      {
        id: uuidv4(),
        title: `a '${input.title} Completed' event is persisted`,
        type: 'SPEC_EVENT',
        linkedId: evtId,
      },
      {
        id: uuidv4(),
        title: `the updated data is visible in the view`,
        type: 'SPEC_READMODEL',
        linkedId: rmId,
      },
    ],
  };

  // Build specification (error scenario)
  const errorSpec: Specification = {
    id: `spec_${slug}_error`,
    title: `${input.title} with invalid data`,
    linkedId: cmdId,
    given: [
      {
        id: uuidv4(),
        title: `the system is in a ready state`,
        type: 'SPEC_READMODEL',
        linkedId: rmId,
      },
    ],
    when: [
      {
        id: uuidv4(),
        title: `the user submits ${input.title} with invalid or missing data`,
        type: 'SPEC_COMMAND',
        linkedId: cmdId,
      },
    ],
    then: [
      {
        id: uuidv4(),
        title: `an error message is displayed to the user`,
        type: 'SPEC_ERROR',
      },
    ],
  };

  return {
    id: sliceId,
    title: input.title,
    sliceType: 'STATE_CHANGE',
    commands: [command],
    events: [event],
    readmodels: [readModel],
    screens: [screen],
    processors: [],
    tables: [],
    specifications: [happySpec, errorSpec],
    actors: input.actor ? (() => {
      const existingActor = input.modelData?.eventModel?.slices
        .flatMap((s: any) => s.actors || [])
        .find((a: any) => a.name === input.actor);
      return [{ name: input.actor, authRequired: existingActor ? existingActor.authRequired : true }];
    })() : [],
    aggregates: input.aggregate ? [input.aggregate] : [],
  };
}
