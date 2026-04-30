# Design System

Single source of truth für Brand-Tokens, Typografie, Farben, Voice & Tone.

## Inhalt

- **`brand-tokens.json`** — kanonische Token-Definition (Fonts, Farben, Spacing, etc.)
- **`tokens.css`** — CSS Custom Properties zum Einbinden in Lovable / Web-Frontend
- **`voice-and-tone.md`** — Schreibrichtlinien, Wörterlisten, Beispiele
- **`fonts/`** — (später) selbst gehostete Font-Dateien, falls von Google Fonts wegmigriert
- **`logo/`** — (später) Logo-Dateien (SVG primär, PNG-Fallback)

## Workflow

1. **Token ändern** → erst `brand-tokens.json`, dann `tokens.css` synchron updaten
2. **Neue Farbe definieren** → in beide Files einfügen, Use-Case dokumentieren
3. **Voice-Regel ändern** → `voice-and-tone.md` updaten, Beispiel ergänzen

## Offene Punkte

- [ ] Farbpalette definieren (aktuell nur Neutral-Skala vorhanden, Primary + Semantic = TBD)
- [ ] Body-Font final entscheiden: Inter (empfohlen) vs. Inconsolata (riskanter Lesetradeoff)
- [ ] Logo-Files exportieren (SVG, PNG, Favicon) und in `logo/` ablegen
- [ ] Komponenten-Bibliothek-Mapping zu Lovable definieren (Button, Input, Card, Badge)
