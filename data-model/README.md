# Data Model

Datenmodell für Luumos. Backend = Supabase (PostgreSQL).

## Inhalt

- **`supabase-schema.sql`** — initiales Schema v0.1 (users, roles, companies, job_check_submissions, newsletter_events)
- **`migrations/`** — (später) versionierte Schema-Änderungen via Supabase CLI

## Designentscheidungen

**1. Raw-Input bleibt erhalten, kanonische Referenzen werden async aufgelöst.**

Wenn jemand "Sachbearbeiterin Buchhaltung Treuhandbüro" als Berufsbezeichnung eingibt, speichern wir das verbatim in `job_check_submissions.raw_role_input`. Eine Edge Function (oder Batch-Job) ordnet das später einer kanonischen Rolle in `roles` zu. Vorteile: keine Datenverluste, neue Aliase werden erkannt, frühe Submissions liefern Signal für die Library-Konstruktion.

**2. Library-Aufbau passiert iterativ.**

In den ersten 200–500 Submissions sehen wir, wie echte Schweizer Berufstätige ihre Jobs benennen. Erst dann startet die LLM-assistierte Kanonisierung — vorher fehlen die Daten für gute Cluster.

**3. DSG / UWG zuerst.**

Jede Einwilligung wird in `newsletter_events` mit IP + Timestamp gespeichert (Beweis der Einwilligung). `users.deleted_at` für Soft-Delete bei Lösch-Anfrage. Personenbezogene Spalten sind dokumentiert.

**4. Edge Functions, keine direkten Anon-Inserts in sensible Tabellen.**

Lovable-Frontend ruft Edge Functions auf (z.B. `analyze-job`, `confirm-newsletter`). Anon-Key kann nicht direkt in `users` schreiben — das schützt vor Spam und ermöglicht serverseitige Validierung.

## Wichtige Anwendungsabläufe

### Job-Check Submission

```
1. User füllt Formular aus (Lovable)
2. Lovable POST → Edge Function `analyze-job`
3. Edge Function:
   a) erstellt user (falls neu) oder findet existierend per email
   b) erstellt job_check_submissions row mit raw_* Feldern
   c) ruft Claude/GPT API mit System-Prompt + User-Inputs
   d) speichert ai_output, model, tokens, cost
   e) versucht resolved_role_id zu setzen (fuzzy match gegen roles.aliases)
   f) gibt Output an Frontend zurück
4. Frontend rendert Output, bietet Newsletter-Opt-in + Share-Button
```

### Newsletter Double-Opt-in

```
1. User klickt "Newsletter abonnieren" auf Result-Seite
2. Edge Function `subscribe-newsletter`:
   a) updates users.newsletter_opt_in = true (provisorisch)
   b) inserts newsletter_events('opt_in_started', ip, ua)
   c) sends confirmation email mit token
3. User klickt Bestätigungslink
4. Edge Function `confirm-newsletter`:
   a) sets users.email_confirmed_at = now()
   b) inserts newsletter_events('opt_in_confirmed', ip, ua)
   c) triggers Beehiiv-Sync (oder welcher Newsletter-Provider)
```

## Offene Punkte vor Phase 1 Launch

- [ ] Initial Seed-Daten für `roles` (50 häufigste Schweizer White-Collar-Berufe)
- [ ] Initial Seed-Daten für `companies` (Top 100 Schweizer Arbeitgeber im KMU-Bereich)
- [ ] RLS-Policies definieren und testen
- [ ] Datenschutzerklärung verlinken zu Datenfeldern (Mapping was wo gespeichert wird)
- [ ] Backup-Strategie (Supabase Pro hat tägliche Backups; Free Tier = manuell)
- [ ] Newsletter-Provider-Wahl finalisieren (Beehiiv vs. eigene Mailing-Logik)
