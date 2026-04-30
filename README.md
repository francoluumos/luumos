# Luumos

Schweizer Bildungs- und Community-Marke für Berufstätige zwischen 45 und 58, die KI als Werkzeug nutzen lernen, statt von ihr verdrängt zu werden.

> Mit HI die KI führen.

**Status:** Vor-MVP. Phase 1 (Job-Check) in Vorbereitung.

---

## Was ist in diesem Repo

Dieses Repo ist die **technische und konzeptuelle Quelle** für Luumos. Alles, was dauerhaft und versionierbar ist, gehört hierher. Operatives, Tagesgeschäft, Custdev-Notizen, Finanzplanung leben weiter in Notion / Google Drive.

| Ordner | Inhalt | Wer braucht das |
|---|---|---|
| `docs/` | Konzept, Architektur-Entscheidungen, Content-Strategie | Strategie, Lovable-Builder, neue Mitstreiter |
| `design-system/` | Brand-Tokens (Fonts, Farben), Voice & Tone, Logo-Assets | Lovable, Designer, Content-Production |
| `prompts/` | System- und User-Prompts für KI-Aufrufe (Job-Check) | Lovable, Backend |
| `data-model/` | Supabase-Schema, ER-Diagramme, Migrationen | Lovable, Backend |
| `lovable-app/` | (später) synchronisierter Lovable-Code | Lovable Auto-Sync |
| `customer-research/` | (später) anonymisierte Interview-Transkripte und Synthesen | Strategie |

## Aktueller Stand wichtiger Entscheidungen

- **Narrative:** Empowerment-first ("HI + KI", nicht "HI vs. KI")
- **ICP v1:** Schweizer Angestellte 45–58 in Treuhand, HR, Versicherung, Marketing, Sachbearbeitung
- **Sprachen:** Audio (Podcast) auf Schweizerdeutsch, alles Geschriebene auf Hochdeutsch
- **Backend:** Supabase (EU/Frankfurt), Lovable als Frontend-Builder
- **Sequenzierung:** (1) Job-Check → (2) Podcast/Newsletter → (3) Schule (frühestens Q1 2027)

Volltext und Begründung: [`docs/decisions.md`](docs/decisions.md).

## Wie damit arbeiten

1. **Strategie/Konzept ändern?** → in `docs/concept.md` und `docs/decisions.md` erfassen, neue ADR-Nummer
2. **Brand-Token ändern?** → `design-system/brand-tokens.json` (single source of truth) und `tokens.css` updaten
3. **Job-Check-Prompt ändern?** → `prompts/job-check-system.md` versionieren (wichtig: Outputs sind LLM-abhängig, A/B-Tests dokumentieren)
4. **Supabase-Schema-Änderung?** → Migration in `data-model/migrations/` anlegen, niemals Schema-File direkt überschreiben

## Externe Quellen

- **Konzept (kanonisch):** [`docs/concept.md`](docs/concept.md)
- **Domain:** [luumos.io](https://luumos.io)
- **GitHub Repo:** [github.com/francoluumos/luumos](https://github.com/francoluumos/luumos)
- **Supabase-Projekt:** [kxuppoyqtzktqhbdrcya.supabase.co](https://kxuppoyqtzktqhbdrcya.supabase.co) — Project Ref: `kxuppoyqtzktqhbdrcya`
- **Lovable-Projekt:** TBD (URL einfügen, sobald angelegt)
- **Notion-Workspace (Operations):** TBD

## Lizenz

Privates Projekt. Kein offener Code, keine offene Markenverwendung ohne Absprache.
