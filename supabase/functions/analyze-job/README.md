# Edge Function: analyze-job

Nimmt Job-Check-Form-Inputs entgegen, validiert serverseitig, ruft Claude Sonnet 4.6 mit System-Prompt + User-Template, validiert den Output gegen das JSON-Schema, persistiert in Supabase, gibt das Resultat zurück.

## Deployment

```bash
# Einmalig: Secrets in Supabase setzen
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set LLM_MODEL=claude-sonnet-4-6
# SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden automatisch injiziert

# Function deployen
supabase functions deploy analyze-job
```

## Test (lokal)

```bash
supabase functions serve analyze-job --no-verify-jwt

# In separatem Terminal:
curl -X POST http://localhost:54321/functions/v1/analyze-job \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.ch",
    "role": "Sachbearbeiterin Treuhand",
    "industry": "Treuhand und Wirtschaftsprüfung",
    "company_size": "11-50",
    "weekly_tasks": [
      "Lohnbuchhaltung für KMU",
      "MWST-Abrechnungen",
      "Mandantenkommunikation"
    ],
    "current_ai_usage": "ein_paar_mal",
    "canton": "SG"
  }'
```

## Wichtige TODOs vor Production-Rollout

- [ ] **System-Prompt vollständig aus `prompts/job-check-system.md` einsetzen** — aktueller Code hat Stub-Platzhalter, vor Deploy verifizieren
- [ ] **CORS-Origin tightenen** auf `https://luumos.io` (aktuell `*` für Dev)
- [ ] **Rate-Limiting** einbauen (z.B. max 5 Requests pro IP pro Stunde, via Upstash Redis oder Supabase eigene Mechanismen)
- [ ] **Token-Budget** prüfen — wenn >2000 output tokens, Prompt anpassen oder max_tokens erhöhen
- [ ] **Cost-Tracking** kalibrieren — `estimateCostChf` mit echten Sonnet 4.6 Preisen aktualisieren, sobald verfügbar
- [ ] **Newsletter-Opt-in-Flow** als separate Function (`subscribe-newsletter`)
- [ ] **Share-Token generieren** wenn `shared_publicly: true` gesetzt wird (separater Endpoint)
- [ ] **DSG-Audit-Log** — bei Anfrage-Eingang `newsletter_events` mit Event-Type 'job_check_submitted' insert (falls Newsletter-Opt-in dabei)

## Bekannte Edge Cases

- **LLM gibt Markdown-Codeblock zurück trotz Anweisung:** der Code stripped \`\`\`json fences. Falls weitere Wrappers auftreten, hier erweitern.
- **JSON-Parse-Fehler:** aktuell wird die ganze Function failed. Optional: 1 Retry mit härterem System-Prompt-Suffix ("STRICTLY return JSON ONLY").
- **Anthropic API Timeout:** sollte selten sein, aber im Front-End ein Loading-State für 10–30 Sekunden vorsehen, ehrliche Erwartungssetzung.
