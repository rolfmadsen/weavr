# Weavr Domain Cheatsheet

## 1. Connection Grammar Matrix

| Source \ Target | SCREEN | COMMAND | DOMAIN_EVENT | READ_MODEL | AUTOMATION | INTEGRATION_EVENT |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **SCREEN** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **COMMAND** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **DOMAIN_EVENT** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **READ_MODEL** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **AUTOMATION** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **INTEGRATION** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

## 2. Specifications & BDD

Slices act as containers for Test Specifications.
- **Structure**: `Given` (Preconditions) -> `When` (Command) -> `Then` (Events/View Updates).
- **Storage**: `slice.specifications` (JSON stringified array).

## 3. Migration Rules (Legacy Support)

If you encounter these types, migrate them immediately:
- `EVENT_INTERNAL` -> `DOMAIN_EVENT`
- `EVENT_EXTERNAL` -> `INTEGRATION_EVENT`
- `int` / `bool` types -> `Int` / `Boolean` (PascalCase)

## 4. Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Alt+S` | Screen Tool |
| `Alt+C` | Command Tool |
| `Alt+E` | Domain Event Tool |
| `Alt+R` | Read Model Tool |
| `F` | Focus on selection |
| `Ctrl+Z` | Undo (Global) |
