# weavr-gen Roadmap

Development roadmap from CLI tool to full MCP-integrated AI modeling assistant.

---

## Phase 1: CLI Foundation ✅ (Current)

**Status: Done**

The standalone TypeScript CLI with 5 validators, 4 pattern templates, and AI prompt files.

- [x] Schema validation (ajv)
- [x] Connection rule validation (Modeling Alphabet)
- [x] Pattern composition validation (4 patterns)
- [x] Specification validation (GWT + linkedId + step types)
- [x] Field completeness validation (lineage tracking)
- [x] Generate, Validate, Merge commands
- [x] AI prompt templates (system + 4 patterns)

---

## Phase 2: Hardened CLI ✅

**Goal:** Battle-test the CLI and close gaps discovered during real usage.

### 2.1 — Improved Validation
- [x] Cross-slice dependency validation (events referenced across slices)
- [x] Aggregate Root rule enforcement (exactly 1 isRoot per Aggregate)
- [x] Data Dictionary auto-generation from slice fields
- [x] Duplicate ID detection across slices in a project

### 2.2 — Richer Templates
- [x] Accept pre-existing element IDs for cross-slice references (e.g. `--source-event evt_xxx`)
- [x] Support Examples tables on Specifications via CLI flags
- [x] Support Comments on Specifications
- [x] Multi-screen templates (e.g. list + detail Screen pair)

### 2.3 — Better Output
- [x] Colored terminal output (chalk)
- [x] JSON + human-readable report modes (`--format json|text`)
- [x] Diff mode for merge (show what will be added)
- [x] `weavr-gen list` — list slices in a project with pattern/status summary

### 2.4 — Testing
- [x] Unit tests for all 5 validators (vitest)
- [x] Snapshot tests for all 4 templates
- [x] Round-trip test: generate → validate → merge → export → import
- [x] Fuzz testing: random invalid inputs → no crashes

---

## Phase 3: MCP Server ✅

**Goal:** Expose weavr-gen as an MCP (Model Context Protocol) tool so AI agents can call it natively without shell commands.

### 3.1 — MCP Server Setup
- [x] Create `tools/weavr-gen-mcp/` with MCP server scaffold
- [x] Register as MCP server in agent configuration
- [x] Implement MCP tool: `weavr_gen_generate`
- [x] Implement MCP tool: `weavr_gen_validate`
- [x] Implement MCP tool: `weavr_gen_merge`
- [x] Implement MCP resource: `weavr_gen_rules` (serve prompt + rules as context)

### 3.2 — MCP Tool Specifications

#### `weavr_gen_generate`
```json
{
  "name": "weavr_gen_generate",
  "description": "Generate a validated Event Modeling slice",
  "parameters": {
    "pattern": "STATE_CHANGE | STATE_VIEW | AUTOMATION | INTEGRATION",
    "title": "string (required)",
    "aggregate": "string (optional)",
    "actor": "string (optional)",
    "fields": "string — comma-separated name:Type pairs",
    "externalSystem": "string (INTEGRATION only)",
    "direction": "INBOUND | OUTBOUND (default: INBOUND)"
  },
  "returns": "JSON Slice object + validation report"
}
```

#### `weavr_gen_validate`
```json
{
  "name": "weavr_gen_validate",
  "description": "Validate a Weavr slice or project against all rules",
  "parameters": {
    "data": "JSON object (Slice or WeavrProject)",
    "mode": "slice | project"
  },
  "returns": "Validation report with errors, warnings, suggestions"
}
```

#### `weavr_gen_merge`
```json
{
  "name": "weavr_gen_merge",
  "description": "Merge a slice into an existing Weavr project",
  "parameters": {
    "projectPath": "string — path to weavr-model.json",
    "slice": "JSON Slice object"
  },
  "returns": "Updated project path + merge summary"
}
```

#### `weavr_gen_rules` (MCP Resource)
```json
{
  "name": "weavr_gen_rules",
  "description": "Returns the complete modeling rules as context for AI generation",
  "returns": "Markdown content of system-prompt.md + connection rules + pattern rules"
}
```

### 3.3 — MCP Integration Testing
- [ ] Test with Gemini/Claude via MCP configuration
- [ ] End-to-end: AI generates slice via MCP → validates → merges → opens in Weavr
- [ ] Error recovery: AI receives validation errors → corrects → re-submits

---

## Phase 4: Interactive AI Workflow ✅

**Goal:** Move from single-slice generation to guided, multi-slice Event Model creation.

### 4.1 — Conversational Model Builder
- [x] MCP tool: `weavr_gen_start_session` — initialize a new model
- [x] MCP tool: `weavr_gen_suggest_next` — suggest the next slice based on gaps
- [x] Gap detection: "ReadModel X feeds Screen Y but Event Z has no source Command"
- [x] Cross-slice lineage report: trace fields across the entire model

### 4.2 — Domain Discovery (LLM Native)
- [x] MCP tool: `weavr_gen_discover_aggregates` — (Delegated to LLM parsing)
- [x] MCP tool: `weavr_gen_discover_actors` — (Delegated to LLM parsing)
- [x] Natural language → sliceType classification (Handled by MCP prompt)
- [x] Business rule extraction → Specification generation

### 4.3 — Model Evolution
- [x] `weavr_gen_refine` — (Handled via 'overwrite: true' on merge)
- [x] `weavr_gen_split` — (Handled contextually via multiple slice outputs)
- [x] Version tracking: detect breaking changes between model versions
- [x] Migration suggestions when schema evolves

---

## Phase 5: Weavr UI Integration

**Goal:** Bring weavr-gen capabilities directly into the Weavr canvas.

### 5.1 — Generate from Canvas
- [ ] "AI Generate" button in Slice panel → calls weavr-gen
- [ ] Pre-fill from canvas context (existing aggregates, actors, events)
- [ ] Live validation feedback as the model is built

### 5.2 — Specification Editor Integration
- [ ] AI-assisted Given/When/Then suggestion in the Specification panel
- [ ] Auto-link steps to existing elements
- [ ] Examples table generation from field types

### 5.3 — Documentation Generation
- [ ] Feed weavr-gen output into DocumentationGenerator
- [ ] Include Specifications in exported documentation
- [ ] Spec coverage report: "X of Y slices have specifications"

---

## Design Principles

1. **CLI First, MCP Second**: The CLI is the stable foundation. MCP wraps it.
2. **Validation is Non-Negotiable**: Every output must pass all 5 validators.
3. **Specifications are First-Class**: No slice without business rules.
4. **Incremental Adoption**: Works with existing Weavr models via import/export.
5. **AI-Friendly Errors**: Validation reports are designed for AI self-correction.

---

## Architecture Evolution

```
Phase 1 (Now):     AI → CLI → JSON → Weavr Import
Phase 3 (MCP):     AI → MCP Tool → JSON → Weavr Import
Phase 5 (Native):  AI → Weavr UI → Canvas (direct)
```

Each phase builds on the previous — the validator engine and templates remain the same core.
