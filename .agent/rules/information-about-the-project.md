---
trigger: always_on
---

---
name: Weavr Project Guide
description: "High-level overview of Weavr: A local-first, peer-to-peer Event Modeling tool."
category: "Local-First / P2P Modeling"
author: "Rolf Madsen"
tags: ["react", "typescript", "gundb", "konva", "local-first", "p2p", "ddd"]
---

# Weavr Project Guide

## Project Overview
Weavr is a serverless, peer-to-peer Event Modeling tool. Unlike traditional cloud tools, Weavr is **local-first**, meaning data is stored in the browser's IndexedDB and synchronized directly between peers using GunDB.

## Tech Stack
- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State & Sync**: GunDB (P2P Graph Database)
- **Canvas Rendering**: Konva & React-Konva
- **Styling**: Tailwind CSS v4 (Glassmorphism)
- **Graph Layout**: ELKjs (Calculated in a Web Worker)
- **Spatial Indexing**: RBush (Crucial for performance)
- **Testing**: Vitest

## Technical Standards
> [!IMPORTANT]
> All development must strictly follow the **[CODING_GUIDELINES.md](file:///home/rolfmadsen/Github/weavr/CODING_GUIDELINES.md)**.

### SCEP Architecture
Weavr follows the **Screen, Command, Event, Projection** pattern. 
- **NO Business Logic in UI**: Components must only emit commands.
- **Handlers**: Logic resides in command handlers that emit facts.
- **Projections**: State is projected into the `ModelingStore` (Zustand) and GunDB.

### THE MUI BAN
Weavr has a **strict ban on Material UI (`@mui/*`)**. All new components must use Tailwind v4 and follow the Glassmorphism tokens.

## Getting Started
1. `npm install`
2. `npm run dev`
3. `npm run build` (Run frequently to verify SCEP integrity).