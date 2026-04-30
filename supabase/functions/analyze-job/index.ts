// Luumos — analyze-job Edge Function (v0.3, debug-mode)
// Runtime: Supabase Edge Runtime (Deno)
// Purpose: Take Job-Check form input, call Claude Sonnet 4.6 via direct fetch,
//          validate JSON output, store submission, return result.
//
// Deploy: via Supabase MCP, supabase CLI, or Dashboard.
// Test:   see ./README.md for curl example.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ===========================================
// Config
// ===========================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const LLM_MODEL = Deno.env.get("LLM_MODEL") || "claude-sonnet-4-6";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ===========================================
// System Prompt v0.2 (condensed for inline use)
// Canonical full version: prompts/job-check-system.md
// Keep in sync when updating either side.
// ===========================================
const SYSTEM_PROMPT = `Du bist die Analyse-Engine des "Luumos Job-Check", einem kostenlosen Web-Tool für Schweizer Berufstätige (45–58 Jahre, primär Angestellte in klassischen Bürojobs wie Treuhand, HR, Versicherung, Marketing, Sachbearbeitung). Deine Aufgabe ist es, anhand der Berufsangaben einer Person eine sachliche, empathische, hochdeutsche Analyse zu erstellen, die ihr hilft, KI in ihrem Berufsalltag zu verstehen und einzusetzen — ohne dabei Angst zu schüren oder falsche Sicherheiten zu verkaufen.

# Identität und Haltung

Du sprichst wie eine Schweizer Fachkollegin: kompetent, ruhig, leicht trocken. Nicht wie ein US-Tech-Evangelist. Nicht wie ein Coach. Du gibst Klarheit, keine Heilversprechen.

Die Person, die den Job-Check ausfüllt, hat möglicherweise berechtigte Sorgen über die Zukunft ihres Berufs. Du nimmst diese Sorgen ernst, aber du verstärkst sie nicht. Dein Output soll Handlungsfähigkeit signalisieren, nicht Bedrohung.

# Output-Sektionen

Du lieferst drei Sektionen plus einen Hebel-Score:

1. **stays_human** — 3 bis 5 Aspekte der Rolle, die in den nächsten fünf Jahren menschlich bleiben. Jeder Eintrag: title (kurz) + explanation (Begründung).

2. **improve_today** — 3 bis 5 konkrete Aufgaben aus dem Input, die heute schon mit KI besser werden. Pro Eintrag: task, ai_approach, tool_suggestion, estimated_time_saved_pct.

3. **learn_next_year** — 3 bis 5 Skills für die nächsten zwölf Monate. Pro Eintrag: skill, why, starting_point.

4. **leverage_score** (0–100) plus **leverage_score_label**: "Hoher Hebel" (75–100), "Solider Hebel" (50–74), "Mittlerer Hebel" (25–49), "Erste Schritte" (0–24).

# Anpassung an current_ai_usage

- **noch_nie**: absoluter Einstieg. EIN Tool, EIN Workflow. KI-Grundlagen, Datenschutz.
- **ein_paar_mal**: Vertiefung. 2–3 Tools, einfache Verkettung. Systematisches Prompten.
- **woechentlich**: Workflow-Optimierung. Templates, mehrere Tools verkettet. Einfache Integrationen (Zapier/Make).
- **taeglich**: Power-User. Custom GPTs/Projects, agentische Patterns. RAG, Workflow-Automation. KEINE Programmier-Annahmen.

# Tonalitätsregeln

- Hochdeutsch, Schweizer Schreibweise (CHF 1'500, 17.5%), "Sie"-Anrede.
- Sachlich, ruhig, empathisch. Niemals dramatisierend, niemals beschwichtigend.
- Konkrete Tools nennen (ChatGPT, Claude, Microsoft Copilot, DeepL, Perplexity).
- Aktive Sprache, keine pseudopräzisen Prognosen.
- Schweiz/EU-Tools wo sinnvoll bevorzugen.

# Verbotene Phrasen

"Death by AI", "wird ersetzt", "obsolet", "krisensicher", "unfireable", "Disruption", "revolutionär", "game-changing", "AI changes everything", "Augmented".

# Pflicht-Disclaimer (immer, exakter Wortlaut)

"Diese Einschätzung beruht auf Ihren Angaben und allgemeinem Branchenwissen. Sie ist keine Prognose und kein Ersatz für berufliche Beratung."

# Validation-Path

Falls Inputs unsinnig (Beruf "asdf", Aufgaben sehr kurz/unverständlich):
- validation_error: true
- validation_message: höflicher Hinweis auf Hochdeutsch
- leverage_score: null, leverage_score_label: null
- stays_human, improve_today, learn_next_year: leere Arrays
- disclaimer: trotzdem mitliefern

Sei tolerant gegenüber Tippfehlern und Schweizer Eigenheiten.

# Output-Format

Liefere ausschliesslich gültiges JSON. KEINE Markdown-Codeblöcke. KEIN Text vor oder nach dem JSON. Direkt das Objekt mit den Feldern: validation_error, validation_message, leverage_score, leverage_score_label, stays_human, improve_today, learn_next_year, disclaimer.`;

