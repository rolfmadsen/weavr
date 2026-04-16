# INTEGRATION Pattern — Prompt Template

## Mønster (INBOUND)

```
IntegrationEvent → Automation → Command → DomainEvent → ReadModel
```

"Data modtages fra et eksternt system og oversættes til internt domæne."

## Mønster (OUTBOUND)

```
DomainEvent → Automation → IntegrationEvent
```

"Intern data eksporteres til et eksternt system."

## Påkrævede Elementer

| Element | Prefix | Antal | Formål |
|:--------|:-------|:------|:-------|
| IntegrationEvent | `ie_` | ≥1 | Ekstern I/O (context: EXTERNAL) |
| Automation | `auto_` | ≥1 | Oversætter mellem domæner |
| Command | `cmd_` | ≥1 (INBOUND) | Intern handling |
| DomainEvent | `evt_` | ≥1 | Intern hændelse |

## Påkrævede Flows (INBOUND)

```
EVENT(EXTERNAL) → AUTOMATION (triggers)
AUTOMATION → COMMAND (issues)
COMMAND → EVENT (results in)
```

## Specification Regler for INTEGRATION

```
Given: SPEC_EVENT     → "Givet at eksternt system sender data..."
When:  SPEC_COMMAND   → "Når oversættelsen kører..."
Then:  SPEC_EVENT     → "Så registreres intern hændelse..."
       SPEC_ERROR     → "Eller mapping-fejl / timeout logges..."
```

## Eksempel Input

> "STADS sender en karakteropdatering som importeres i universitetets kursusdatabase."

## Forventet Output

- 1 IntegrationEvent "STADS: Karakter Modtaget" (context: EXTERNAL)
- 1 Automation "Karakter Translator"
- 1 Command "Importér Karakter"
- 1 DomainEvent "Karakter Importeret"
- 2 Specifications (happy + mapping error)
