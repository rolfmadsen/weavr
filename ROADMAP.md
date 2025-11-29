Based on your current codebase and our discussion, here is a roadmap broken down into small, verifiable increments. This approach minimizes risk by isolating changes to specific layers (Types → Logic → State → UI).


##############################################
https://gemini.google.com/app/fc11874a304718c4
##############################################


### **Phase 1: Foundation & Schemas**

*Goal: Establish the contract without changing application behavior.*

1.  **Add the Schema File**

      * **Action:** Create `schemas/weavr.schema.json` with the full content generated previously.
      * **Test:** No runtime effect. Verify file existence.

2.  **Define TypeScript Interfaces**

      * **Action:** In `types.ts`, create interfaces that mirror the schema. This ensures type safety for the adapter.
      * **Code:**
        ```typescript
        // types.ts additions
        export interface WeavrProject {
            meta: ProjectMeta;
            eventModel: EventModel; // The Strict Spec
            layout: Record<string, LayoutNode>; // The Sidecar
            dataDictionary: DataDictionary; // The Lexicon
        }

        export interface LayoutNode {
            x: number;
            y: number;
            dataRef?: string;
        }

        // ... define DataDictionary, EventModel, etc.
        ```
      * **Test:** Compilation check.

3.  **Extend Internal Node Type**

      * **Action:** Update the existing `Node` interface in `types.ts` to support the new data reference.
      * **Code:**
        ```typescript
        export interface Node {
            // ... existing fields
            dataRef?: string; // ID/Pointer to the Data Dictionary definition
        }
        ```
      * **Test:** Compilation check.

-----

### **Phase 2: The SpecAdapter (Logic Layer)**

*Goal: Enable Import/Export logic in isolation (pure functions).*

4.  **Implement Slice Assignment Logic**

      * **Context:** The Spec *requires* explicit slices, but Weavr calculates them dynamically.
      * **Action:** Create `services/specAdapter.ts`. Implement a helper that takes `nodes[]` and `links[]`, uses `sliceService.calculateSlices` to get the groups, and returns a map of `NodeID -> SliceID`.
      * **Test:** Unit test `assignNodesToSlices()` with a mock graph.

5.  **Implement `exportToWeavr` Function**

      * **Action:** In `specAdapter.ts`, write the function that transforms `nodes`, `links`, and the calculated slices into the `WeavrProject` JSON structure.
      * **Detail:** \* Map Weavr `Node` → Spec `Element` (stripping `x`, `y`).
          * Map Weavr `Node` → `layout` sidecar (saving `x`, `y`, `dataRef`).
          * Handle "Floating Nodes" by creating a generic "Unassigned" slice in the Spec.
      * **Test:** Call `exportToWeavr(currentNodes, currentLinks)` in the browser console and inspect the JSON output.

6.  **Implement `importFromWeavr` Function**

      * **Action:** In `specAdapter.ts`, write the reverse transformation.
      * **Detail:**
          * Read Spec `Element` → Create Weavr `Node`.
          * Look up ID in `layout` sidecar → Apply `x`, `y`.
          * *Fallback:* If `layout` is missing (importing a file from another tool), run `elkLayoutService` to generate positions.
      * **Test:** Manually construct a JSON file, pass it to this function, and verify it returns correct `Node[]` and `Link[]` arrays.

-----

### **Phase 3: Data Dictionary Backend (State)**

*Goal: Enable storage of the Data Dictionary in Gun.js.*

7.  **Update Gun Service for Dictionary**
      * **Action:** In `hooks/useGunState.ts` (or a new `useDataDictionary.ts`), add listeners for the `dataDictionary` node in the graph.
      * **Code:**
        ```typescript
        // hook pseudocode
        const [dictionary, setDictionary] = useState<DataDictionary>({});

        // Subscribe
        model.get('dataDictionary').on((data) => {
            setDictionary(data || { definitions: {} });
        });

        // Update function
        const updateDefinition = (name, schema) => {
            model.get('dataDictionary').get('definitions').get(name).put(schema);
        }
        ```
      * **Test:** Create a temporary button that adds a dummy "Customer" definition to Gun, and verify it persists after refresh.

-----

### **Phase 4: UI Integration (The "Lexicon" Panel)**

*Goal: Allow users to view and edit the dictionary.*

8.  **Create Data Dictionary Panel**

      * **Action:** Create `components/DataDictionaryPanel.tsx`.
      * **UI:** A list of defined objects (e.g., "Customer", "Order"). Clicking one allows editing its fields (start with a simple text area for JSON, upgrade to a form builder later).
      * **Test:** Verify you can add/edit definitions via the UI.

9.  **Add Toggle to Toolbar**

      * **Action:** Update `components/Toolbar.tsx` to include a "Dictionary" button that toggles the visibility of the new panel.

-----

### **Phase 5: Connecting Events to Data**

*Goal: The "Link" interaction.*

10. **Update Properties Panel**
      * **Action:** Modify `components/PropertiesPanel.tsx`.
      * **Logic:** When a node of type `EVENT` (or `READ_MODEL`) is selected:
          * Fetch available definitions from `useDataDictionary`.
          * Render a `<select>` dropdown (e.g., "Linked Data: [None, Customer, Order]").
          * On change, call `updateNode(id, { dataRef: selectedValue })`.
      * **Test:** Select an event, link it to "Customer", reload the page. Verify the link persists.

-----

### **Phase 6: Visualization**

*Goal: Visual feedback on the canvas.*

11. **Visual Indicator on Canvas**

      * **Action:** Update `components/GraphCanvasKonva.tsx` -\> `NodeGroup`.
      * **Logic:** Check if `node.dataRef` is present.
      * **Render:** If present, draw a small "Database" or "Doc" icon in the corner of the node (using `react-konva` shapes or an SVG path).
      * **Test:** Verify that linked nodes show the icon, and unlinked nodes do not.

12. **Tooltip/Preview (Optional Polish)**

      * **Action:** Add a tooltip to the icon that shows the name of the linked data (e.g., "Linked to: Customer").

### Recommended First Step

Start with **Step 4 and 5 (The Adapter Logic)**. This is the hardest part logic-wise but requires no UI changes. Once you can reliably convert your graph to/from the Spec format in the console, building the UI on top is much easier.