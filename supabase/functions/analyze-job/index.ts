// Luumos — analyze-job Edge Function
// Runtime: Deno (Supabase Edge Functions)
// Purpose: Take Job-Check form input, call Claude Sonnet 4.6, validate output, store submission, return result.
//
// Deploy: supabase functions deploy analyze-job
// Test:   supabase functions invoke analyze-job --body '{ ... }'

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

// ===========================================
// Config & clients
// ===========================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const LLM_MODEL = Deno.env.get("LLM_MODEL") || "claude-sonnet-4-6";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ===========================================
// System prompt — load from prompts/job-check-system.md
// In production: bundle this at build time, or read from Supabase Storage.
// For v0.1: inline copy. Update both files together.
// ===========================================

const SYSTEM_PROMPT = `Du bist die Analyse-Engine des "Luumos Job-Check", einem kostenlosen Web-Tool für Schweizer Berufstätige (45–58 Jahre, primär Angestellte in klassischen Bürojobs wie Treuhand, HR, Versicherung, Marketing, Sachbearbeitung). Deine Aufgabe ist es, anhand der Berufsangaben einer Person eine sachliche, empathische, hochdeutsche Analyse zu erstellen, die ihr hilft, KI in ihrem Berufsalltag zu verstehen und einzusetzen — ohne dabei Angst zu schüren oder falsche Sicherheiten zu verkaufen.

[FULL SYSTEM PROMPT — copy verbatim from prompts/job-check-system.md, version-locked.
This stub is here to keep the file readable. Before deploy: paste the full prompt block.]

WICHTIG: Liefere ausschliesslich gültiges JSON gemäss dem mitgegebenen Schema. KEINE Markdown-Codeblöcke. KEINE einleitenden Sätze. Direkt das JSON-Objekt.`;

// ===========================================
// Input validation (zod-style, manual for Deno simplicity)
// ===========================================

interface JobCheckInput {
  email: string;
  role: string;
  industry: string;
  company_size: "1-10" | "11-50" | "51-250" | "251-1000" | "1000+";
  weekly_tasks: string[]; // exactly 3
  current_ai_usage: "noch_nie" | "ein_paar_mal" | "woechentlich" | "taeglich";
  employment_type?: "angestellt" | "selbstaendig" | "fuehrung";
  canton?: string; // 2-letter ISO
  utm?: Record<string, string>;
}

const CURRENT_AI_USAGE_LABELS: Record<JobCheckInput["current_ai_usage"], string> = {
  noch_nie: "Noch nie genutzt",
  ein_paar_mal: "Ein paar Mal probiert",
  woechentlich: "Wöchentlich",
  taeglich: "Täglich",
};

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system:\s*/i,
  /\[INST\]/,
  /<\|im_start\|>/,
  /you\s+are\s+now\s+/i,
  /vergiss\s+alle\s+vorherigen/i,
];

function validateInput(body: unknown): { ok: true; data: JobCheckInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body required" };
  const b = body as Record<string, unknown>;

  // Email
  if (typeof b.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))
    return { ok: false, error: "Gültige E-Mail-Adresse erforderlich." };

  // Role / industry
  for (const f of ["role", "industry"] as const) {
    const v = b[f];
    if (typeof v !== "string" || v.trim().length < 3 || v.length > 100)
      return { ok: false, error: `Feld "${f}" muss 3–100 Zeichen lang sein.` };
  }

  // Company size enum
  const validSizes = ["1-10", "11-50", "51-250", "251-1000", "1000+"];
  if (typeof b.company_size !== "string" || !validSizes.includes(b.company_size))
    return { ok: false, error: "Unternehmensgrösse ungültig." };

  // Tasks
  if (!Array.isArray(b.weekly_tasks) || b.weekly_tasks.length !== 3)
    return { ok: false, error: "Genau drei Wochenaufgaben erforderlich." };
  for (const t of b.weekly_tasks) {
    if (typeof t !== "string" || t.trim().length < 5 || t.length > 200)
      return { ok: false, error: "Jede Aufgabe muss 5–200 Zeichen lang sein." };
  }

  // Current AI usage
  const validUsage = ["noch_nie", "ein_paar_mal", "woechentlich", "taeglich"];
  if (typeof b.current_ai_usage !== "string" || !validUsage.includes(b.current_ai_usage))
    return { ok: false, error: "Bitte geben Sie Ihre aktuelle KI-Nutzung an." };

  // Prompt injection check across all string fields
  const stringFields = [
    b.role,
    b.industry,
    ...b.weekly_tasks,
    b.employment_type,
    b.canton,
  ].filter((x) => typeof x === "string") as string[];

  for (const s of stringFields) {
    if (PROMPT_INJECTION_PATTERNS.some((p) => p.test(s)))
      return { ok: false, error: "Ungültige Eingabe erkannt." };
  }

  // Optional fields
  if (b.employment_type !== undefined && !["angestellt", "selbstaendig", "fuehrung"].includes(b.employment_type as string))
    return { ok: false, error: "Anstellungsart ungültig." };

  if (b.canton !== undefined && (typeof b.canton !== "string" || !/^[A-Z]{2}$/.test(b.canton)))
    return { ok: false, error: "Kanton muss als 2-Zeichen-Code angegeben werden (z.B. ZH)." };

  return { ok: true, data: b as JobCheckInput };
}

