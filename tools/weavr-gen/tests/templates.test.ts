import { describe, it, expect } from 'vitest';
import { generateStateChange } from '../src/templates/stateChange.js';
import { generateAutomation } from '../src/templates/automation.js';

describe('Templates', () => {
  it('generateStateChange should create exactly 1 of each SCEP element and 2 specs', () => {
    const slice = generateStateChange({ title: 'Test Action', fields: 'id:String,val:Int' });
    
    expect(slice.sliceType).toBe('STATE_CHANGE');
    expect(slice.commands).toHaveLength(1);
    expect(slice.events).toHaveLength(1);
    expect(slice.readmodels).toHaveLength(1);
    expect(slice.screens).toHaveLength(1);
    expect(slice.specifications).toHaveLength(2); // happy + error
  });

  it('generateAutomation should handle existing source events properly', () => {
    const slice = generateAutomation({ 
      title: 'Auto reacting', 
      triggerEventId: 'evt_existing_123' 
    });
    
    expect(slice.events).toHaveLength(1); // Only result event
    expect(slice.processors[0].dependencies[0].id).toBe('evt_existing_123');
    expect(slice.processors[0].dependencies[0].type).toBe('INBOUND');
  });
});
