# Feature Specification: Data Dictionary

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
The Data Dictionary allows users to define the *structure* of the data flowing through the system. Instead of just labeled boxes, users can define strict schemas for Commands, Events, and Read Models using Entities and Value Objects.

## 2. Goals
*   **Schema Definition**: Define fields and types (String, Int, Boolean, Enum) for data packets.
*   **Reusability**: Define an "User" entity once and reuse it across multiple events.
*   **DDD Alignment**: Encourage use of Value Objects and strong typing.

## 3. User Stories
*   **As a User**, I want to define a "User" entity with "email" and "password" fields.
*   **As a User**, I want to associate this definition with a "RegisterUser" command.
*   **As a User**, I want to export this dictionary as JSON Schema to generate code.

## 4. Technical Design

### 4.1. Data Model
**DataDefinition**:
```typescript
{
  id: string; // UUID
  name: string;
  type: 'Entity' | 'ValueObject' | 'Enum';
  attributes: Attribute[];
}
```

**Attribute**:
```typescript
{
  name: string;
  type: string; // Primitive (String, Int) or Reference Node ID (for relationships)
  isList: boolean;
  isOptional: boolean;
}
```

### 4.2. UI Components
*   **Data Sidebar**: List of all definitions.
*   **Properties Panel (Data Tab)**: Editor for the selected definition (Name, Type, Attributes table).
*   **Autocomplete**: Attribute type field suggests existing Definitions (e.g., typing "Us" suggests "User").

### 4.3. Export Logic (See: `exportUtils.ts`)
The internal model maps to a JSON Schema-like structure for the `weavr.schema.json` export.
*   `Entity` -> Object with properties.
*   `Enum` -> String with `enum` values.
*   References -> `$ref` pointers.

## 5. Verification Plan

### 5.1. Unit Tests
*   [ ] Creating a definition with valid attributes works.
*   [ ] Exporting to JSON generates valid JSON Schema (Draft 7 or compatible).
*   [ ] Circular references are handled (or at least don't crash export).

### 5.2. E2E Tests
*   [ ] Create Definition "Email" (ValueObject).
*   [ ] Create Definition "User" (Entity).
*   [ ] Add attribute "email" to User of type "Email".
*   [ ] Verify the reference is saved.