// ===========================================
// Build user message from input
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
  lines.push("", "Bitte erstelle die Job-Check-Analyse als JSON-Output gemäss dem System-Prompt.");
  return lines.join("\n");
}

// ===========================================
// Call Claude
// ===========================================

interface JobCheckOutput {
  validation_error: boolean;
  validation_message: string | null;
  leverage_score: number | null;
  leverage_score_label: string | null;
  stays_human: Array<{ title: string; explanation: string }>;
  improve_today: Array<{ task: string; ai_approach: string; tool_suggestion: string; estimated_time_saved_pct: number | null }>;
  learn_next_year: Array<{ skill: string; why: string; starting_point: string }>;
  disclaimer: string;
}

async function callClaude(userMessage: string): Promise<{
  output: JobCheckOutput;
  inputTokens: number;
  outputTokens: number;
}> {
  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM returned no text content");
  }

  let parsed: JobCheckOutput;
  try {
    // Strip any accidental markdown code fences
    const cleaned = textBlock.text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleaned) as JobCheckOutput;
  } catch (e) {
    throw new Error(`LLM returned invalid JSON: ${(e as Error).message}`);
  }

  // Light schema validation
  const required = ["validation_error", "stays_human", "improve_today", "learn_next_year", "disclaimer"];
  for (const k of required) {
    if (!(k in parsed)) throw new Error(`Missing field: ${k}`);
  }

  return {
    output: parsed,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ===========================================
// Cost estimation (CHF, rough — calibrate after first 100 real submissions)
// ===========================================

function estimateCostChf(inputTokens: number, outputTokens: number): number {
  // Sonnet 4.6 indicative pricing — replace with actual numbers once Anthropic publishes
  // Placeholder: $3/M input, $15/M output, USD/CHF ~0.88
  const usdPerMillionInput = 3;
  const usdPerMillionOutput = 15;
  const usdToChf = 0.88;
  const usdCost = (inputTokens / 1_000_000) * usdPerMillionInput + (outputTokens / 1_000_000) * usdPerMillionOutput;
  return Number((usdCost * usdToChf).toFixed(4));
}

// ===========================================
// Persist user + submission
// ===========================================

async function upsertUser(input: JobCheckInput, ip: string | null): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        email: input.email.toLowerCase(),
        utm_source: input.utm?.source ?? null,
        utm_medium: input.utm?.medium ?? null,
        utm_campaign: input.utm?.campaign ?? null,
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();

  if (error) throw new Error(`Failed to upsert user: ${error.message}`);
  return data.id as string;
}

async function storeSubmission(
  userId: string,
  input: JobCheckInput,
  output: JobCheckOutput,
  meta: { inputTokens: number; outputTokens: number; processingMs: number },
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

  if (error) throw new Error(`Failed to store submission: ${error.message}`);
  return data.id as string;
}

// ===========================================
// HTTP handler
// ===========================================

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const validation = validateInput(body);
  if (!validation.ok) return jsonResponse({ error: validation.error }, 400);
  const input = validation.data;

  const ip = req.headers.get("x-forwarded-for") ?? null;

  try {
    const start = performance.now();
    const userMessage = buildUserMessage(input);
    const { output, inputTokens, outputTokens } = await callClaude(userMessage);
    const processingMs = Math.round(performance.now() - start);

    const userId = await upsertUser(input, ip);
    const submissionId = await storeSubmission(userId, input, output, { inputTokens, outputTokens, processingMs });

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
    console.error("analyze-job error:", e);
    return jsonResponse({ error: "Analyse fehlgeschlagen. Bitte später erneut versuchen." }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*", // tighten to luumos.io domain in prod
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
