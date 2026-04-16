# STATE_VIEW Pattern — Prompt Template

## Mønster

```
Screen ← ReadModel ← DomainEvent(s) [from other slices]
```

"En bruger ser data uden at ændre noget."

## Påkrævede Elementer

| Element | Prefix | Antal | Formål |
|:--------|:-------|:------|:-------|
| Screen | `scr_` | ≥1 | UI der viser data |
| ReadModel | `rm_` | ≥1 | Projicerer fra events |

## FORBUDT i STATE_VIEW

- ❌ Command — ingen tilstandsændring
- ❌ Screen → Command forbindelser

## Påkrævede Flows

```
READMODEL → SCREEN (displayed by)
```

## Specification Regler for STATE_VIEW

```
Given: SPEC_EVENT      → "Givet at hændelse X er sket..."
When:  SPEC_READMODEL  → "Når projektionen bygges..."
Then:  SPEC_READMODEL  → "Så vises data Y på skærmen..."
```

## Eksempel Input

> "En studerende ser sin kursusoversigt med karakter og ECTS."

## Forventet Output

- 1 Screen for studenterportalen
- 1 ReadModel "Student Kursushistorik"
- 1 Specification der beskriver hvad der vises
- Fields på begge elementer
