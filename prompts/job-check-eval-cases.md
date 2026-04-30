# Job-Check Eval Cases v0.1

Test-Inputs für Prompt-Regression und Qualitätsprüfung. Vor jeder Prompt-Änderung gegen alle Cases laufen lassen, Outputs mit Vorgängerversion vergleichen.

**Bewertungskriterien pro Case:**

1. **Schema-Validität** — JSON parst, alle Pflichtfelder vorhanden, alle Längen-Constraints eingehalten (binary)
2. **Tonalität** — keine verbotenen Phrasen, "Sie"-Anrede, hochdeutsch, sachlich (binary)
3. **Konkretheit** — Tool-Empfehlungen sind real und passend, Aufgaben werden namentlich aufgegriffen, nicht generisch (1-5)
4. **Schweiz-Bezug** — passende Schweizer/EU-Tools, Kontext (1-5)
5. **Score-Plausibilität** — leverage_score korreliert mit Input-Reichtum (1-5)
6. **Hilfreich vs. Hype** — Output gibt nutzbare Anhaltspunkte ohne Doom-Verkauf (1-5)

Pass-Kriterium pro Case: alle binären Kriterien grün, alle Skala-Kriterien ≥ 3.

---

## Case 1 — Treuhand-Sachbearbeiterin (Standard-ICP)

**Input:**
```
- Beruf: Sachbearbeiterin Treuhand
- Branche: Treuhand und Wirtschaftsprüfung
- Unternehmensgrösse: 11-50
- Top 3 Wochenaufgaben:
  1. Lohnbuchhaltung für KMU-Mandate (Lohnabrechnungen, Sozialversicherungen)
  2. MWST-Abrechnungen vorbereiten und einreichen
  3. Mandantenkommunikation per E-Mail (Rückfragen, Belegnachforderung)
- Aktuelle KI-Nutzung: Noch nie genutzt
- Kanton: SG
```

**Erwartung:**
- `improve_today` deckt mindestens 2 der 3 Aufgaben ab (Lohn, MWST oder Mandantenkommunikation)
- Empfehlungen sind absolut einsteigerfreundlich (EIN Tool, EIN konkreter Workflow); keine API/Make/Zapier-Vorschläge
- Tool-Empfehlung enthält Schweizer Buchhaltungs-Tool (Bexio, Abacus, Banana)
- `learn_next_year` enthält "Prompten" oder "KI-Grundlagen"
- `leverage_score` zwischen 55 und 80
- `stays_human` enthält Mandantenbeziehung oder finale Verantwortung

---

## Case 2 — HR-Personalsachbearbeiterin (Konzern)

**Input:**
```
- Beruf: Personalsachbearbeiterin
- Branche: Industrie / Maschinenbau
- Unternehmensgrösse: 251-1000
- Top 3 Wochenaufgaben:
  1. Bewerbungsdossiers sichten und Kandidaten vorselektieren
  2. Arbeitsverträge und Zwischenzeugnisse erstellen
  3. Lohnabrechnungs-Korrekturen bearbeiten
- Aktuelle KI-Nutzung: Ein paar Mal probiert
- Anstellungsart: angestellt
- Kanton: AG
```

**Erwartung:**
- `improve_today` thematisiert CV-Screening und/oder Zeugnis-Erstellung als KI-machbar
- DSG/Datenschutz-Erwähnung bei sensitiven Daten (Bewerbungsunterlagen) — wichtig in HR
- Empfehlung enthält Microsoft Copilot (passt zu grösseren Konzernen mit M365)
- `stays_human` enthält "Bauchgefühl bei Kandidatenauswahl" oder "schwierige Mitarbeitergespräche"

---

## Case 3 — Versicherungsfachmann (Aussendienst)

**Input:**
```
- Beruf: Kundenberater Versicherung
- Branche: Versicherungen
- Unternehmensgrösse: 1000+
- Top 3 Wochenaufgaben:
  1. Bedarfsanalysen mit Privatkunden vor Ort
  2. Offerten erstellen und Vertragsanträge erfassen
  3. Schadensfälle dokumentieren und an Innendienst weitergeben
- Aktuelle KI-Nutzung: Noch nie genutzt
- Anstellungsart: angestellt
- Kanton: BE
```

