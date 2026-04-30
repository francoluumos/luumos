# Architecture & Strategy Decisions (ADRs)

A running log of significant decisions made about Luumos. Each entry captures **what** was decided, **why**, and what would **trigger reversal**. Future-Franco (or anyone joining) reads this to understand the reasoning behind the current shape, not just the shape.

Format: ADR number, decision title, date, decision/rationale/reversal-trigger.

---

## ADR-001: Empowerment narrative over fear-based marketing

**Date:** 2026-04-30

**Decision:** The Luumos brand frames KI as a tool to wield, not an enemy to fight. Headlines, copy, and the Job-Check output default to empowering language. The original "HI vs. AI / David vs. Goliath" framing and the "Death by AI" naming were rejected.

**Rationale:** Fear-driven marketing contradicts the underlying mission of dispelling fear. Customers scared into the funnel and then sold the cure eventually feel manipulated. Long-term LTV depends on perceived authenticity. Most successful AI educators (Mollick, Miller, Grennan) lead with empowerment.

**Trade-off accepted:** Lower short-term virality (fear is more shareable than calm). Acceptable because Luumos is a relationship business, not a one-shot funnel.

**Reversal trigger:** None foreseen.

---

## ADR-002: ICP v1 = Swiss white-collar employees, 45–58

**Date:** 2026-04-30

**Decision:** v1 targets only employees aged 45–58 in Treuhand, HR, Versicherung, Marketing, Sachbearbeitung. Self-employed, founders, and SMB owners are deferred to v2 (2027 earliest).

**Rationale:** Marketing copy, pricing, and proof points differ fundamentally between employees ("how do I survive") and founders ("how do I 10x"). Targeting both at once produces diluted messaging.

**Reversal trigger:** If validation interviews show the 45–58 employee segment doesn't pay for the school, revisit by Q3 2027.

---

## ADR-003: Sequencing — assessment first, podcast second, school last

**Date:** 2026-04-30

**Decision:** Phase 1 = Job-Check funnel. Phase 2 = podcast + newsletter. Phase 3 = paid school. School only when ~1'000–2'000 engaged email subscribers exist.

**Rationale:** The school is the monetization layer. Building it before having an audience produces a course nobody buys. Job-Check generates the email list, podcast nurtures, school converts.

**Reversal trigger:** None expected. If the assessment fails to attract emails, the issue is upstream (content/distribution), not the sequence.

---

## ADR-004: Lovable for Job-Check, separate LMS for school

**Date:** 2026-04-30

**Decision:** Job-Check is built in Lovable. The school will be built later in a dedicated LMS (Kajabi, Memberstack+Webflow, or Circle — final choice deferred to Q4 2026).

**Rationale:** Lovable is well-suited for prototype web apps and funnels. It does not handle video-heavy membership sites with drip-content well. Forcing Lovable would mean rebuilding later.

**Reversal trigger:** If Lovable ships first-class video membership features by Q4 2026, reconsider.

---

## ADR-005: Supabase as Job-Check backend + canonical libraries

**Date:** 2026-04-30

**Decision:** Supabase (PostgreSQL + Auth + Edge Functions) is the primary backend for the Job-Check. It also stores a growing canonical library of job titles (`roles`) and companies (`companies`), fed by user inputs.

**Rationale:** Native Lovable integration. Generous free tier. Real relational DB enables the canonical-library use case. EU region (Frankfurt) for DSG/GDPR compliance. Built-in auth and row-level security reduce time-to-launch.

