---
name: weavr-i18n
description: "Internationalization (i18n) implementation and best practices in Weavr."
category: "Localization"
author: "Antigravity"
tags: ["i18n", "react-i18next", "scep", "localization"]
---

# Weavr Internationalization (i18n) Skill

## Overview
Weavr uses `react-i18next` for multi-language support. The implementation follows the **SCEP (Screen, Command, Event, Projection)** architecture to ensure language changes are validated and persisted correctly across the P2P network.

## Architecture Integration

### 1. The SCEP Loop for Language Changes
Changing the language is treated as a domain intent:
1.  **UI (Screen)**: `LanguageSelector.tsx` emits the `workspace:changeLanguage` command.
2.  **Handler**: `workspaceCommands.ts` validates the language code and emits a `workspace:languageChanged` event.
3.  **Projector**: `projector.ts` listens for the event, updates the `i18n` instance (`i18n.changeLanguage`), and syncs the `WorkspaceStore`.

### 2. State Management
- **Zustand**: `useWorkspaceStore` holds the current `language`.
- **Persistence**: `i18next-browser-languagedetector` handles initial detection and persistence in `localStorage`.

## Implementation Details

### Locale Files
Translations are stored in `src/shared/i18n/locales/` as JSON files:
- `en.json` (English - Source of Truth)
- `da.json` (Danish)
- `de.json` (German)
- `fr.json` (French)

### Usage in Components

#### Simple Text
```tsx
const { t } = useTranslation();
return <button>{t('common.save')}</button>;
```

#### Complex Text with HTML/Formatting
Use the `Trans` component when translations contains HTML tags or require specific component injection (like keyboard shortcuts).

```tsx
<Trans 
  i18nKey="help.controlsContent.pan" 
  components={{ kbd: <Kbd /> }} 
/>
```

### Date Formatting
Always use `i18n.language` to ensure dates match the UI language:
```tsx
new Date(timestamp).toLocaleDateString(i18n.language, { ... });
```

## Best Practices
1.  **No Hardcoded Strings**: All user-facing text must use `t()` or `Trans`.
2.  **Kbd Tags**: Use `<kbd>` tags in JSON for keyboard shortcuts and map them to the shared `Kbd` component via `Trans`.
3.  **Validation**: Commands should validate that the requested language is supported.
4.  **Accessibility**: Always provide `aria-label` or `alt` text translations for icons and buttons.
