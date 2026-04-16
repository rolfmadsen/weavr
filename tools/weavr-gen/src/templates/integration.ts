/**
 * INTEGRATION Template
 * 
 * Pattern: IntegrationEvent → Automation → Command → DomainEvent → ReadModel
 *   (or reverse: DomainEvent → Automation → IntegrationEvent)
 * "Data from/to an external system"
 */
import { v4 as uuidv4 } from 'uuid';
import type { Slice, ModelingElement, Specification, Field } from '../types.js';

interface IntegrationInput {
  title: string;
  externalSystem: string;
  direction?: 'INBOUND' | 'OUTBOUND'; // default INBOUND
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

export function generateIntegration(input: IntegrationInput): Slice {
  const slug = slugify(input.title);
  const sysSlug = slugify(input.externalSystem);
  const sliceId = input.id || `slice_${slug}`;
  const fields = parseFields(input.fields);
  const direction = input.direction || 'INBOUND';

  if (direction === 'INBOUND') {
    return generateInbound(sliceId, slug, sysSlug, input, fields);
  } else {
    return generateOutbound(sliceId, slug, sysSlug, input, fields);
  }
}

function generateInbound(
  sliceId: string, slug: string, sysSlug: string,
  input: IntegrationInput, fields: Field[],
): Slice {
  const ieId = `ie_${sysSlug}_${slug}`;
  const autoId = `auto_${slug}_translator`;
  const cmdId = `cmd_${slug}_import`;
  const evtId = `evt_${slug}_imported`;

  const integrationEvent: ModelingElement = {
    id: ieId,
    title: `${input.externalSystem}: ${input.title}`,
    type: 'EVENT',
    context: 'EXTERNAL',
    description: `Data received from ${input.externalSystem}`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [{ id: autoId, type: 'OUTBOUND', title: 'triggers', elementType: 'AUTOMATION' }],
  };

  const automation: ModelingElement = {
    id: autoId,
    title: `${input.title} Translator`,
    type: 'AUTOMATION',
    description: `Translates ${input.externalSystem} data to internal domain`,
    fields: [],
    dependencies: [{ id: cmdId, type: 'OUTBOUND', title: 'issues', elementType: 'COMMAND' }],
  };

  const command: ModelingElement = {
    id: cmdId,
    title: `Import ${input.title}`,
    type: 'COMMAND',
    description: `Internal command to process imported data`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [{ id: evtId, type: 'OUTBOUND', title: 'results in', elementType: 'EVENT' }],
    ...(input.aggregate && { aggregate: input.aggregate }),
  };

  const domainEvent: ModelingElement = {
    id: evtId,
    title: `${input.title} Imported`,
    type: 'EVENT',
    description: `Internal domain event after successful import`,
    fields: [
      { name: 'id', type: 'UUID', generated: true, idAttribute: true },
      ...fields.map(f => ({ ...f })),
      { name: 'importedAt', type: 'DateTime', generated: true, technicalAttribute: true },
    ],
    dependencies: [],
  };

  const happySpec: Specification = {
    id: `spec_${slug}_happy`,
    title: `${input.title} imported successfully from ${input.externalSystem}`,
    linkedId: autoId,
    given: [
      {
        id: uuidv4(),
        title: `${input.externalSystem} sends valid ${input.title} data`,
        type: 'SPEC_EVENT',
        linkedId: ieId,
      },
    ],
    when: [
      {
        id: uuidv4(),
        title: `the translator maps external data to internal domain`,
        type: 'SPEC_COMMAND',
        linkedId: cmdId,
      },
    ],
    then: [
      {
        id: uuidv4(),
        title: `an internal domain event is persisted`,
        type: 'SPEC_EVENT',
        linkedId: evtId,
      },
    ],
  };

  const errorSpec: Specification = {
    id: `spec_${slug}_mapping_error`,
    title: `${input.title} import fails due to mapping error`,
    linkedId: autoId,
    given: [
      {
        id: uuidv4(),
        title: `${input.externalSystem} sends data with unexpected format`,
        type: 'SPEC_EVENT',
        linkedId: ieId,
      },
    ],
    when: [
      {
        id: uuidv4(),
        title: `the translator attempts to map the data`,
        type: 'SPEC_COMMAND',
        linkedId: cmdId,
      },
    ],
    then: [
      {
        id: uuidv4(),
        title: `a mapping error is logged and the message is sent to a dead-letter queue`,
        type: 'SPEC_ERROR',
      },
    ],
  };

  return {
    id: sliceId,
    title: input.title,
    sliceType: 'AUTOMATION', // Note: INTEGRATION not in schema yet, use AUTOMATION
    commands: [command],
    events: [integrationEvent, domainEvent],
    readmodels: [],
    screens: [],
    processors: [automation],
    tables: [],
    specifications: [happySpec, errorSpec],
    aggregates: input.aggregate ? [input.aggregate] : [],
  };
}

function generateOutbound(
  sliceId: string, slug: string, sysSlug: string,
  input: IntegrationInput, fields: Field[],
): Slice {
  const evtId = `evt_${slug}_trigger`;
  const autoId = `auto_${slug}_exporter`;
  const ieId = `ie_${sysSlug}_${slug}_sent`;

  const domainEvent: ModelingElement = {
    id: evtId,
    title: `${input.title} Ready`,
    type: 'EVENT',
    description: `Internal event triggering export to ${input.externalSystem}`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [{ id: autoId, type: 'OUTBOUND', title: 'triggers', elementType: 'AUTOMATION' }],
  };

  const automation: ModelingElement = {
    id: autoId,
    title: `${input.title} Exporter`,
    type: 'AUTOMATION',
    description: `Translates internal data for ${input.externalSystem}`,
    fields: [],
    dependencies: [{ id: ieId, type: 'OUTBOUND', title: 'sends to', elementType: 'EVENT' }],
  };

  const integrationEvent: ModelingElement = {
    id: ieId,
    title: `${input.externalSystem}: ${input.title} Sent`,
    type: 'EVENT',
    context: 'EXTERNAL',
    description: `Data sent to ${input.externalSystem}`,
    fields: fields.map(f => ({ ...f })),
    dependencies: [],
  };

  const spec: Specification = {
    id: `spec_${slug}_export`,
    title: `${input.title} exported to ${input.externalSystem}`,
    linkedId: autoId,
    given: [
      {
        id: uuidv4(),
        title: `internal ${input.title} data is ready for export`,
        type: 'SPEC_EVENT',
        linkedId: evtId,
      },
    ],
    when: [
      {
        id: uuidv4(),
        title: `the exporter translates and sends the data`,
        type: 'SPEC_COMMAND',
        linkedId: autoId,
      },
    ],
    then: [
      {
        id: uuidv4(),
        title: `data is successfully sent to ${input.externalSystem}`,
        type: 'SPEC_EVENT',
        linkedId: ieId,
      },
    ],
  };

  return {
    id: sliceId,
    title: input.title,
    sliceType: 'AUTOMATION',
    commands: [],
    events: [domainEvent, integrationEvent],
    readmodels: [],
    screens: [],
    processors: [automation],
    tables: [],
    specifications: [spec],
    aggregates: input.aggregate ? [input.aggregate] : [],
  };
}