// ===========================================
// CORS
// ===========================================
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // tighten to https://luumos.io before public launch
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===========================================
// Types
// ===========================================
interface JobCheckInput {
  email: string;
  role: string;
  industry: string;
  company_size: string;
  weekly_tasks: string[];
  current_ai_usage: "noch_nie" | "ein_paar_mal" | "woechentlich" | "taeglich";
  employment_type?: string;
  canton?: string;
  utm?: Record<string, string>;
}

const CURRENT_AI_USAGE_LABELS: Record<string, string> = {
  noch_nie: "Noch nie genutzt",
  ein_paar_mal: "Ein paar Mal probiert",
  woechentlich: "Wöchentlich",
  taeglich: "Täglich",
};

// ===========================================
// Validation
// ===========================================
function validateInput(
  body: unknown
): { ok: true; data: JobCheckInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body required" };
  const b = body as Record<string, unknown>;

  if (typeof b.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))
    return { ok: false, error: "Gültige E-Mail-Adresse erforderlich." };

  for (const f of ["role", "industry"] as const) {
    const v = b[f];
    if (typeof v !== "string" || v.trim().length < 3 || v.length > 100)
      return { ok: false, error: `Feld "${f}" muss 3–100 Zeichen lang sein.` };
  }

  const validSizes = ["1-10", "11-50", "51-250", "251-1000", "1000+"];
  if (typeof b.company_size !== "string" || !validSizes.includes(b.company_size as string))
    return { ok: false, error: "Unternehmensgrösse ungültig." };

  if (!Array.isArray(b.weekly_tasks) || b.weekly_tasks.length !== 3)
    return { ok: false, error: "Genau drei Wochenaufgaben erforderlich." };
  for (const t of b.weekly_tasks) {
    if (typeof t !== "string" || t.trim().length < 5 || t.length > 200)
      return { ok: false, error: "Jede Aufgabe muss 5–200 Zeichen lang sein." };
  }

  const validUsage = ["noch_nie", "ein_paar_mal", "woechentlich", "taeglich"];
  if (typeof b.current_ai_usage !== "string" || !validUsage.includes(b.current_ai_usage as string))
    return { ok: false, error: "Bitte geben Sie Ihre aktuelle KI-Nutzung an." };

  return { ok: true, data: b as JobCheckInput };
}

// ===========================================
// Build user message
// ===========================================
function buildUserMessage(input: JobCheckInput): string {
  const lines = [
    "Hier sind die Angaben einer Person, die den Luumos Job-Check ausfüllt:",
    "",
    `- Beruf: ${input.role}`,
    `- Branche: ${input.industry}`,
    `- Unternehmensgrösse: ${input.company_size}`,
    "- Top 3 Wochenaufgaben:",
    `  1. ${input.weekly_tasks[0]}`,
    `  2. ${input.weekly_tasks[1]}`,
    `  3. ${input.weekly_tasks[2]}`,
    `- Aktuelle KI-Nutzung: ${CURRENT_AI_USAGE_LABELS[input.current_ai_usage]}`,
  ];
  if (input.employment_type) lines.push(`- Anstellungsart: ${input.employment_type}`);
  if (input.canton) lines.push(`- Kanton: ${input.canton}`);
  lines.push(
    "",
    "Bitte erstelle die Job-Check-Analyse als JSON-Output gemäss dem System-Prompt."
  );
  return lines.join("\n");
}

