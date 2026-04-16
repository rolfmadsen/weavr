# weavr-gen

AI-assisted Event Model generation harness with validation guardrails for [Weavr](https://weavr.dk).

Generate, validate, and merge Event Modeling slices that follow the 4 canonical patterns — with built-in enforcement of the Weavr Modeling Alphabet, Specification (Given/When/Then) business rules, and field lineage tracking.

---

## Quick Start

```bash
# Install
cd tools/weavr-gen
npm install

# Generate your first slice
npx tsx src/cli.ts generate \
  --pattern STATE_CHANGE \
  --title "Create Student" \
  --aggregate "Student" \
  --actor "Administrator" \
  --fields "name:String,email:String,cpr:String" \
  --output slices/create-student.json

# Validate it
npx tsx src/cli.ts validate slices/create-student.json

# Merge into an existing Weavr model
npx tsx src/cli.ts merge \
  --model ../../public/examples/weavr-model.json \
  --slice slices/create-student.json \
  --output my-project.json
```

---

## The 4 Event Modeling Patterns

Every slice in Weavr follows exactly one of these patterns:

### 1. STATE_CHANGE — "A user changes state"

```
Screen → Command → DomainEvent → ReadModel → Screen
```

```bash
npx tsx src/cli.ts generate \
  --pattern STATE_CHANGE \
  --title "Enroll Student" \
  --aggregate "Enrollment" \
  --actor "Student" \
  --fields "courseId:UUID,studentId:UUID,semester:String"
```

**Generated elements:** Screen, Command, DomainEvent, ReadModel  
**Generated specs:** Happy path + error scenario  
**Generated flows:** Full SCEP loop with validated dependencies

### 2. STATE_VIEW — "A user views data"

```
ReadModel → Screen
```

```bash
npx tsx src/cli.ts generate \
  --pattern STATE_VIEW \
  --title "Course Catalog" \
  --actor "Student" \
  --fields "title:String,ects:Int,semester:String"
```

**Generated elements:** Screen, ReadModel  
**No Command or Event** — read-only pattern

### 3. AUTOMATION — "The system reacts to an event"

```
DomainEvent → Automation → Command → DomainEvent
```

```bash
npx tsx src/cli.ts generate \
  --pattern AUTOMATION \
  --title "Waitlist Processor" \
  --aggregate "Enrollment" \
  --fields "courseId:UUID,position:Int"
```

**Generated elements:** Trigger Event, Automation, Command, Result Event  
**No Screen** — system-to-system pattern

### 4. INTEGRATION — "Data from/to an external system"

```
IntegrationEvent → Automation → Command → DomainEvent
```

```bash
# Inbound (external → internal)
npx tsx src/cli.ts generate \
  --pattern INTEGRATION \
  --title "Grade Import" \
  --external-system "STADS" \
  --direction INBOUND \
  --fields "studentId:String,courseCode:String,grade:String"

# Outbound (internal → external)
npx tsx src/cli.ts generate \
  --pattern INTEGRATION \
  --title "Transcript Export" \
  --external-system "STADS" \
  --direction OUTBOUND \
  --fields "studentId:UUID,transcript:Custom"
```

---

## Commands

### `generate` — Scaffold a validated slice

```
weavr-gen generate [options]

Required:
  -p, --pattern <type>           STATE_CHANGE | STATE_VIEW | AUTOMATION | INTEGRATION
  -t, --title <title>            Slice title (e.g. "Create Student")

Optional:
  -a, --aggregate <name>         Aggregate name (e.g. "Student")
  --actor <name>                 Actor name (e.g. "Administrator")
  -f, --fields <fields>          Comma-separated fields: "name:String,age:Int"
  -e, --external-system <name>   External system (required for INTEGRATION)
  -d, --direction <dir>          INBOUND or OUTBOUND (default: INBOUND)
  -o, --output <path>            Output file (default: stdout)
  --skip-validation              Skip validation of generated output
```

### `validate` — Validate a slice or model

```
weavr-gen validate <file> [options]

Arguments:
  file                           Path to slice or project JSON file

Options:
  --full                         Force validation as a full Weavr project
```

**Runs 5 validators:**

| # | Validator | What it checks |
|:--|:----------|:---------------|
| 1 | **Schema** | JSON structure matches `weavr.schema.json` |
| 2 | **Connections** | All dependencies follow the Modeling Alphabet |
| 3 | **Pattern** | Elements match the declared `sliceType` |
| 4 | **Specifications** | Given/When/Then rules, linkedId integrity, error coverage |
| 5 | **Completeness** | Field lineage — no data "out of thin air" |

**Example output:**

```
✅ Validation PASSED
   0 error(s), 1 warning(s), 2 info(s)

✅ Schema: Valid
✅ Connections: Valid
✅ Pattern: Valid
✅ Specifications: 2 issue(s)
  ✅ "Create Student with valid data" — linkedId valid
  ⚠️ Slice "Create Student" has no error scenarios
     💡 Add a scenario with SPEC_ERROR in 'then'
✅ Completeness: Valid
```

### `merge` — Add a slice to a project

```
weavr-gen merge [options]

Required:
  -m, --model <path>             Path to existing Weavr project
  -s, --slice <path>             Path to slice file to merge

Optional:
  -o, --output <path>            Output path (default: overwrite model)
```

---

## Specifications (Given/When/Then)

Every generated slice includes **Specifications** — Gherkin-style business rules that describe the expected behavior. These are first-class citizens in the Weavr schema.

### Structure

```json
{
  "specifications": [{
    "id": "spec_create_student_happy",
    "title": "Student created with valid data",
    "linkedId": "cmd_create_student",
    "given": [
      { "id": "...", "title": "the system is ready", "type": "SPEC_READMODEL", "linkedId": "rm_..." }
    ],
    "when": [
      { "id": "...", "title": "user submits valid data", "type": "SPEC_COMMAND", "linkedId": "cmd_..." }
    ],
    "then": [
      { "id": "...", "title": "a 'Student Created' event is persisted", "type": "SPEC_EVENT", "linkedId": "evt_..." },
      { "id": "...", "title": "the student appears in the list", "type": "SPEC_READMODEL", "linkedId": "rm_..." }
    ]
  }]
}
```

### Step Types per Pattern

| Pattern | Given | When | Then |
|:--------|:------|:-----|:-----|
| **STATE_CHANGE** | `SPEC_READMODEL` | `SPEC_COMMAND` | `SPEC_EVENT`, `SPEC_READMODEL`, `SPEC_ERROR` |
| **STATE_VIEW** | `SPEC_EVENT` | `SPEC_READMODEL` | `SPEC_READMODEL`, `SPEC_ERROR` |
| **AUTOMATION** | `SPEC_EVENT` | `SPEC_COMMAND` | `SPEC_EVENT`, `SPEC_ERROR` |
| **INTEGRATION** | `SPEC_EVENT` | `SPEC_COMMAND` | `SPEC_EVENT`, `SPEC_ERROR` |

---

## For AI Agents

### Using weavr-gen as an AI harness

AI agents can use `weavr-gen` in two ways:

#### Option A: Generate via CLI (recommended for scaffolding)

```bash
npx tsx src/cli.ts generate --pattern STATE_CHANGE --title "..." --fields "..." -o slice.json
```

The CLI enforces all guardrails automatically.

#### Option B: Generate JSON manually, then validate

1. AI reads the [system prompt](prompts/system-prompt.md) + the relevant [pattern prompt](prompts/)
2. AI generates a Weavr `Slice` JSON following the rules
3. AI validates using: `npx tsx src/cli.ts validate slice.json`
4. If validation fails, AI reads the error report and corrects

### Prompt files

| Prompt | Purpose |
|:-------|:--------|
| [system-prompt.md](prompts/system-prompt.md) | Master guardrails — all rules, alphabet, spec types |
| [state-change.md](prompts/state-change.md) | STATE_CHANGE pattern specifics |
| [state-view.md](prompts/state-view.md) | STATE_VIEW pattern specifics |
| [automation.md](prompts/automation.md) | AUTOMATION pattern specifics |
| [integration.md](prompts/integration.md) | INTEGRATION pattern specifics |

### Workflow: Slice-by-Slice Event Model Generation

```
1. User describes a feature in natural language
2. AI selects the correct pattern (1 of 4)
3. AI generates slice JSON (via generate CLI or manually)
4. AI validates: weavr-gen validate slice.json
5. If errors → AI fixes and re-validates
6. AI merges: weavr-gen merge --model project.json --slice slice.json
7. Repeat for next feature
8. User imports final model into Weavr UI
```

---

## The Modeling Alphabet

Valid connections between element types:

```
SCREEN      → COMMAND           (triggers)
COMMAND     → EVENT             (results in)
COMMAND     → INTEGRATION_EVENT (results in)
EVENT       → READMODEL         (populates)
EVENT       → AUTOMATION        (triggers)
EVENT       → INTEGRATION_EVENT (triggers)
READMODEL   → SCREEN            (displayed by)
READMODEL   → AUTOMATION        (informs)
READMODEL   → INTEGRATION_EVENT (triggers)
AUTOMATION  → COMMAND           (issues)
INTEGRATION → READMODEL         (populates)
INTEGRATION → AUTOMATION        (triggers)
```

**Forbidden:**
- ❌ `Command → Screen` — commands must result in events
- ❌ `Screen → Screen` — navigation is driven by ReadModels

---

## Project Structure

```
tools/weavr-gen/
├── package.json
├── tsconfig.json
├── README.md
├── ROADMAP.md
├── src/
│   ├── cli.ts                          # Entry point
│   ├── types.ts                        # Shared Weavr types
│   ├── commands/
│   │   ├── generate.ts                 # Scaffold a slice
│   │   ├── validate.ts                 # Validate slice/project
│   │   └── merge.ts                    # Merge slice into model
│   ├── validators/
│   │   ├── index.ts                    # Orchestrator + reporter
│   │   ├── schemaValidator.ts          # ajv vs weavr.schema.json
│   │   ├── connectionValidator.ts      # Modeling Alphabet
│   │   ├── patternValidator.ts         # 4-pattern element check
│   │   ├── specificationValidator.ts   # GWT + linkedId integrity
│   │   └── completenessValidator.ts    # Field lineage
│   └── templates/
│       ├── stateChange.ts
│       ├── stateView.ts
│       ├── automation.ts
│       └── integration.ts
└── prompts/
    ├── system-prompt.md
    ├── state-change.md
    ├── state-view.md
    ├── automation.md
    └── integration.md
```

---

## License

Part of the [Weavr](https://weavr.dk) project.
