import { describe, it, expect } from 'vitest';
import { validateConnections } from '../src/validators/connectionValidator.js';
import { validateCompleteness } from '../src/validators/completenessValidator.js';
import type { Slice } from '../src/types.js';

describe('Validators', () => {
  describe('Connection Validator', () => {
    it('should pass valid SCEP connections', () => {
      const scrId = 'scr_1';
      const cmdId = 'cmd_1';

      const slice: Slice = {
        id: 'slice_1',
        title: 'Test',
        sliceType: 'STATE_CHANGE',
        commands: [{
          id: cmdId, title: 'cmd', type: 'COMMAND', fields: [],
          dependencies: []
        }],
        events: [],
        readmodels: [],
        screens: [{
          id: scrId, title: 'scr', type: 'SCREEN', fields: [],
          dependencies: [{ id: cmdId, type: 'OUTBOUND', title: 'triggers', elementType: 'COMMAND' }]
        }],
        processors: [],
        tables: [],
        specifications: []
      };

      const result = validateConnections(slice);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail invalid connections (e.g. SCREEN -> SCREEN)', () => {
      const scr1Id = 'scr_1';
      const scr2Id = 'scr_2';

      const slice: Slice = {
        id: 'slice_1',
        title: 'Test',
        sliceType: 'STATE_CHANGE',
        commands: [],
        events: [],
        readmodels: [],
        screens: [
          {
            id: scr1Id, title: 'scr1', type: 'SCREEN', fields: [],
            dependencies: [{ id: scr2Id, type: 'OUTBOUND', title: 'navigates', elementType: 'SCREEN' }]
          },
          { id: scr2Id, title: 'scr2', type: 'SCREEN', fields: [], dependencies: [] }
        ],
        processors: [],
        tables: [],
        specifications: []
      };

      const result = validateConnections(slice);
      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('Invalid connection');
    });
  });

  describe('Completeness Validator', () => {
    it('should warn if screen fields have no incoming data source', () => {
      const slice: Slice = {
        id: 'slice_1',
        title: 'Test',
        sliceType: 'STATE_VIEW',
        commands: [],
        events: [],
        readmodels: [],
        screens: [{
          id: 'scr_1', title: 'scr', type: 'SCREEN',
          fields: [{ name: 'name', type: 'String' }],
          dependencies: []
        }],
        processors: [],
        tables: [],
        specifications: []
      };

      const result = validateCompleteness(slice);
      // Completeness just issues warnings
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].rule).toBe('completeness-no-source');
    });
  });
});
