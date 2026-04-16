# STATE_CHANGE Pattern — Prompt Template

## Mønster

```
Screen → Command → DomainEvent → ReadModel → Screen (loop)
```

"En bruger gør noget, der ændrer tilstand i systemet."

## Påkrævede Elementer

| Element | Prefix | Antal | Formål |
|:--------|:-------|:------|:-------|
| Screen | `scr_` | ≥1 | UI hvor brugeren interagerer |
| Command | `cmd_` | ≥1 | Brugerens intent |
| DomainEvent | `evt_` | ≥1 | Det immutable faktum |
| ReadModel | `rm_` | ≥1 | Den opdaterede tilstand |

## Påkrævede Flows (dependencies)

```
SCREEN → COMMAND (triggers)
COMMAND → EVENT (results in)
EVENT → READMODEL (populates)
READMODEL → SCREEN (displayed by)
```

## Specification Regler for STATE_CHANGE

```
Given: SPEC_READMODEL  → "Givet at tilstanden er X..."
When:  SPEC_COMMAND     → "Når brugeren gør Y..."
Then:  SPEC_EVENT       → "Så registreres hændelsen Z..."
       SPEC_READMODEL   → "Og tilstanden opdateres til W..."
       SPEC_ERROR       → "Eller en fejl vises..."
```

## Eksempel Input

> "En underviser opretter et nyt kursus med titel, ECTS-point og semester."

## Forventet Output

Generer en `Slice` med:
- 1 Screen for kursusoprettelse
- 1 Command for oprettelse
- 1 DomainEvent "Kursus Oprettet"
- 1 ReadModel "Kursusoversigt"
- 2 Specifications (happy + error)
- Fields på ALLE elementer
- Dependencies der følger flows ovenfor
