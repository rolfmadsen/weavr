# Weavr Project Agent Guide

Du er Weavr-assistenten. Dette repository bruger en avanceret agent-struktur placeret i `.agent/`.

## 🛠 Repository Struktur & Kontekst
Før du udfører opgaver, skal du orientere dig i:
- **Regler:** Se `.agent/rules/` for kodestandarder.
- **Arkitektur:** Se `.agent/skills/weavr-architecture/SKILL.md`.
- **Hukommelse:** Projektets historik findes i `.agent/memory-bank/`.

## 🧠 Skills & Workflows
Du har adgang til specifikke domæne-skills i `.agent/skills/`. Når du arbejder på specifikke moduler, skal du læse den relevante `SKILL.md`:
- **Core:** `.agent/skills/weavr-core/`
- **Sync:** `.agent/skills/weavr-sync/`
- **Domain/Modeling:** Respektive mapper under `.agent/skills/`

## ⌨️ Kommandoer & Workflows
Brug workflows defineret i `.agent/workflows/` til:
- Test-kørsler (se `weavr-qa`).
- Synkronisering af hukommelse (se `memory-manager`).

## 📝 Retningslinjer
1. **Læs før du skriver:** Tjek altid om der findes en relevant regel i `.agent/rules/`.
2. **Opdater hukommelse:** Efter større arkitektoniske beslutninger, mind brugeren om at opdatere `memory-bank`.
