import { describe, it, expect } from 'vitest';
import { detectGaps } from '../src/diagnostics/gapDetector.js';
import { traceLineage } from '../src/diagnostics/lineageTracer.js';
import type { WeavrProject, Slice } from '../src/types.js';

describe('Diagnostics - Gap Detection', () => {
  it('should detect a dangling event', () => {
    const mockModel = {
      meta: { version: '1.0', generator: 'Weavr', projectName: 'Test', updatedAt: '' },
      eventModel: {
        slices: [
          {
            id: 'slice-1',
            title: 'Test Slice',
            sliceType: 'STATE_CHANGE',
            commands: [],
            processors: [],
            tables: [],
            specifications: [],
            screens: [],
            readmodels: [],
            events: [
              {
                id: 'evt-1',
                title: 'UserCreated',
                type: 'EVENT',
                fields: [],
                dependencies: [] // no outbound needed for event itself
              }
            ]
          } as Slice
        ]
      }
    } as WeavrProject;

    const gaps = detectGaps(mockModel);
    expect(gaps.length).toBe(1);
    expect(gaps[0].type).toBe('DANGLING_EVENT');
    expect(gaps[0].elementId).toBe('evt-1');
  });

  it('should not flag event as dangling if a readmodel reads it', () => {
    const mockModel = {
      meta: { version: '1.0', generator: 'Weavr', projectName: 'Test', updatedAt: '' },
      eventModel: {
        slices: [
          {
            id: 'slice-1',
            title: 'Test Slice',
            sliceType: 'STATE_VIEW',
            commands: [],
            processors: [],
            tables: [],
            specifications: [],
            screens: [],
            events: [
              { id: 'evt-1', title: 'UserCreated', type: 'EVENT', fields: [], dependencies: [] }
            ],
            readmodels: [
              {
                id: 'rm-1', title: 'UsersView', type: 'READMODEL', fields: [],
                dependencies: [{ id: 'evt-1', type: 'INBOUND', title: 'UserCreated', elementType: 'EVENT' }]
              }
            ]
          } as Slice
        ]
      }
    } as WeavrProject;

    const gaps = detectGaps(mockModel);
    expect(gaps).toEqual([]); // Readmodel correctly has INBOUND dependency on event, no gaps
  });
});

describe('Diagnostics - Lineage Tracing', () => {
  it('should report broken lineage for screen fields not in readmodel', () => {
    const mockModel = {
      meta: { version: '1.0', generator: 'Weavr', projectName: 'Test', updatedAt: '' },
      eventModel: {
        slices: [
          {
            id: 'slice-1',
            title: 'Test Slice',
            sliceType: 'STATE_VIEW',
            commands: [],
            processors: [],
            tables: [],
            specifications: [],
            events: [],
            readmodels: [
              {
                id: 'rm-1', title: 'UsersView', type: 'READMODEL', fields: [], dependencies: []
              }
            ],
            screens: [
              {
                id: 'sc-1', title: 'UserList', type: 'SCREEN',
                fields: [{ name: 'email', type: 'String' }],
                dependencies: [{ id: 'rm-1', type: 'INBOUND', title: 'UsersView', elementType: 'READMODEL' }]
              }
            ]
          } as Slice
        ]
      }
    } as WeavrProject;

    const lineage = traceLineage(mockModel);
    expect(lineage.length).toBe(1);
    expect(lineage[0].type).toBe('FIELD_LINEAGE_BREAK');
    expect(lineage[0].fieldName).toBe('email');
    expect(lineage[0].elementId).toBe('sc-1');
  });
});