// ===========================================
// Call Claude (direct fetch — more robust in Deno than the SDK)
// ===========================================
async function callClaude(
  userMessage: string
): Promise<{ output: any; inputTokens: number; outputTokens: number; rawText: string }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((c: any) => c.type === "text");
  if (!textBlock?.text) {
    throw new Error(`No text in Anthropic response: ${JSON.stringify(data).slice(0, 500)}`);
  }

  const rawText = textBlock.text as string;
  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Invalid JSON from LLM. Error: ${(e as Error).message}. Raw text (first 500 chars): ${rawText.slice(0, 500)}`
    );
  }

  return {
    output: parsed,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    rawText,
  };
}

// ===========================================
// Cost estimate (calibrate after first 100 real submissions)
// Sonnet 4.6 indicative pricing: $3/M input, $15/M output, USD/CHF ~0.88
// ===========================================
function estimateCostChf(inputTokens: number, outputTokens: number): number {
  const usdCost = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
  return Number((usdCost * 0.88).toFixed(4));
}

// ===========================================
// DB persistence (uses service_role, bypasses RLS)
// ===========================================
async function upsertUser(input: JobCheckInput): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        email: input.email.toLowerCase(),
        utm_source: input.utm?.source ?? null,
        utm_medium: input.utm?.medium ?? null,
        utm_campaign: input.utm?.campaign ?? null,
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`upsertUser failed: ${error.message}`);
  return data.id as string;
}

async function storeSubmission(
  userId: string,
  input: JobCheckInput,
  output: any,
  meta: { inputTokens: number; outputTokens: number; processingMs: number }
): Promise<string> {
  const { data, error } = await supabase
    .from("job_check_submissions")
    .insert({
      user_id: userId,
      raw_role_input: input.role,
      raw_industry_input: input.industry,
      raw_tasks_input: input.weekly_tasks,
      raw_current_ai_usage: input.current_ai_usage,
      raw_employment_type: input.employment_type ?? "angestellt",
      raw_company_size: input.company_size,
      ai_output: output,
      ai_model_used: LLM_MODEL,
      ai_tokens_input: meta.inputTokens,
      ai_tokens_output: meta.outputTokens,
      ai_cost_chf: estimateCostChf(meta.inputTokens, meta.outputTokens),
      ai_processing_ms: meta.processingMs,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`storeSubmission failed: ${error.message}`);
  return data.id as string;
}

// ===========================================
// HTTP handler
// ===========================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const validation = validateInput(body);
  if (!validation.ok) return jsonResponse({ error: validation.error }, 400);
  const input = validation.data;

  try {
    const start = performance.now();
    console.log("analyze-job: starting LLM call for role=", input.role);
    const userMessage = buildUserMessage(input);
    const { output, inputTokens, outputTokens } = await callClaude(userMessage);
    const processingMs = Math.round(performance.now() - start);
    console.log("analyze-job: LLM done in", processingMs, "ms, tokens=", inputTokens, "/", outputTokens);

    const userId = await upsertUser(input);
    console.log("analyze-job: user upserted", userId);
    const submissionId = await storeSubmission(userId, input, output, {
      inputTokens,
      outputTokens,
      processingMs,
    });
    console.log("analyze-job: submission stored", submissionId);

    return jsonResponse({
      submission_id: submissionId,
      result: output,
      _debug: {
        model: LLM_MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        processing_ms: processingMs,
        estimated_cost_chf: estimateCostChf(inputTokens, outputTokens),
      },
    });
  } catch (e) {
    const errMsg = (e as Error).message ?? String(e);
    console.error("analyze-job error:", errMsg);
    // DEV MODE: return actual error. Lock down before public release.
    return jsonResponse({ error: "Analyse fehlgeschlagen.", _debug_error: errMsg }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}
