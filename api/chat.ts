// api/chat.ts
// Endpoint principal del concierge María 2.0.
// Deploy en Vercel como /api/chat

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { chat } from "../lib/provider";
import { MARIA_SYSTEM_PROMPT, buildContextBlock } from "../lib/prompt";
import { sanitize, extractLead } from "../lib/sanitizer";
import { getSession, incrementTurns, shouldCloseForTurnLimit } from "../lib/session";
import { checkRateLimit, getClientIdentifier, DEFAULT_RATE_LIMIT } from "../lib/rateLimit";
import { classify } from "../lib/classifier";
import { notifyLead } from "../lib/telegram";
import { getColombiaTime } from "../lib/schedule";

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface ChatResponseBody {
  reply: string;
  lead: Record<string, unknown> | null;
  meta: {
    turns_used: number;
    is_open_hours: boolean;
    service: string | null;
    language: string;
    sanitized: { markdown: number; exclamations: number; forbidden: number; bullets: number };
    notified: boolean;
  };
}

const HISTORY_LIMIT = 10; // últimos 10 mensajes

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS básico — ajusta según tu dominio en producción
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Rate limit
  const clientId = getClientIdentifier(req);
  const rate = checkRateLimit(clientId);
  if (!rate.allowed) {
    res.status(429).json({
      error: "Too many requests",
      reset_at: rate.resetAt,
    });
    return;
  }

  // Parse body
  const body = (req.body ?? {}) as ChatRequestBody;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const clientHistory = Array.isArray(body.history) ? body.history.slice(-HISTORY_LIMIT) : [];

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (message.length > 2000) {
    res.status(400).json({ error: "Message too long (max 2000 chars)" });
    return;
  }

  // Sesión
  const session = getSession(req, res);
  const updatedSession = incrementTurns(session, res);
  const turnsUsed = updatedSession.turns;

  // Horario Colombia
  const time = getColombiaTime();

  // Clasificación rápida (heurística)
  const classification = classify(message);

  // Si está fuera de horario, NO gastamos tokens en LLM
  if (!time.isOpenHours) {
    const offHoursReply = getOffHoursReply(classification.language);
    const lead = {
      status: "fuera_de_horario",
      service: null,
      client_name: null,
      email: null,
      phone: null,
      data: {},
      language: classification.language,
      turns_used: turnsUsed,
    };
    const responseBody: ChatResponseBody = {
      reply: offHoursReply,
      lead,
      meta: {
        turns_used: turnsUsed,
        is_open_hours: false,
        service: null,
        language: classification.language,
        sanitized: { markdown: 0, exclamations: 0, forbidden: 0, bullets: 0 },
        notified: false,
      },
    };
    res.status(200).json(responseBody);
    return;
  }

  // Si el cliente llegó al límite de turnos, forzar cierre elegante
  if (shouldCloseForTurnLimit(turnsUsed)) {
    const closure = getTurnLimitClosure(classification.language, null);
    res.status(200).json({
      reply: closure,
      lead: {
        status: "tibio",
        service: classification.service,
        client_name: null,
        email: null,
        phone: null,
        data: {},
        language: classification.language,
        turns_used: turnsUsed,
      },
      meta: {
        turns_used: turnsUsed,
        is_open_hours: true,
        service: classification.service,
        language: classification.language,
        sanitized: { markdown: 0, exclamations: 0, forbidden: 0, bullets: 0 },
        notified: false,
      },
    });
    return;
  }

  // Si la clasificación heurística detectó off-scope, respondemos directo
  // (ahorra tokens y evita que el modelo "negocie" temas prohibidos)
  if (classification.classification === "off_scope") {
    const offScopeReply = getOffScopeReply(classification.language);
    const lead = {
      status: "off_scope",
      service: null,
      client_name: null,
      email: null,
      phone: null,
      data: {},
      language: classification.language,
      turns_used: turnsUsed,
    };
    const responseBody: ChatResponseBody = {
      reply: offScopeReply,
      lead,
      meta: {
        turns_used: turnsUsed,
        is_open_hours: true,
        service: null,
        language: classification.language,
        sanitized: { markdown: 0, exclamations: 0, forbidden: 0, bullets: 0 },
        notified: false,
      },
    };
    res.status(200).json(responseBody);
    return;
  }

  // Construir mensajes para el LLM
  const messages = [
    { role: "system" as const, content: MARIA_SYSTEM_PROMPT },
    {
      role: "system" as const,
      content: buildContextBlock({
        isOpenHours: time.isOpenHours,
        turnsUsed,
        colombiaTime: time.iso,
        history: clientHistory,
      }),
    },
    ...clientHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Llamada al LLM
  let rawReply: string;
  try {
    const llmResponse = await chat(messages, {
      temperature: 0.7,
      maxTokens: 700,
    });
    rawReply = llmResponse.text;
  } catch (err) {
    console.error("[chat] LLM error:", err);
    res.status(502).json({
      error: "Upstream model error",
      detail: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // Extraer lead
  const { lead: parsedLead, raw: rawAfterExtract, parseError } = extractLead(rawReply);

  // Sanitizar texto visible
  const { text: visibleReply, removed } = sanitize(rawAfterExtract);

  if (parseError) {
    console.warn("[chat] JSON parse error:", parseError, "raw:", rawReply.slice(-200));
  }

  // Construir lead final
  const finalLead: Record<string, unknown> = parsedLead ?? {
    status: "tibio",
    service: classification.service,
    client_name: null,
    email: null,
    phone: null,
    data: {},
    language: classification.language,
    turns_used: turnsUsed,
  };

  // Forzar campos que SÍ sabemos del sistema
  finalLead.turns_used = turnsUsed;
  finalLead.language = classification.language;
  if (!finalLead.service) {
    finalLead.service = classification.service;
  }

  // Disparar Telegram si es caliente o tibio
  let notified = false;
  if (finalLead.status === "caliente" || finalLead.status === "tibio") {
    const result = await notifyLead({
      ...(finalLead as unknown as Parameters<typeof notifyLead>[0]),
      message,
    });
    notified = result.sent;
    if (!result.sent && result.error) {
      console.warn("[chat] Telegram notify failed:", result.error);
    }
  }

  const responseBody: ChatResponseBody = {
    reply: visibleReply,
    lead: finalLead,
    meta: {
      turns_used: turnsUsed,
      is_open_hours: true,
      service: (finalLead.service as string | null) ?? null,
      language: classification.language,
      sanitized: removed,
      notified,
    },
  };

  res.status(200).json(responseBody);
}

// ============================================================================
// RESPUESTAS FIJAS (multi-idioma)
// ============================================================================

function getOffHoursReply(lang: "es" | "en" | "pt"): string {
  switch (lang) {
    case "en":
      return "Thank you for reaching out. I will respond first thing tomorrow morning. Wishing you a wonderful evening.";
    case "pt":
      return "Obrigada por entrar em contato. Responderei primeira hora amanhã. Desejo-lhe uma excelente noite.";
    default:
      return "Gracias por escribirnos. Le responderé mañana a primera hora. KLO le desea una excelente noche.";
  }
}

function getOffScopeReply(lang: "es" | "en" | "pt"): string {
  switch (lang) {
    case "en":
      return "That falls outside what I can assist with directly. For specialized inquiries, please reach our team at hola@karibbeanluxuryoperators.lat — they will be happy to help.";
    case "pt":
      return "Isso está fora do que posso ajudar diretamente. Para consultas especializadas, por favor escreva para hola@karibbeanluxuryoperators.lat — a equipe terá prazer em ajudar.";
    default:
      return "Eso queda fuera de lo que puedo asistirle directamente. Para consultas especializadas, le sugiero escribir a hola@karibbeanluxuryoperators.lat — el equipo le responderá con gusto.";
  }
}

function getTurnLimitClosure(
  lang: "es" | "en" | "pt",
  email: string | null
): string {
  const e = email ?? "su email";
  switch (lang) {
    case "en":
      return `Thank you for your time. To continue with your inquiry, I will write to ${e} first thing tomorrow with additional details. It has been a pleasure.`;
    case "pt":
      return `Obrigada pelo seu tempo. Para continuar com sua consulta, escreverei para ${e} amanhã primeira hora com mais detalhes. Foi um prazer.`;
    default:
      return `Gracias por su tiempo. Para continuar con su consulta, le escribo a ${e} mañana a primera hora con más detalles. Ha sido un placer.`;
  }
}
