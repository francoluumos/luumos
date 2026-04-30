# Job-Check User-Message Template

**Version:** v0.2
**Last Updated:** 2026-04-30

---

Wie die Form-Inputs des Job-Checks an die Claude API als `user`-Message übergeben werden.

## Format

Strukturierter Block in Markdown-ähnlicher Form. Klar, parseable für das Modell, aber nicht JSON (JSON wirkt manchmal künstlich für LLMs und triggert Schema-Mimikry).

```
Hier sind die Angaben einer Person, die den Luumos Job-Check ausfüllt:

- Beruf: {{role}}
- Branche: {{industry}}
- Unternehmensgrösse: {{company_size}}
- Top 3 Wochenaufgaben:
  1. {{task_1}}
  2. {{task_2}}
  3. {{task_3}}
- Aktuelle KI-Nutzung: {{current_ai_usage_label}}
{% if employment_type %}- Anstellungsart: {{employment_type}}{% endif %}
{% if canton %}- Kanton: {{canton}}{% endif %}

Bitte erstelle die Job-Check-Analyse als JSON-Output gemäss dem System-Prompt.
```

## Felder

| Feld | Pflicht | Typ | Beispiel | Hinweis |
|---|---|---|---|---|
| `role` | ✓ | String | "Sachbearbeiterin Treuhand" | Verbatim aus Form |
| `industry` | ✓ | String | "Treuhand und Wirtschaftsprüfung" | Verbatim aus Form |
| `company_size` | ✓ | Enum | "11-50" | Aus Dropdown: "1-10", "11-50", "51-250", "251-1000", "1000+" |
| `task_1` / `task_2` / `task_3` | ✓ | String | "Lohnbuchhaltung für KMU" | Verbatim, max ~150 Zeichen pro Aufgabe |
| `current_ai_usage` | ✓ | Enum | "ein_paar_mal" | Aus Dropdown. Werte: "noch_nie", "ein_paar_mal", "woechentlich", "taeglich" |
| `employment_type` | optional | Enum | "angestellt" | Default "angestellt" wenn weggelassen |
| `canton` | optional | ISO-Code | "ZH" | 2-Zeichen Kanton-Code |

## Mapping `current_ai_usage` → Label im User-Message

Der enum-Wert wird vor Übergabe ans Modell ins lesbare Label umgewandelt:

| Enum-Wert | Label im Prompt |
|---|---|
| `noch_nie` | "Noch nie genutzt" |
| `ein_paar_mal` | "Ein paar Mal probiert" |
| `woechentlich` | "Wöchentlich" |
| `taeglich` | "Täglich" |

E-Mail wird **nicht** an das Modell übergeben — sie ist kein Analyse-Input und gehört nicht in den LLM-Kontext (Datensparsamkeit).

## Beispiel — voll ausgefüllt

```
Hier sind die Angaben einer Person, die den Luumos Job-Check ausfüllt:

- Beruf: Personalsachbearbeiterin
- Branche: Industrie / Maschinenbau
- Unternehmensgrösse: 251-1000
- Top 3 Wochenaufgaben:
  1. Bewerbungsdossiers sichten und Kandidaten vorselektieren
  2. Arbeitsverträge und Zwischenzeugnisse erstellen
  3. Lohnabrechnungs-Korrekturen bearbeiten und mit Buchhaltung abstimmen
- Aktuelle KI-Nutzung: Ein paar Mal probiert
- Anstellungsart: angestellt
- Kanton: AG

Bitte erstelle die Job-Check-Analyse als JSON-Output gemäss dem System-Prompt.
```

## Beispiel — minimal (nur Pflichtfelder)

```
Hier sind die Angaben einer Person, die den Luumos Job-Check ausfüllt:

- Beruf: Marketing Manager
- Branche: B2B Software
- Unternehmensgrösse: 51-250
- Top 3 Wochenaufgaben:
  1. Content Briefings für Agentur erstellen
  2. Wöchentliche Performance Reports zusammenstellen
  3. E-Mail Newsletter inhaltlich planen und freigeben
- Aktuelle KI-Nutzung: Wöchentlich

Bitte erstelle die Job-Check-Analyse als JSON-Output gemäss dem System-Prompt.
```

## Sicherheits-Hinweis

Die Form muss serverseitig validieren, bevor Inputs an das Modell gehen:

- Maximal-Längen pro Feld erzwingen (z.B. `role` max 100 Zeichen, `task` max 200 Zeichen)
- Bekannte Prompt-Injection-Pattern blockieren ("Ignoriere alle vorherigen", "system:", "[INST]" etc.)
- HTML/Script-Tags strippen
- Encoding normalisieren (NFKC)

Diese Validierung passiert in der Edge Function `analyze-job`, NICHT erst im LLM-Prompt.
