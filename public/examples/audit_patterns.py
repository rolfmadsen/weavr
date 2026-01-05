
import json
import os

# Set paths relative to the script location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, 'weavr-self-model.json')

def audit_patterns():
    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    print("Auditing Event Modeling Patterns in weavr-self-model.json...\n")
    
    slices = data.get('eventModel', {}).get('slices', [])
    
    violations = []
    
    for s in slices:
        slice_id = s['id']
        
        elements = []
        elements.extend(s.get('commands', []))
        elements.extend(s.get('events', []))
        elements.extend(s.get('readmodels', []))
        elements.extend(s.get('screens', []))
        elements.extend(s.get('processors', [])) # Automations
        elements.extend(s.get('integrationEvents', []))
        
        for el in elements:
            el_type = el.get('type')
            el_id = el.get('id')
            deps = el.get('dependencies', [])
            
            # Filter for INBOUND dependencies (Predecessors)
            predecessors = [d for d in deps if d.get('type') == 'INBOUND']
            
            # 1. COMMAND must be triggered by SCREEN or AUTOMATION
            if el_type == 'COMMAND':
                valid_parent = False
                for p in predecessors:
                    if p.get('elementType') in ['SCREEN', 'AUTOMATION']:
                        valid_parent = True
                        break
                if not valid_parent:
                    violations.append(f"[{slice_id}] COMMAND '{el['title']}' ({el_id}) missing SCREEN or AUTOMATION parent.")

            # 2. EVENT must be triggered by COMMAND (or External System for Integration Event?)
            if el_type == 'DOMAIN_EVENT':
                valid_parent = False
                for p in predecessors:
                    if p.get('elementType') == 'COMMAND':
                        valid_parent = True
                        break
                if not valid_parent:
                     # Check if it's the start of a chain (Layout Requested triggered by Pos Updated?)
                     # Pattern allows Event -> Event? Usually discouraged. Event->Policy/Auto->Command->Event
                     violations.append(f"[{slice_id}] DOMAIN_EVENT '{el['title']}' ({el_id}) missing COMMAND parent.")

            # 3. READ MODEL must be populated by EVENT (Domain or Integration)
            if el_type == 'READ_MODEL':
                valid_parent = False
                for p in predecessors:
                    if p.get('elementType') in ['DOMAIN_EVENT', 'INTEGRATION_EVENT']:
                        valid_parent = True
                        break
                # Special case: Graph Model sometimes refreshed by itself? No.
                if not valid_parent:
                    violations.append(f"[{slice_id}] READ_MODEL '{el['title']}' ({el_id}) missing EVENT parent.")
            
            # 4. AUTOMATION must be triggered by EVENT or READ_MODEL (?)
            if el_type == 'AUTOMATION':
                valid_parent = False
                for p in predecessors:
                    if p.get('elementType') in ['DOMAIN_EVENT', 'INTEGRATION_EVENT', 'READ_MODEL']:
                        valid_parent = True
                        break
                if not valid_parent:
                    violations.append(f"[{slice_id}] AUTOMATION '{el['title']}' ({el_id}) missing EVENT or READ_MODEL parent.")
                    
    if not violations:
        print("✅ No pattern violations found!")
    else:
        print(f"❌ Found {len(violations)} violations:")
        for v in violations:
            print(v)

if __name__ == '__main__':
    audit_patterns()
