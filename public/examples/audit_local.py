
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, 'weavr-model.json')

def audit_weavr_model():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    meta = data.get('meta', {})
    print(f"Project: {meta.get('projectName')}")
    print(f"Version: {meta.get('version')}")

    slices = data.get('eventModel', {}).get('slices', [])
    print(f"\nFound {len(slices)} Slices")

    nodes_without_slice = 0
    slice_stats = {}

    # Map nodes back to slices
    layout = data.get('layout', {})
    
    for s in slices:
        s_id = s.get('id')
        elements = []
        elements.extend(s.get('commands', []))
        elements.extend(s.get('events', []))
        elements.extend(s.get('readmodels', []))
        elements.extend(s.get('screens', []))
        elements.extend(s.get('processors', []))
        
        slice_stats[s_id] = len(elements)
        print(f" - Slice '{s.get('title')}' ({s_id}): {len(elements)} elements")
        
        for el in elements:
            el_id = el.get('id')
            if el_id not in layout:
                print(f"   [WARNING] Element {el_id} missing from layout!")

    # Check for layout consistency
    print(f"\nLayout Entries: {len(layout)}")

if __name__ == '__main__':
    audit_weavr_model()
