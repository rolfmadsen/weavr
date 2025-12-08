# Building a Serverless Collaboration Tool with GunDB and React

> This article explains the architectural decisions behind Weavr, a Local-First Event Modeling tool.

In an era of centralized SaaS, **Local-First software** is a breath of fresh air. It promises user ownership of data, offline capabilities, and zero-latency interfaces. But how do you build a real-time collaborative tool without a central database?

Weavr answers this using a stack designed for privacy and peer-to-peer (P2P) synchronization: **React + GunDB**.

## The Stack

- **Frontend**: React (Vite)
- **State/Database**: GunDB (Decentralized graph database)
- **Layout**: ELK (Eclipse Layout Kernel) via Web Workers
- **Styling**: TailwindCSS + Material UI

## Why GunDB?

[GunDB](https://gun.eco/) is a graph database that runs in the browser. It allows Weavr to be:

1.  **Serverless**: There is no backend API to manage. Browsers connect directly to each other (via WebRTC/relay peers) to sync data.
2.  **Reactive**: Subscribing to data changes is native. When Peer A adds a node, Peer B receives the update instantly.
3.  **Offline-Capable**: Data persists in `localStorage` (or IndexedDB). You can keep working if your internet drops.

## The Event Modeling Challenge

[Event Modeling](https://eventmodeling.org/) requires a strict grammar:
- **Commands** trigger **Events**.
- **Events** update **Read Models**.
- **Read Models** populate **Screens**.

Generic tools like Miro allow you to draw invalid connections (e.g., Command -> Screen). Weavr enforces these rules at the schema level.

### Validating Connections

In Weavr, validation isn't just a UI hint; it's part of the purity of the model.

```typescript
// Example of validation logic
const isValidConnection = (sourceType, targetType) => {
  if (sourceType === 'Command' && targetType === 'DomainEvent') return true;
  if (sourceType === 'DomainEvent' && targetType === 'ReadModel') return true;
  return false;
};
```

## Conclusion

Weavr demonstrates that complex, domain-specific tooling doesn't require complex infrastructure. By leveraging Local-First principles, we give power back to the developer—both in how they model their systems and in how they own their data.

Check out the source code to see how we implemented P2P syncing:
[View on GitHub](https://github.com/rolfmadsen/weavr)
