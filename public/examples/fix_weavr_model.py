
import json
import os

import os

# Set paths relative to the script location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, 'weavr-self-model.json')
OUTPUT_FILE = os.path.join(SCRIPT_DIR, 'weavr-model.json')

def fix_model():
    # Read input
    try:
        with open(INPUT_FILE, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {INPUT_FILE} not found.")
        return

    slices = data.get('eventModel', {}).get('slices', [])
    if not slices:
        print("No slices found in eventModel.")
        return
    
    # 0. Prep: Mapping Internal Types to Schema Types
    # Internal: SCREEN, COMMAND, DOMAIN_EVENT, READ_MODEL, INTEGRATION_EVENT, AUTOMATION
    # Schema:   SCREEN, COMMAND, EVENT,        READMODEL,  EVENT (ctx=EXTERNAL), AUTOMATION
    
    def map_type(el):
        int_type = el.get('type')
        if int_type == 'DOMAIN_EVENT':
            el['type'] = 'EVENT'
        elif int_type == 'INTEGRATION_EVENT':
            el['type'] = 'EVENT'
            el['context'] = 'EXTERNAL'
        elif int_type == 'READ_MODEL':
            el['type'] = 'READMODEL'
        # SCREEN, COMMAND, AUTOMATION match mostly, but let's be safe
        
        return el

    # 1. Map all elements
    element_map = {}
    for s in slices:
        # Collect all elements
        all_elements = []
        all_elements.extend(s.get('commands', []))
        all_elements.extend(s.get('events', []))
        all_elements.extend(s.get('readmodels', []))
        all_elements.extend(s.get('screens', []))
        all_elements.extend(s.get('processors', [])) # Automations
        all_elements.extend(s.get('integrationEvents', []))
        
        for el in all_elements:
            # FIX TYPE before mapping
            map_type(el)
            
            element_map[el['id']] = el
            # Ensure dependencies array exists
            if 'dependencies' not in el:
                el['dependencies'] = []
            
            # Add slice ID for layout ref
            el['_slice_id'] = s['id']
            el['_slice_index'] = slices.index(s)

    # 2. Fix Dependencies (INBOUND -> OUTBOUND) & Fix Dependency Types
    count_fixed = 0
    for el_id, el in element_map.items():
        deps = el.get('dependencies', [])
        
        # Filter existing outbound to avoid duplication if running multiple times on same data
        existing_outbound = {d['id'] for d in deps if d.get('type') == 'OUTBOUND'}
        
        inbound = [d for d in deps if d.get('type') == 'INBOUND']
        
        for dep in inbound:
            source_id = dep['id']
            if source_id in element_map:
                source_el = element_map[source_id]
                
                if el_id not in [d['id'] for d in source_el.get('dependencies', []) if d.get('type') == 'OUTBOUND']:
                     source_el['dependencies'].append({
                        'id': el_id,
                        'type': 'OUTBOUND',
                        'title': dep.get('title', ''),
                        'elementType': el['type'] # Using the FIXED schema type
                    })
                     count_fixed += 1
    
    print(f"Fixed {count_fixed} dependencies.")

    # 3. Clean up INBOUND dependencies
    for el_id, el in element_map.items():
        el['dependencies'] = [d for d in el['dependencies'] if d.get('type') == 'OUTBOUND']

    # 4. Generate Layout
    layout = {}
    
    # Constants
    SLICE_WIDTH = 1200
    SLICE_GAP = 100
    ROW_HEIGHT = 180
    BASE_Y = 100
    
    # X offsets within slice (approximated Event Modeling flow)
    # Using SCHEMA types keys now
    TYPE_X = {
        'SCREEN': 0,
        'COMMAND': 250,
        'AUTOMATION': 500,
        'EVENT': 500, # Domain & Integration both EVENT
        'READMODEL': 750
    }
    
    for s_idx, s in enumerate(slices):
        base_x = s_idx * (SLICE_WIDTH + SLICE_GAP)
        
        # Gather all elements in this slice
        s_elements = []
        s_elements.extend(s.get('commands', []))
        s_elements.extend(s.get('events', []))
        s_elements.extend(s.get('readmodels', []))
        s_elements.extend(s.get('screens', []))
        s_elements.extend(s.get('processors', []))
        s_elements.extend(s.get('integrationEvents', []))
        
        counters = {
            'SCREEN': 0,
            'COMMAND': 0,
            'AUTOMATION': 0,
            'EVENT': 0,
            'READMODEL': 0
        }
        
        for el in s_elements:
            etype = el.get('type', 'COMMAND')
            
            x_offset = TYPE_X.get(etype, 0)
            y_offset = counters.get(etype, 0) * ROW_HEIGHT
            counters[etype] = counters.get(etype, 0) + 1
            
            # Update layout
            layout[el['id']] = {
                'x': base_x + x_offset,
                'y': BASE_Y + y_offset,
                'height': 120,
                'type': etype,
                'title': el['title']
            }
            
            # Remove temp fields
            if '_slice_id' in el: del el['_slice_id']
            if '_slice_index' in el: del el['_slice_index']

    data['layout'] = layout
    
    # Create directory if not exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"Written to {OUTPUT_FILE} with Schema Type Fixes")

if __name__ == '__main__':
    fix_model()
