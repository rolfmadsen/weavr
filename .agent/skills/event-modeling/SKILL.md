---
name: "Event Modeling Expert"
description: "Expert guide on Adam Dymitruk's Event Modeling methodology for designing information systems using the 7 steps and 4 key patterns."
metadata:
  model: Gemini 3 Pro (High)
---

# Event Modeling Skill

This skill provides comprehensive knowledge about **Event Modeling**, a methodology developed by Adam Dymitruk for designing information systems by mapping events over a timeline.

## Core Core Concepts

*   **Timeline:** The single source of truth. Time flows from left to right.
*   **Events (Orange Sticky):** A fact that happened in the past. Immutable. Naming: Past tense verb (e.g., `UserRegistered`, `OrderShipped`).
*   **Commands (Blue Sticky):** An intent to change the state. Naming: Imperative verb (e.g., `RegisterUser`, `ShipOrder`).
*   **Views / Read Models (Green Sticky):** Information displayed to the user. Naming: Noun or description of data (e.g., `UserProfile`, `OrderHistory`).
*   **Screens / Wireframes (White/Grey):** The visual interface where users interact.
*   **Slices:** A vertical slice representing a single workflow step (Command -> Event -> View).

## Ways of working

1. Keep slices small and focused on a single workflow step.
2. Use the 4 key patterns to describe the system.
3. Use the 7 steps to describe the system.
4. Duplicate nodes to avoid cross-slice dependencies.

## The 4 Key Patterns

### 1. State Change (The "C" in CQRS)
Describes how a user changes the system.
*   **Flow:** `User` -> `Screen (Form)` -> `Command` -> `System` -> `Event`

### 2. State View (The "Q" in CQRS)
Describes how a user sees the system.
*   **Flow:** `Event(s)` -> `Read Model` -> `Screen (View)`

### 3. Translation (External Systems)
Describes adapters for external inputs (Webhooks, APIs).
*   **Flow:** `External System` -> `Translation` -> `Event`

### 4. Automation (Sagas / Process Managers)
Describes side-effects and policies that react to events.
*   **Flow:** `Event` -> `Automation (Logic)` -> `Command`

## Advanced Concepts

### 1. Slices (Vertical Slices)
A "Slice" is the smallest unit of deliverable value in Event Modeling, representing a single path through the timeline.
*   **Definition:** A slice cuts through all architectural layers (UI, Logic, Data) for one specific interaction.
*   **Composition:** `Command` + `System/Logic` + `Event` + `Read Model` + `Screen`.
*   **Goal:** Move away from horizontal layering (e.g., "build the API first") to shipping complete, functional features one by one.

### 2. Aggregates vs. Dynamic Consistency Boundaries (DCB)
Event Modeling challenges the traditional DDD notion of rigid "Aggregates."
*   **Traditional Aggregate:** A cluster of objects with a fixed consistency boundary (e.g., an `Order` class containing `LineItems`). Hard to scale and refactor.
*   **Dynamic Consistency Boundary (DCB):** Consistency is defined by the *business rule* being enforced, not a static object graph.
    *   **Concept:** Instead of loading a massive `Aggregate` to check a rule, you load only the specific *events* needed to validate the current command.
    *   **Example:** To check "User cannot have more than 3 active bookings", you don't need a `User` object; you need a stream of `BookingStarted` and `BookingEnded` events for that user time-window.
    *   **Benefit:** Boundaries become fluid and functional, reducing coupling and increasing performance.



### 3. Wiring Read Models (Backlinks to Screens)
*   **The Problem:** Events (`UserRegistered`) are efficient for storage but bad for display.
*   **The Solution:** Projections (Green Sticky) transform events into *state tables*.
*   **Wiring Flow:** Event -> Projection -> View -> Screen.

### 4. Information Completeness Check (OIC)
A critical validation step to ensure no data appears out of thin air.
*   **Rule:** Every piece of data shown on a Screen (White Sticky) must trace back to a stored Event (Orange Sticky).
*   **The Test:** Pick any field on a UI wireframe (e.g., "User's Last Name").
    *   Trace it back to the Green View.
    *   Trace the View back to the Event that populated it.
    *   Trace the Event back to the Command that caused it.
    *   Trace the Command back to the Screen/User input.
*   **Result:** If you can't trace the lineage, you are missing an event or an input!

### 5. Structuring Large Models
*   **Chapters & Sub-Chapters:** Organize Slices into logical groups (e.g., "Shopping" -> "Items"). Use navigation arrows above the timeline.
*   **Happy Path First:** Model the main success scenario on the core timeline. Move error flows or complex branches to separate boards or linked flows.

