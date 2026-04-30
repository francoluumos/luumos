# Setup — Local & Cloud

Schritt-für-Schritt, um Luumos lokal zu entwickeln und mit Supabase + Lovable + GitHub zu verdrahten.

---

## 1. GitHub-Repo verbinden

Im Terminal, im Ordner `luumos/`:

```bash
git init
git add .
git commit -m "Initial scaffold"
git branch -M main
git remote add origin https://github.com/francoluumos/luumos.git
git push -u origin main
```

(Wenn SSH konfiguriert: `git@github.com:francoluumos/luumos.git`)

**Tipp:** Vor dem ersten Push prüfen, dass `.gitignore` aktiv ist und keine `.env`-Datei dabei ist:

```bash
git status              # sollte keine .env-Files zeigen
git ls-files | grep env # sollte leer sein
```

## 2. Supabase-Schema initial laden

Zwei Optionen:

### Option A: Supabase CLI (empfohlen — versionierbar)

```bash
# Falls noch nicht installiert
brew install supabase/tap/supabase

# Im Repo-Root:
supabase login
supabase link --project-ref kxuppoyqtzktqhbdrcya

# Schema als Migration registrieren
mkdir -p supabase/migrations
cp data-model/supabase-schema.sql supabase/migrations/20260430000000_initial_schema.sql

supabase db push
```

### Option B: SQL Editor im Supabase Dashboard

1. Im Supabase-Projekt: SQL Editor → New Query
2. Inhalt von `data-model/supabase-schema.sql` reinkopieren
3. Run → prüfen, dass alle Tabellen erstellt wurden (Database → Tables)

## 3. Environment-Variablen lokal

```bash
cp .env.example .env.local
# .env.local mit echten Werten füllen
```

Werte zu finden:
- **Supabase URL + Keys:** Supabase-Dashboard → Project Settings → API
- **Anthropic Key:** [console.anthropic.com](https://console.anthropic.com) → API Keys
- **Beehiiv Key:** Beehiiv-Dashboard → Settings → API

## 4. Lovable-Projekt anlegen

1. [lovable.dev](https://lovable.dev) → New Project
2. Name: "Luumos"
3. Build: erste Prompt für Lovable, z.B.:
   > "Create a single-page web app called Luumos. Brand: clean, calm, Swiss professional aesthetic. Use these design tokens: [paste content of design-system/tokens.css]. Use Inter for body, Assistant for headers, Inconsolata for the wordmark. The page has a hero section with the headline 'Welche Aufgaben in Ihrer Rolle könnten Sie heute schon mit KI schneller erledigen?' and a CTA button 'Job-Check starten'."
4. Settings → Connect Supabase: URL und Anon Key einfügen
5. Settings → Connect GitHub: dieses Repo wählen, Pfad `lovable-app/`

## 5. Erste Edge Function (kommt in Schritt 2)

Wird im nächsten Bauschritt zusammen mit dem Job-Check-System-Prompt scaffolded:

```
supabase/
  functions/
    analyze-job/
      index.ts
```

## Häufige Stolpersteine

- **`.env.local` versehentlich gepusht:** `git rm --cached .env.local` und neuen `commit + push`. Danach Keys rotieren (Supabase + LLM).
- **Supabase-RLS blockiert Inserts:** RLS ist enabled, aber Policies fehlen noch. Bis zur Policy-Definition entweder Service-Role-Key benutzen (server-side only) oder RLS temporär in Dev disablen.
- **Lovable kann nicht auf Supabase zugreifen:** in Supabase-Dashboard → Authentication → URL Configuration → Lovable-Domain als Site-URL eintragen.

## Checklist vor erstem Live-Test des Job-Checks

- [ ] Supabase-Schema deployed
- [ ] RLS-Policies definiert (anon: insert users + submissions; nichts sonst)
- [ ] LLM-API-Key in Supabase Edge Function Secrets hinterlegt (NICHT im Lovable-Frontend)
- [ ] Edge Function `analyze-job` deployed und manuell getestet
- [ ] Datenschutzerklärung verlinkt vom Formular
- [ ] Double-Opt-in für Newsletter funktioniert (Beehiiv-Integration)
- [ ] Plausible (oder Analytics-Tool) eingebaut