**Erwartung:**
- `stays_human` thematisiert Kundengespräch / Vertrauensaufbau dominant
- `improve_today` zeigt Offerten-Erstellung und Schaden-Dokumentation als KI-Hebel
- `leverage_score` eher tief (35-55) — Aussendienst hat per se weniger automatisierbare Aufgaben als reine Bürorollen

---

## Case 4 — Marketing Manager B2B (Mittelstand)

**Input:**
```
- Beruf: Marketing Manager
- Branche: B2B Software
- Unternehmensgrösse: 51-250
- Top 3 Wochenaufgaben:
  1. Content Briefings für externe Agentur erstellen
  2. Wöchentliche Performance Reports aus Google Analytics, HubSpot, LinkedIn zusammenstellen
  3. E-Mail Newsletter inhaltlich planen und Korrektur lesen
- Aktuelle KI-Nutzung: Täglich
```

**Erwartung:**
- `improve_today` deckt alle 3 Aufgaben — Marketing ist sehr KI-affin
- Empfehlungen Power-User-Niveau: Claude Projects, Custom GPTs, Make-Workflows mit KI-Knoten, evtl. Anthropic API via Zapier
- `leverage_score` hoch (75-95) — Marketing hat hohen KI-Hebel UND Person ist daily user
- `learn_next_year` thematisiert "Multi-Tool-Workflows", "RAG mit eigenem Content-Archiv", oder "Agentic Pipelines"

---

## Case 5 — Geschäftsleitungs-Assistent (Edge: Führungs-Adjazent)

**Input:**
```
- Beruf: Assistent der Geschäftsleitung
- Branche: Industrie / Lebensmittel
- Unternehmensgrösse: 51-250
- Top 3 Wochenaufgaben:
  1. Sitzungsprotokolle, Präsentationen für die GL vorbereiten
  2. Reisebuchungen und Spesenabrechnungen koordinieren
  3. Kommunikation zwischen GL und Bereichsleitern (E-Mails, Termine)
- Aktuelle KI-Nutzung: Wöchentlich
- Kanton: ZH
```

**Erwartung:**
- `improve_today` deckt Protokoll-Generierung (Otter, Fathom) und Präsentations-Erstellung
- Empfehlungen auf Workflow-Optimierungs-Niveau: Templates, mehrere Tools verkettet (z.B. Otter → Claude → Word)
- `stays_human` thematisiert Vertraulichkeit, politisches Fingerspitzengefühl in der Kommunikation
- DSG-Hinweis bei sensiblen Sitzungsinhalten

---

## Case 6 — Edge: Unsinniger Input (Validation muss greifen)

**Input:**
```
- Beruf: asdf
- Branche: lkjsdf
- Unternehmensgrösse: 11-50
- Top 3 Wochenaufgaben:
  1. xx
  2. yy
  3. zz
- Aktuelle KI-Nutzung: Noch nie genutzt
```

**Erwartung:**
- `validation_error: true`
- `validation_message` höflich auf Hochdeutsch, "Sie"-Anrede, weist auf das fehlende sinnvolle Input hin
- Alle Sektionen leer, `leverage_score: null`
- Disclaimer trotzdem vorhanden
- KEINE Erfindung von Job-Inhalten

---

## Test-Routine

Vor jedem Prompt-Update:

```bash
# Pseudo-code, in Schritt 4 (Edge Function) auspusht zu CLI-Tool
npm run eval -- --prompt prompts/job-check-system.md --cases prompts/job-check-eval-cases.md
```

Output: ein Markdown-Report mit pass/fail pro Case und Diff zur Vorversion.

## Score-Konsistenz-Test (separat)

Jeden Case 5x mit derselben Input laufen lassen, `leverage_score`-Streuung messen.
Akzeptanzkriterium: max. ±5 Punkte Streuung. Wenn überschritten, ist der Score-Algorithmus zu vage definiert und der Prompt braucht klarere Berechnungsleitlinien.