### 6. Internal vs. External Data
*   **Internal Events:** Immutable domain facts (`ItemAdded`). Source of truth.
*   **External Data:** Public contracts/Integration events.
*   **Rule:** Never expose internal event streams directly. Use the **Translation Pattern** to convert external data at the boundary.

### 7. Event Streaming vs. Event Sourcing
*   **Event Sourcing:** Persistence. The storage of truth used to rebuild state.
*   **Event Streaming (Kafka):** Transport. Pipes for moving data between services.
*   **Rule:** Do not use the message broker as your Event Store.

## Implementation Patterns (from "Understanding Event Sourcing")

### 1. The Processor-TODO-List Pattern
Used for managing long-running processes or side effects without complex Sagas.
*   **Concept:** Use a Read Model as a "To-Do List" for a background processor.
*   **Flow:**
    1.  `Event A` happens (e.g., `OrderPlaced`).
    2.  Projection adds item to `PendingOrders` table (The To-Do List).
    3.  A Processor polls `PendingOrders`, finds the item, and executes logic (e.g., `ChargeCreditCard`).
    4.  Processor issues `Command` -> `Event B` (e.g., `OrderPaid`).
    5.  Projection listens to `Event B` and removes the item from `PendingOrders`.
*   **Benefit:** Simple, stateful process management using standard Read Models.

### 2. The Reservation Pattern
Used to manage limited resources (e.g., unique emails, seat inventory) in a distributed system.
*   **Problem:** ACID transactions don't span services.
*   **Solution:** Two-step process: **Reserve** then **Confirm**.
*   **Flow:**
    1.  `Command`: `ReserveSeat`.
    2.  **Constraint Check:** Short-lived aggregate checks availability.
    3.  `Event`: `SeatReserved` (or `ReservationFailed`).
    4.  **Confirmation:** If reserved, proceed to payment/finalization.
*   **Key:** Use a specific small aggregate just for the lock/reservation to avoid contention on the main entity.

### 3. Live Models
Read models that are built on-the-fly from the event stream, bypassing the database.
*   **Use Case:** Real-time dashboards or single-entity views where distinct consistency is required.
*   **Trade-off:** No eventual consistency (immediate), but higher CPU usage per request.

### 4. Specialized Patterns
*   **Lookup Tables:** Keep lookup tables (ID -> Name) local to the Slice. Do not create global shared lookup tables to avoid coupling.
*   **Synchronous Projections:** For specific UI needs, update a read model in the same transaction or await its update immediately, trading availability for consistency.

## Operational Topics

### 1. Metadata Tracking (The "Why" and "Who")
Every event must carry metadata to ensure traceability and debugging:
*   **CorrelationID:** Tracks the Business Process ID across multiple services.
*   **CausationID:** Tracks what triggered this event (Command ID or previous Event ID).
*   **UserID:** Who performed the action.

### 2. GDPR & Data Deletion
*   **Data Minimalism:** Store only what is needed.
*   **Crypto-Shredding:** Encrypt sensitive fields with a user-specific key. Delete the key to "forget" the user.
*   **Pruning:** Replay events while omitting sensitive fields to create a sanitized stream.

### 3. Security Modeling
*   **Actor Lanes:** Use swimlanes to visualize *who* is acting (Authentication/Identity).
*   **Explicit Modeling:** Use explicit policies (Automation) or Slices to model permission logic (Authorization). If security is a feature (e.g., "Block User"), model it as a Slice.

## The 7 Steps of Event Modeling

### 1. Brainstorming
*   **Goal:** Capture all domain events.
*   **Action:** Stakeholders generate orange post-its with past-tense events. No structure yet.

### 2. The Plot
*   **Goal:** Order events chronologically.
*   **Action:** Arrange the events on the timeline to tell a coherent story. Remove duplicates.

### 3. The Storyboard
*   **Goal:** Visualize the user journey.
*   **Action:** Add screens/wireframes (top lane) above the events to show where they happen.

### 4. Identify Inputs (Commands)
*   **Goal:** Define intention.
*   **Action:** Add Blue Command post-its between the Screen and the Event.
*   **Validation:** Every state change must be initiated by a Command.

### 5. Identify Outputs (Views)
*   **Goal:** Define information needs.
*   **Action:** Add Green View post-its between Events and Screens.
*   **Validation:** Every piece of data on a screen must come from a stored Event.

### 6. Organize (Conway's Law)
*   **Goal:** Define boundaries and teams.
*   **Action:** Group events into Swimlanes (Contexts) based on subdomains (e.g., Sales, Inventory, Billing).

### 7. Elaborate Scenarios (Specifications)
*   **Goal:** Define business rules.
*   **Action:** For each Command, define:
    *   **Given:** Past events (preconditions).
    *   **When:** The Command is issued.
    *   **Then:** The new Event(s) expected.