**Open implementation questions:**
- Migrations strategy (use Supabase CLI's migration files from day 1, never edit schema-file directly)
- Deduplication of canonical entries — wait until ~200–500 submissions have accumulated before running LLM-assisted normalization
- Retention policy for personally identifiable inputs (DSG right-to-be-forgotten endpoint)

**Reversal trigger:** Hard scaling limits before 50k MAU, or DSG-incompatible vendor change.

---

## ADR-006: Audio Schweizerdeutsch, written Hochdeutsch

**Date:** 2026-04-30

**Decision:** Podcast/video audio in Swiss German for emotional grounding. All written assets — titles, descriptions, newsletter, blog, Job-Check output, social copy — in Hochdeutsch.

**Rationale:** Swiss German has no SEO presence; Google and YouTube don't index it. Hochdeutsch reaches DACH search. Splitting modes captures both signals: warmth (audio) and discoverability (text).

**Reversal trigger:** None foreseen.

---

## ADR-007: Job-Check is free; monetization downstream

**Date:** 2026-04-30

**Decision:** The Job-Check (analysis tool) is free to use. The original CHF-15 paywalled-report idea was rejected. A "Personal Roadmap" upsell at CHF 49–79 may be added in v1.5. Real monetization comes from the school.

**Rationale:** Fear-driven buyers do not pay 15 CHF to confirm they should be afraid. They pay for actionable plans, not diagnoses. Free assessment maximizes lead capture; monetization happens further down the funnel where intent is higher.

**Reversal trigger:** If Job-Check completion rate exceeds 70% but newsletter opt-in stays below 30%, consider a low-friction paid upsell at the result page.

---

## ADR-008: Typography — Assistant header, Inconsolata accent, Inter body (proposed)

**Date:** 2026-04-30

**Decision:**
- **Header:** Assistant (sans-serif)
- **Accent / wordmark / numerical outputs:** Inconsolata (mono)
- **Body / paragraphs:** Inter (proposed, awaits Franco's confirmation)

**Rationale:** Inconsolata as body font reduces reading speed by ~10–15% for the 45+ audience due to monospaced character spacing. Restricting Inconsolata to the brand's "tech-aware" accent role (wordmark, code-like outputs, callouts) preserves its character without harming readability.

**Reversal trigger:** Franco confirms full Inconsolata-as-body intent; in that case, reading speed trade-off is consciously accepted.

---

## ADR-009: Five-format content loop

**Date:** 2026-04-30

**Decision:** Content strategy uses five recurring formats:
1. **Introduction Series** — onboarding, evergreen library (one-time production of 8–12 episodes)
2. **Querdenker Minute** — 60-second hot take on Reels/Shorts
3. **Querdenker Stunde** — 30–60 min weekly long-form podcast
4. **Job-Carousels** — weekly LinkedIn data-driven post powered by Job-Check submissions
5. **AI-Trick der Woche** — 5–10 min screen recording showing one concrete KI workflow for a Swiss professional task

**Rationale:** The original four formats from Franco lacked a "show, don't tell" dimension. AI-Trick der Woche fills that gap, has the highest direct conversion to the school, leverages Franco's automation-insider background, and adds production-format variety (screen recording vs talking head).

**Reversal trigger:** If, by month 6, AI-Trick der Woche underperforms Querdenker Stunde on every metric (views, completion, conversion), retire and replace with guest-interview format ("Im Berufsalltag mit…").

**Operational status:** Strategy locked. Detailed production plan deferred — see [`content-strategy.md`](content-strategy.md).

---

## ADR-010: LLM = Claude Sonnet 4.6 for Job-Check

**Date:** 2026-04-30

**Decision:** The Job-Check Edge Function uses Claude Sonnet 4.6 as the analysis model.

**Rationale:** Best balance of nuance, German fluency, and cost (~CHF 0.03–0.05 per Job-Check) for the 5+2-field structured analysis. Opus is more thorough but 3× the cost without proportional quality lift for this use case. Haiku underperforms in Swiss-specific context and nuanced role-mapping.

**Reversal trigger:** If eval cases (`prompts/job-check-eval-cases.md`) consistently fail on Concretion or Tonality criteria, upgrade to Opus. If cost exceeds CHF 0.10 average per submission at >100 daily submissions, evaluate Haiku for non-critical paths.

---

## ADR-011: Job-Check form = 6 mandatory + 2 optional fields

**Date:** 2026-04-30 (revised same day)

**Decision:** The Job-Check form has 6 mandatory fields (Beruf, Branche, Unternehmensgrösse, Top-3-Wochenaufgaben, **aktuelle KI-Nutzung**, E-Mail) and 2 optional fields (Anstellungsart, Kanton).

**Rationale:** Adding `current_ai_usage` as a fourth-option dropdown ("Noch nie genutzt", "Ein paar Mal probiert", "Wöchentlich", "Täglich") costs ~5% completion rate but dramatically improves output personalization. A daily user gets API/agentic-workflow recommendations; a beginner gets ChatGPT-Email-Drafts onboarding. Without this field, output recommendations are pitched generically at the middle.

**Bonus:** Provides high-value cohort data for future newsletter segmentation, school-launch positioning, and content targeting (e.g., "AI-Trick der Woche" videos can be segmented for beginners vs. power-users).

**Reversal trigger:** If completion rate drops below 40%, drop `current_ai_usage` back to optional or move to a post-result follow-up question.

---

## ADR-012: Code language English, content language German

**Date:** 2026-04-30

**Decision:** Two distinct language domains in the Luumos codebase:

- **English:** all code (variables, functions, file names, class names), code comments, technical READMEs, build prompts to Lovable, API contracts, type definitions, commit messages.
- **German:** the LLM system prompt for the Job-Check (`prompts/job-check-system.md`), the user-facing strings the LLM produces, all marketing copy, voice & tone guide, content strategy, ADR business-rationale, Konzept doc, anything an external user or a Swiss reader will see.

**Rationale:**

- For the Job-Check LLM prompt: the output must be hochdeutsch with Swiss specifics. The forbidden-words list contains exact German strings. Translating context to English creates risk of cultural mistranslation. Modern Anthropic models (Sonnet 4.6) handle German system prompts as well as English for this use case.
- For Lovable build prompts and code: Lovable produces React/TypeScript/Tailwind, and the entire framework, library, and tooling ecosystem is English. English prompts produce idiomatic, maintainable code. German build prompts produce mixed-language variable names ("inputFeldFürBeruf") that are painful to refactor.

**How to apply:**

- When prompting Lovable: write the structural instruction in English, but pass user-facing strings in German verbatim.
- When writing code or comments in `lovable-app/` or Edge Functions: English.
- When writing or editing strategy/concept/voice docs in `docs/` or `design-system/voice-and-tone.md`: German.
- When writing the Job-Check system or user prompts: German.

**Reversal trigger:** None foreseen.
