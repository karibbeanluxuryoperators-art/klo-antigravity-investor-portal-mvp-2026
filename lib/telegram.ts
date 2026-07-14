// lib/telegram.ts
// Notificador de leads a Telegram.
// Solo dispara para leads calientes o tibios. Curiosos no notifican.

import type { VercelResponse } from "@vercel/node";

const SERVICE_LABELS: Record<string, string> = {
  aviacion: "Aviación Privada",
  transporte: "Transporte Terrestre",
  nautico: "Náutico",
  hospedaje: "Hospedaje",
  staff: "Staff Profesional",
  experiencia_curada: "Experiencia Curada",
};

const STATUS_LABELS: Record<string, string> = {
  caliente: "🔥 CALIENTE",
  tibio: "🌡️ TIBIO",
  curioso: "❄️ Curioso",
  fuera_de_horario: "⏰ Fuera de horario",
  off_scope: "🚫 Off-scope",
};

export interface LeadPayload {
  status: string;
  service: string | null;
  client_name?: string | null;
  email?: string | null;
  phone?: string | null;
  data?: Record<string, unknown>;
  language?: string;
  turns_used?: number;
  message?: string;
}

export interface NotifyResult {
  sent: boolean;
  error?: string;
}

export async function notifyLead(
  lead: LeadPayload,
  res?: VercelResponse
): Promise<NotifyResult> {
  // Solo notificamos caliente y tibio
  if (lead.status !== "caliente" && lead.status !== "tibio") {
    return { sent: false };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados");
    return { sent: false, error: "Telegram env vars missing" };
  }

  const serviceLabel = lead.service ? SERVICE_LABELS[lead.service] ?? lead.service : "—";
  const statusLabel = STATUS_LABELS[lead.status] ?? lead.status;

  // Construir mensaje con formato Telegram (Markdown)
  const lines: string[] = [];
  lines.push(`${statusLabel} — ${serviceLabel}`);
  lines.push("");
  if (lead.client_name) lines.push(`Cliente: ${lead.client_name}`);
  if (lead.email) lines.push(`Email: ${lead.email}`);
  if (lead.phone) lines.push(`Teléfono: ${lead.phone}`);
  lines.push(`Idioma: ${(lead.language ?? "es").toUpperCase()}`);
  lines.push(`Turnos: ${lead.turns_used ?? "?"}`);
  lines.push("");

  if (lead.data && Object.keys(lead.data).length > 0) {
    lines.push("Datos:");
    for (const [k, v] of Object.entries(lead.data)) {
      if (v && v !== "" && v !== null) {
        lines.push(`  • ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
      }
    }
    lines.push("");
  }

  if (lead.message) {
    lines.push("Último mensaje:");
    lines.push(`> ${lead.message.slice(0, 500)}`);
  }

  const text = lines.join("\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { sent: false, error: `Telegram API ${response.status}: ${err}` };
    }

    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}
