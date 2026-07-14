// lib/provider.ts
// Abstracción de provider LLM — hoy Groq, mañana lo que sea.
// Cambiar de modelo = cambiar estas constantes. Nada más.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface ChatResponse {
  text: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ============================================================================
// CONFIGURACIÓN — cambia aquí cuando migres de modelo
// ============================================================================

const PROVIDER = "groq" as const; // "groq" | "openai" | "anthropic" | "gemini"
const DEFAULT_MODEL = "llama-3.3-70b-versatile"; // Groq free tier
// Alternativas Groq:
//   - "llama-3.1-8b-instant" (más rápido, menos capaz, gratis)
//   - "mixtral-8x7b-32768" (gratis)
//   - "llama-3.3-70b-specdec" (más rápido, misma calidad)

// ============================================================================
// IMPLEMENTACIÓN
// ============================================================================

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const model = options.model ?? DEFAULT_MODEL;

  if (PROVIDER === "groq") {
    return groqChat(messages, { ...options, model });
  }

  throw new Error(`Provider ${PROVIDER} no implementado aún`);
}

async function groqChat(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY no está configurada");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 800,
      // Groq soporta JSON mode, pero María necesita texto + JSON al final
      // sin forzar todo a JSON, así que dejamos response_format por defecto.
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? options.model ?? DEFAULT_MODEL,
    usage: data.usage,
  };
}
