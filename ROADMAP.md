# Weavr Public Launch Roadmap

This document outlines the key features, enhancements, and tasks required to prepare Weavr for a public v1.0 release. The focus is on moving from a powerful but expert-focused tool to a polished, stable, and user-friendly product that is accessible to a wider audience.

---

## 🎯 Phase 1: Core Experience & UX Polish

This phase focuses on refining the core modeling experience to be more intuitive, forgiving, and professional.

-   **[ ] Comprehensive Undo/Redo:** Implement a rock-solid undo/redo system that is fully compatible with all actions, including collaborative changes from other peers.
-   **[ ] Advanced Canvas Controls:**
    -   **Snapping & Alignment Guides:** Help users create clean, professional-looking diagrams with ease.
    -   **Rich Text Formatting:** Allow bold, italics, lists, and links within element descriptions to capture more detailed context.
-   **[ ] Enhanced Keyboard Shortcuts:** Expand the existing shortcut system (`shortcuts.ts`) to cover all major actions and provide an in-app reference for users.
-   **[ ] Customizable Views:** Build on the existing `SliceFilter` to allow users to create and save custom views, perhaps by filtering elements based on user-defined tags or keywords.

---

## 🤝 Phase 2: Collaboration & Data Integrity

This phase ensures that the innovative but complex P2P architecture is robust, transparent, and trustworthy for users.

-   **[ ] User Presence Indicators:** Show which users are currently active on a model and what they are selecting or editing in real-time.
-   **[ ] Robust Backup & Restore:** Create a user-friendly interface for creating local "snapshots" of a model and restoring them, protecting users from accidental data loss from clearing browser caches.
-   **[ ] Clear Conflict Handling:** While GunDB handles data merging, the UI needs to gracefully manage simultaneous edits on the same element (e.g., two users editing the same node's title), preventing one user from silently overwriting another's work.
-   **[ ] Optional Cloud Backup:** To build trust, offer an *optional* integration for users to back up their encrypted model data to their own cloud storage (e.g., Google Drive, Dropbox), respecting the local-first philosophy while providing a critical safety net.

---

## 🧩 Phase 3: Information Completeness & Wireframing

This phase transforms Weavr from a "Box & Arrow" tool into a "System Architect's Console". We focus on ensuring that the visual model physically guarantees the completeness of the data model.

-   **[ ] Low-Fidelity UI Builder (Wireframes):**
    -   **Concept:** Instead of a blank white box, the `Screen` node becomes a structured wireframe container.
    -   **Features:** Users can drop basic UI elements (Input, Button, List, Label) onto a Screen node.
    -   **Benefit:** Allows for rapid prototyping and ensures that every data field required by a Command is physically present on the Screen.

-   **[ ] Schema Binding (The "Completeness Check"):**
    -   **Concept:** Visually validate that the UI matches the Logic.
    -   **Logic:** If a `Screen` is connected to a `Command`, the system checks if the Screen's inputs match the Command's required fields.
    -   **Visual Feedback:**
        -   ✅ **Green Check:** All Command fields are represented on the Screen.
        -   ⚠️ **Yellow Warning:** "Command 'Submit Order' requires 'ShippingAddress', but Screen 'Checkout' is missing this input."

-   **[ ] Image & Asset Support:**
    -   Allow users to paste images (e.g., screenshots, high-fi designs) onto Screen nodes as an alternative to wireframes, supporting "Design Reference" workflows.

---

## Entities and Aggregates in the Information Completeness Check

Considering how Event Modeling works, I would like to change the concept for Lined Entities.

It does not make sense to add an entire entity to a node because the node will only depende on a subset of data from the entity which is what the projection of the READ MODEL is designed for.

What is most interesting is the "Information Completenes Check" ... and the chain of dependencies between the elements in the Event Model.

1. From any element, it should be possible to select 0 or more entities, and for any entity chosen to select 0 or more attributes.
2. From the Properties tab I would lke to be able to select from existing or create new entities