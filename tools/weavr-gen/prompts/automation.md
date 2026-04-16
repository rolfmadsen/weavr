# AUTOMATION Pattern — Prompt Template

## Mønster

```
DomainEvent → Automation → Command → DomainEvent → ReadModel
```

"Systemet reagerer automatisk på en hændelse."

## Påkrævede Elementer

| Element | Prefix | Antal | Formål |
|:--------|:-------|:------|:-------|
| DomainEvent (trigger) | `evt_` | ≥1 | Hændelse der trigger automation |
| Automation | `auto_` | ≥1 | Automatiseret logik |
| Command | `cmd_` | ≥1 | Handling automationen udløser |
| DomainEvent (resultat) | `evt_` | ≥1 | Faktum der opstår |

## FORBUDT i AUTOMATION

- ❌ Screen — ingen brugergrænseflade

## Påkrævede Flows

```
EVENT → AUTOMATION (triggers)
AUTOMATION → COMMAND (issues)
COMMAND → EVENT (results in)
```

## Specification Regler for AUTOMATION

```
Given: SPEC_EVENT     → "Givet at hændelse X indtræffer..."
When:  SPEC_COMMAND   → "Når automationen kører kommando Y..."
Then:  SPEC_EVENT     → "Så udsendes hændelse Z..."
       SPEC_ERROR     → "Eller en fejl logges..."
```

## Eksempel Input

> "Når en studerende tilmelder sig et kursus, opdateres ventelisten automatisk."

## Forventet Output

- 1 DomainEvent "Tilmelding Modtaget" (trigger)
- 1 Automation "Venteliste Processor"
- 1 Command "Opdater Venteliste"
- 1 DomainEvent "Venteliste Opdateret" (resultat)
- 2 Specifications (happy + error)
