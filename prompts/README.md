# Prompts

System- und User-Prompts für alle KI-Aufrufe in Luumos. Versionierung ist wichtig — Prompt-Änderungen verändern das Produkt-Verhalten in einer Art, die ein A/B-Test rechtfertigt.

## Inhalt

- **`job-check-system.md`** — System-Prompt für die Job-Check-Analyse (Skelett — wird in Phase 1 ausgearbeitet)
- **`job-check-output-schema.json`** — (kommt in Schritt 2) JSON-Schema für strukturierten Output
- **`job-check-eval-cases.md`** — (kommt in Schritt 2) Test-Fälle für Prompt-Regression

## Versionierungs-Konvention

- Bei jeder substantiellen Prompt-Änderung: Versions-Header in der Datei aktualisieren (`v0.1`, `v0.2`, etc.) und Changelog am Ende der Datei
- Vor produktivem Rollout: gegen `eval-cases.md` testen
- A/B-Tests werden in `decisions.md` als ADR dokumentiert
