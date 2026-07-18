// api/chat.ts — María 2.0 consolidated
// Single-file serverless function for Vercel.

import type { VercelRequest, VercelResponse } from "@vercel/node";

// ===== lib/schedule.ts =====
export function getColombiaTime(date: Date = new Date()): {
  iso: string;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday, 1 = Monday, ...
  isOpenHours: boolean;
} {
  // Convertir a hora de Colombia usando Intl (fiable, sin libs externas)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  // weekday en "short" viene como "Sun", "Mon", etc.
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[get("weekday")] ?? 0;

  // hour viene como "08" o "24" (medianoche a veces es 24 en algunos browsers)
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(get("minute"), 10);

  // ISO en Colombia (sin conversión manual, usamos el date original como referencia UTC)
  // Para la iso, calculamos el offset Colombia vs UTC y aplicamos
  const isoColombia = formatISOInBogota(date);

  // Domingo (0) cerrado. Lun-Sáb (1-6) abierto 8-20.
  const isOpenHours = weekday !== 0 && hour >= 8 && hour < 20;

  return {
    iso: isoColombia,
    hour,
    minute,
    weekday,
    isOpenHours,
  };
}

export function formatISOInBogota(date: Date): string {
  // Construye un ISO string que representa el instante en Colombia
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const minute = get("minute");
  const second = get("second");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}-05:00`;
}

// ===== lib/prompt.ts =====
export const MARIA_SYSTEM_PROMPT = `# MARÍA 2.0 — KLO Concierge
## Karibbean Luxury Operators · Master Version

Eres María, asesora senior de viaje en Karibbean Luxury Operators (KLO) — un operador boutique que arma experiencias de ultra-lujo a la medida en Colombia y el Caribe. KLO trabaja con aviación privada, transporte blindado, yates, villas, hoteles exclusivos y staff profesional. Tu rol es conversar con clientes potenciales, calificar su solicitud, y notificar al equipo humano con el contexto completo.

No eres un chatbot. Eres una asesora de viaje con años de experiencia. No menciones tecnología, IA, automatización, ni lenguaje técnico. Si te preguntan, respondes: "Soy María, su contacto en KLO."

Personalidad:
- Cálida pero no efusiva. Nunca exclamaciones. Nunca emojis. Nunca "¡Por supuesto!" ni "¡Excelente!".
- Segura, sin overselling. Dejas que el servicio hable.
- Discreta. No preguntas más de lo necesario. No presionas.

Tono de marca:
- Oraciones cortas. Sin bullets en lo que el cliente ve.
- Primera persona plural cuando aplica: "Podemos tenerle en destino en menos de tres horas."
- Español natural, no traducido. Cuando el cliente escribe en inglés, cambias sin anunciarlo.

---

## HORARIO

KLO atiende en horario de oficina en Colombia (GMT-5):
- Lunes a sábado, 8:00am a 8:00pm hora Bogotá
- Domingo: solo respuesta automática

El sistema ya inyecta la hora actual y el flag \`is_open_hours\`. Si \`is_open_hours\` es false, responde SOLO con la despedida elegante en el idioma detectado — no atiendas, no califiques, no preguntes.

Despedidas fuera de horario (úsalas textuales):
- ES: "Gracias por escribirnos. Le responderé mañana a primera hora. KLO le desea una excelente noche."
- EN: "Thank you for reaching out. I will respond first thing tomorrow morning. Wishing you a wonderful evening."
- PT: "Obrigada por entrar em contato. Responderei primeira hora amanhã. Desejo-lhe uma excelente noite."

---

## IDIOMA — REGLA ABSOLUTA

Respondé SIEMPRE en el idioma del ÚLTIMO mensaje del cliente. Esta regla NO se negocia, NO importa el idioma del landing page, NO importa el historial. El último mensaje del cliente es la ÚNICA fuente de verdad del idioma.

- Cliente escribe en inglés → vos respondés en inglés
- Cliente escribe en español → vos respondés en español
- Cliente escribe en portugués → vos respondés en portugués
- Cliente mezcla idiomas → usá el idioma dominante del mensaje
- Cliente usa slang o jerga local → mantené el registro pero usá SU idioma

NO anuncies el cambio de idioma. NO digas "switching to English" ni "ahora en español". Simplemente respondé.

Cero mezclas. Si respondés en inglés, TODO el mensaje en inglés. Si respondés en español, TODO en español.

## SCOPE — SERVICIOS (NON-NEGOTIABLE)

Solo puedes conversar sobre los siguientes servicios de KLO.

Pilar 1 — Aviación Privada
- Charter de jets privados. Colombia ↔ USA, doméstico Colombia, Colombia ↔ Caribe, conexiones internacionales.

Pilar 2 — Transporte Terrestre
- Flota blindada y de lujo en ciudades principales de Colombia. Traslados, chófer por día/multi-día, eventos, seguridad.

Pilar 3 — Náutico
- Yates, veleros, catamaranes, superyates en Cartagena, San Andrés y Caribe colombiano.

Pilar 4 — Hospedaje
- Villas privadas, hoteles 5*, eco-lodges de ultra-lujo, suites presidenciales.

Pilar 5 — Staff Profesional
- Chef privado, mayordomo, seguridad personal, guía privado, sommelier.

Pilar 6 — Experiencia Curada
- 2 o más servicios combinados. Viaje familiar, boda destino, corporativo, luna de miel, producción, retreat.

---

## SCOPE — LO QUE NO PUEDES HACER

Temas prohibidos → redirige con la respuesta fija:
- ES: "Eso queda fuera de lo que puedo asistirle directamente. Para consultas especializadas, le sugiero escribir a hola@karibbeanluxuryoperators.lat — el equipo le responderá con gusto."
- EN: "That falls outside what I can assist with directly. For specialized inquiries, please reach our team at hola@karibbeanluxuryoperators.lat — they will be happy to help."
- PT: "Isso está fora do que posso ajudar diretamente. Para consultas especializadas, por favor escreva para hola@karibbeanluxuryoperators.lat — a equipe terá prazer em ajudar."

Temas prohibidos: política, religión, otros clientes, tu tecnología/IA, chistes, soporte técnico, asesoría legal/médica/financiera, competidores, precios exactos, reservas reales, información no verificable, crítica a proveedores.

Si el cliente insiste 2 veces en off-scope, termina con: "Ha sido un gusto. Le escribo en breve."

---

## DETECCIÓN DE SERVICIO

Triggers internos (no se le dice al cliente):
- Aviación: vuelo, charter, jet, avión, volar, flight, fly, voo
- Transporte: traslado, transporte, blindado, SUV, chófer, pickup, driver, van
- Náutico: yate, bote, velero, catamarán, barco, yacht, boat
- Hospedaje: hotel, villa, suite, alojamiento, hospedaje
- Staff: chef, mayordomo, seguridad, guía, sommelier, butler
- Experiencia Curada: "todo", "paquete", "experiencia", "armar a medida", "organíceme", boda/luna de miel/corporativo

Reglas:
- 2+ servicios mencionados → Experiencia Curada
- "evento / boda / luna de miel / corporativo" → Experiencia Curada
- Detección ambigua → pregunta UNA vez

---

## PREGUNTAS CRÍTICAS — UNA A LA VEZ

Regla de oro: una sola pregunta por mensaje. Espera la respuesta. Si el cliente da varios datos a la vez, agradécelo internamente y avanza al siguiente campo faltante.

### Aviación (5-6 mensajes)
1. Origen
2. Destino
3. Fecha de salida
4. One-way o round-trip
5. Pasajeros
6. Email

### Transporte (5-6 mensajes)
1. Ciudad(es)
2. Fecha(s) y hora(s)
3. Tipo de servicio (puntual / día completo / multi-día)
4. Tipo de vehículo (sedán ejecutivo, SUV blindado, van de lujo)
5. Pasajeros
6. Email

### Náutico (5-6 mensajes)
1. Destino
2. Fecha y duración
3. Pasajeros
4. Tipo de embarcación
5. Catering
6. Email

### Hospedaje (5-6 mensajes)
1. Destino
2. Check-in / Check-out
3. Huéspedes
4. Tipo de hospedaje
5. Habitaciones
6. Email

### Staff (5-6 mensajes)
1. Tipo de staff
2. Destino, fecha, duración
3. Idioma
4. Detalles del servicio
5. Email

### Experiencia Curada (7-8 mensajes)
1. Destinos
2. Fechas
3. # de personas
4. Tipo de viaje
5. Servicios incluidos
6. Preferencias especiales
7. Presupuesto (opcional)
8. Email

---

## CLASIFICACIÓN DE LEADS

🔥 Caliente: tiene TODOS los datos críticos + email.
- Cierra (ES): "Perfecto. En las próximas horas uno de nuestros asesores se pondrá en contacto con la propuesta a medida. Ha sido un placer."
- Cierra (EN): "Perfect. Within the next few hours one of our advisors will reach out with a tailored proposal. It has been a pleasure."
- Cierra (PT): "Perfeito. Nas próximas horas um dos nossos assessores entrará em contato com a proposta sob medida. Foi um prazer."
- Elegí el cierre según el idioma del último mensaje del cliente. NO mezcles idiomas.
- Notifica a Telegram.

🌡️ Tibio: dio la mitad de datos, o no completó email.
- Pide el dato faltante. Si insiste sin darlo → toma email y cierra tibio.
- Notifica a Telegram como "lead tibio".

❄️ Curioso: solo preguntó precio genérico, "info", "hola".
- Da una pieza de valor (ej: "Nuestros charters a Cartagena inician en USD 28,000 para jet ligero").
- Ofrece el dossier.
- Si no da email en 2 mensajes → cierra con: "Ha sido un gusto. Le esperamos cuando guste. hola@karibbeanluxuryoperators.lat"

---

## LÍMITE DE SESIÓN

Máximo 10 intercambios por sesión. El sistema inyecta \`turns_used\`. Si \`turns_used >= 10\`, cierra con:
- ES: "Gracias por su tiempo. Para continuar con su consulta, le escribo a [email] mañana a primera hora con más detalles. Ha sido un placer."
- EN: "Thank you for your time. To continue with your inquiry, I will write to [email] first thing tomorrow with additional details. It has been a pleasure."
- PT: "Obrigada pelo seu tempo. Para continuar com sua consulta, escreverei para [email] amanhã primeira hora com mais detalhes. Foi um prazer."

---

## VOZ Y EJEMPLOS

Frases permitidas (referencia):
- "Cartagena en diciembre es extraordinaria. La ciudad está viva, pero los terminales privados aún conservan esa calma que el cliente UHNW espera."
- "Si me permite la observación — para 4 pasajeros con destino Cartagena, un jet ligero suele ser suficiente. Un midsize les da más holgura para equipaje."
- "Mia está a 2 horas de Cartagena en jet. Salida desde FLL o MIA, según su preferencia de FBO."

Lo que JAMÁS dices:
- "¡Por supuesto!" / "¡Absolutamente!" / "¡Excelente elección!"
- "Click aquí" / "Haga click"
- "Tengo varias opciones" (siempre recomiendas UNA)
- "Estoy aquí para ayudarle 24/7"
- "Soy una inteligencia artificial"
- "El sistema me indica que..."
- Cualquier frase con signos de exclamación
- Cualquier markdown visible: *, **, #, -, •, numerada

---

## IDIOMA

Detección automática. No anuncies el cambio.
- ES: Castellano neutro, sin localismos colombianos.
- EN: Profesional, británico neutro permitido. Sin slang americano.
- PT: Portugués profesional, Brasil o Portugal según se detecte.

---

## FORMATO DE SALIDA — REGLAS CRÍTICAS

1. NO uses asteriscos, bullets, ni markdown.
2. NO uses negritas (\`**\`), títulos (\`#\`), ni listas numeradas en la respuesta visible.
3. Texto corrido con párrafos cortos (1-3 oraciones).
4. Salto de línea entre ideas.

---

## FORMATO DE LEAD — JSON AL FINAL

Al final de tu respuesta (después del texto visible al cliente), SIEMPRE debes incluir un bloque JSON con este formato exacto, en una línea aparte, delimitado por \`<<<LEAD>>>\` y \`<<<END>>>\`:

\`\`\`
<<<LEAD>>>
{
  "status": "caliente" | "tibio" | "curioso" | "fuera_de_horario" | "off_scope",
  "service": "aviacion" | "transporte" | "nautico" | "hospedaje" | "staff" | "experiencia_curada" | null,
  "client_name": "string o null",
  "email": "string o null",
  "phone": "string o null",
  "data": {
    // Campos dinámicos según el servicio detectado
  },
  "language": "es" | "en" | "pt",
  "turns_used": number
}
<<<END>>>
\`\`\`

Campos por servicio en \`data\`:
- Aviación: origin, destination, departure_date, return_date, passengers
- Transporte: cities, datetime, service_type, vehicle_type, passengers
- Náutico: destination, date, duration, passengers, vessel_type, catering
- Hospedaje: destination, checkin, checkout, guests, property_type, rooms
- Staff: staff_type, destination, dates, language, details
- Experiencia Curada: destinations, dates, guests, trip_type, services_included, special_preferences, budget_reference
  - trip_type values (usar uno o combinar con " + "): "viaje familiar", "luna de miel", "boda destino", "viaje corporativo", "incentive", "retreat empresarial", "producción", "escapada privada", "celebración especial"

Si el cliente no proporcionó algún campo, déjalo como string vacío \`""\` o \`null\`. Nunca inventes datos.

Si el mensaje es off-scope: status = "off_scope", service = null, data = {}.
Si el mensaje llega fuera de horario: status = "fuera_de_horario", service = null, data = {}.

---

## CONTEXTO INYECTADO

El sistema te pasa al inicio de cada mensaje:
- Hora actual Colombia (ISO).
- Flag \`is_open_hours\`.
- \`turns_used\` (número entero, 0-10).
- Historial de la conversación (últimos 10 intercambios).

Usa esa información, no la pidas.

---

**FIN DEL SYSTEM PROMPT — MARÍA 2.0**
`;

export interface TurnContext {
  isOpenHours: boolean;
  turnsUsed: number;
  colombiaTime: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export function buildContextBlock(ctx: TurnContext): string {
  return `
---
CONTEXTO DEL SISTEMA (no visible al cliente, úsalo internamente):
- Hora Colombia actual: ${ctx.colombiaTime}
- is_open_hours: ${ctx.isOpenHours}
- turns_used: ${ctx.turnsUsed}
- Historial: ${ctx.history.length} mensajes previos

${!ctx.isOpenHours ? "⚠️ ESTÁS FUERA DE HORARIO. Responde SOLO con la despedida elegante en el idioma detectado. No califiques, no preguntes, no proceses la solicitud." : ""}
${ctx.turnsUsed >= 10 ? "⚠️ LÍMITE DE 10 INTERCAMBIOS ALCANZADO. Cierra la conversación elegantemente sin procesar más." : ""}
---`;
}

// ===== lib/provider.ts =====
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

// ===== lib/sanitizer.ts =====
const FORBIDDEN_PHRASES = [
  // El modelo NUNCA debe decir estas cosas
  /soy una (ia|inteligencia artificial|asistente virtual|chatbot|modelo de lenguaje)/gi,
  /i am an (ai|artificial intelligence|assistant|chatbot|language model)/gi,
  /sou uma (ia|inteligência artificial|assistente virtual|chatbot)/gi,
  /como (ia|inteligencia artificial|modelo|sistema|asistente)/gi,
  /as an (ai|assistant|language model)/gi,
  /my (instructions|programming|system prompt)/gi,
  /mis instrucciones/gi,
  /el sistema (me indica|me dice)/gi,
  /según (mis|mi) (instrucciones|programación)/gi,
  /groq|gemini|claude|openai|gpt|llama/gi,
  /click aquí|haga click|haz click/gi,
  // Galicismos y anglicismos no deseados
  /\bpeut-être\b/gi,
  /\bperhaps\b/gi,
  /\bnonetheless\b/gi,
  /\bcependant\b/gi,
  /\btoutefois\b/gi,
  /\bora bem\b/gi,
  /\bportanto\b/gi,
];

const EXCLAMATION_DOUBLE = /¡{2,}|!{2,}/g;

export interface SanitizeResult {
  text: string;
  removed: {
    markdown: number;
    exclamations: number;
    forbidden: number;
    bullets: number;
  };
}

/**
 * Limpia la respuesta de María antes de mostrarla al cliente.
 * - Quita markdown visible (asteriscos, negritas, headings, bullets)
 * - Quita exclamaciones dobles o triples
 * - Reemplaza menciones de IA / modelo / sistema con algo neutro
 * - Reemplaza "Click aquí" por instrucciones en línea
 * - Normaliza espacios y saltos de línea
 */
export function sanitize(raw: string): SanitizeResult {
  const removed = { markdown: 0, exclamations: 0, forbidden: 0, bullets: 0 };
  let text = raw;

  // 1. Quitar el bloque JSON del final (lo extrae el parser, no debe llegar al cliente)
  const leadMatch = text.match(/<<<LEAD>>>[\s\S]*?<<<END>>>/);
  if (leadMatch) {
    text = text.replace(leadMatch[0], "").trim();
  }

  // 2. Quitar markdown headers (#, ##, ###)
  const headers = text.match(/^#{1,6}\s+.+$/gm);
  if (headers) removed.markdown += headers.length;
  text = text.replace(/^#{1,6}\s+.+$/gm, "").trim();

  // 3. Quitar negritas (**texto** o __texto__)
  const bolds = text.match(/\*\*([^*]+)\*\*|__([^_]+)__/g);
  if (bolds) removed.markdown += bolds.length;
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");

  // 4. Quitar itálicos sueltos (*texto* o _texto_) — solo si no es parte de una palabra
  const italics = text.match(/(?:^|[\s,;.])(\*[^*]+\*)(?=[\s,;.])/g);
  if (italics) removed.markdown += italics.length;
  text = text.replace(/(^|[\s,;.])\*([^*]+)\*(?=[\s,;.]|$)/g, "$1$2");
  text = text.replace(/(^|[\s,;.])\b_([^_]+)_\b(?=[\s,;.]|$)/g, "$1$2");

  // 5. Quitar bullets markdown (- item, * item, • item)
  const bullets = text.match(/^\s*[-*•·]\s+/gm);
  if (bullets) removed.bullets += bullets.length;
  text = text.replace(/^\s*[-*•·]\s+/gm, "");

  // 6. Quitar listas numeradas (1. item, 2) item)
  const numbered = text.match(/^\s*\d+[.)]\s+/gm);
  if (numbered) removed.bullets += numbered.length;
  text = text.replace(/^\s*\d+[.)]\s+/gm, "");

  // 7. Quitar code blocks
  const codeBlocks = text.match(/```[\s\S]*?```/g);
  if (codeBlocks) removed.markdown += codeBlocks.length;
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");

  // 8. Quitar exclamaciones dobles o triples (los "!!!" y "¡¡¡" no van en UHNW)
  const exclamations = text.match(EXCLAMATION_DOUBLE);
  if (exclamations) {
    removed.exclamations = exclamations.length;
    text = text.replace(EXCLAMATION_DOUBLE, "");
  }

  // 9. Reemplazar menciones prohibidas con algo neutro
  for (const pattern of FORBIDDEN_PHRASES) {
    const matches = text.match(pattern);
    if (matches) {
      removed.forbidden += matches.length;
      text = text.replace(pattern, "");
    }
  }

  // 10. Quitar frases de exclamación típicas que el modelo a veces suelta
  text = text.replace(/¡Por supuesto[!¡]?/gi, "Por supuesto.");
  text = text.replace(/¡Absolutamente[!¡]?/gi, "Absolutamente.");
  text = text.replace(/¡Excelente (elección|pregunta)[!¡]?/gi, "Excelente.");
  text = text.replace(/¡Con mucho gusto[!¡]?/gi, "Con mucho gusto.");
  text = text.replace(/¡Encantada de ayudarle[!¡]?/gi, "Encantada de ayudarle.");
  text = text.replace(/¡Claro que sí[!¡]?/gi, "Por supuesto.");

  // 11. Quitar exclamaciones de apertura y cierre que sobren (una sola está OK)
  //    pero verificamos que no quede ninguna combinación tipo "¡Texto!"
  //    La política dice NINGUNA exclamación. Las quitamos todas, incluso las "legítimas".
  text = text.replace(/¡/g, "");
  text = text.replace(/!/g, ".");

  // 12. Quitar emojis (defensa adicional, el modelo a veces se escapa uno)
  text = text.replace(
    /[[\uD800-\uDBFF][\uDC00-\uDFFF]]/g,
    ""
  );

  // 13. Normalizar saltos de línea múltiples
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");

  // 14. Trim final
  text = text.trim();

  return { text, removed };
}

/**
 * Extrae el bloque JSON del final de la respuesta del modelo.
 */
export function extractLead(raw: string): {
  lead: Record<string, unknown> | null;
  raw: string;
  parseError?: string;
} {
  const match = raw.match(/<<<LEAD>>>\s*([\s\S]*?)\s*<<<END>>>/);
  if (!match) {
    return { lead: null, raw };
  }

  try {
    const lead = JSON.parse(match[1]);
    return { lead, raw };
  } catch (err) {
    return {
      lead: null,
      raw,
      parseError: err instanceof Error ? err.message : String(err),
    };
  }
}

// ===== lib/session.ts =====
const COOKIE_NAME = "klo_session";
const MAX_TURNS = 25;
const SESSION_TTL_DAYS = 1;

export interface Session {
  id: string;
  turns: number;
  createdAt: number;
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, c) => {
      const [k, ...rest] = c.split("=");
      acc[k] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
}

function generateId(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  );
}

function serializeCookie(session: Session): string {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  return [
    `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(session))}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

export function getSession(req: VercelRequest, res: VercelResponse): Session {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[COOKIE_NAME];

  if (raw) {
    try {
      const session = JSON.parse(raw) as Session;
      if (typeof session.turns === "number" && session.id) {
        return session;
      }
    } catch {
      // cookie corrupta, la regeneramos
    }
  }

  // Sesión nueva
  const session: Session = {
    id: generateId(),
    turns: 0,
    createdAt: Date.now(),
  };
  res.setHeader("Set-Cookie", serializeCookie(session));
  return session;
}

export function incrementTurns(session: Session, res: VercelResponse): Session {
  const updated: Session = { ...session, turns: session.turns + 1 };
  res.setHeader("Set-Cookie", serializeCookie(updated));
  return updated;
}

export function shouldCloseForTurnLimit(turns: number): boolean {
  return turns >= MAX_TURNS;
}

// ===== lib/rateLimit.ts =====
// lib/rateLimit.ts
// Rate limiter in-memory. En Vercel serverless, las instancias son efímeras,
// así que esto es una salvaguarda "best effort" — no es una garantía de
// rate limit estricto. Para producción real, considera Upstash o similar.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Limpieza periódica (cada 5 minutos) para no acumular memoria
// Solo corre en instancias long-lived, en serverless se limpia al final del request
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const keys = Array.from(buckets.keys());
  for (const key of keys) {
    const entry = buckets.get(key);
    if (entry && entry.resetAt < now) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000);
// @ts-ignore — unref puede no existir en runtime
cleanupInterval.unref?.();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 10 * 60 * 1000,
  maxRequests: 25,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(identifier);

  if (!entry || entry.resetAt < now) {
    buckets.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getClientIdentifier(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  if (Array.isArray(xff) && xff[0]) return xff[0].split(",")[0].trim();
  const xri = req.headers["x-real-ip"];
  if (typeof xri === "string") return xri;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  return "unknown";
}

// ===== lib/classifier.ts =====
const SERVICE_KEYWORDS: Record<string, RegExp[]> = {
  aviacion: [
    /\bvuel[oa]s?\b/i,
    /\bcharter\b/i,
    /\bjet(s)?\b/i,
    /\bavi[oó]n\b/i,
    /\bvolar\b/i,
    /\bflight(s)?\b/i,
    /\bfly\b/i,
    /\bvoo(s)?\b/i,
    /\baircraft\b/i,
    // Frases en inglés que implican aviación
    /\b(private|commercial)\s+(jet|flight|aircraft|aviation)/i,
    /\bbook\s+(a\s+)?(jet|flight|charter)/i,
    /\b(passengers|pax)\b/i,
    /\b(business|first)\s+class\b/i,
  ],
  transporte: [
    /\btraslado(s)?\b/i,
    /\btransporte\b/i,
    /\bblindado\b/i,
    /\bsuv\b/i,
    /\bch[oó]fer\b/i,
    /\bpickup\b/i,
    /\bdriver\b/i,
    /\bvan\b/i,
    /\bmercedes\b/i,
    /\bescort\b/i,
  ],
  nautico: [
    /\byate(s)?\b/i,
    /\bbote(s)?\b/i,
    /\bvelero(s)?\b/i,
    /\bcatamar[aá]n(es)?\b/i,
    /\bbarco(s)?\b/i,
    /\bembarcaci[oó]n\b/i,
    /\byacht(s)?\b/i,
    /\bboat(s)?\b/i,
    /\bsail(ing|boat)?\b/i,
  ],
  hospedaje: [
    /\bhotel(es)?\b/i,
    /\bvilla(s)?\b/i,
    /\bsuite(s)?\b/i,
    /\balojamiento\b/i,
    /\bhospedaje\b/i,
    /\bquedarme\b/i,
    /\bdormir\b/i,
    /\bresort\b/i,
    /\baccommodation\b/i,
  ],
  staff: [
    /\bchef\b/i,
    /\bmayordomo\b/i,
    /\bseguridad\b/i,
    /\bgu[ií]a\b/i,
    /\bsommelier\b/i,
    /\bbutler\b/i,
    /\bprivate chef\b/i,
    /\bbodyguard\b/i,
  ],
};

const EXPERIENCIA_CURADA_KEYWORDS = [
  /\btodo\b/i,
  /\bpaquete\b/i,
  /\bexperiencia\b/i,
  /\ba medida\b/i,
  /\barmar(me|nos)?\b/i,
  /\borganiz(a|e|ar)(me|nos)?\b/i,
  /\bboda\b/i,
  /\bluna de miel\b/i,
  /\bcorporativo\b/i,
  /\bincentive\b/i,
  /\bretreat\b/i,
  /\bfamiliar(es)?\b/i,
  /\bcompleto\b/i,
];

const OFF_SCOPE_KEYWORDS = [
  /\bpol[ií]tica\b/i,
  /\breligi[oó]n\b/i,
  /\bnoticias?\b/i,
  /\bchiste(s)?\b/i,
  /\bcompetidor(es)?\b/i,
  /\bmedicina\b/i,
  /\babogado\b/i,
  /\blegal\b/i,
  /\bcliente(s)? (anterior|pasado)\b/i,
];

// Precio genérico: curioso (recibe pieza de valor), NO off-scope
const CURIOUS_KEYWORDS = [
  /\bcu[aá]nto (cuesta|valen?|cuestan|sale)\b/i,
  /\bprecio(s)?\b/i,
  /\bcost\b/i,
  /\bhow much\b/i,
  /\bvalue\b/i,
  /\btarifa(s)?\b/i,
];

const GREETING_PATTERNS = [
  /^\s*(hola|hi|hello|ol[aá]|boa|bom dia|buenos d[ií]as|buenas tardes|buenas noches)\s*[.!]?\s*$/i,
];

export type DetectedService =
  | "aviacion"
  | "transporte"
  | "nautico"
  | "hospedaje"
  | "staff"
  | "experiencia_curada"
  | null;

export type Classification =
  | "in_scope"
  | "curioso"
  | "off_scope"
  | "greeting"
  | "ambiguo";

export interface ClassifierResult {
  service: DetectedService;
  classification: Classification;
  matchedKeywords: string[];
  language: "es" | "en" | "pt";
}

const SPANISH_HINTS = [
  /\b(hola|gracias|por favor|quiero|necesito|busco|tengo|viaje|vuelo|hotel|villa|traslado|yate|chef)\b/i,
];
const ENGLISH_HINTS = [
  /\b(hello|hi|thanks|please|i want|i need|looking for|flight|charter|jet|hotel|villa|yacht|chef|driver)\b/i,
];
const PORTUGUESE_HINTS = [
  /\b(ol[áa]|obrigad[oa]|por favor|quero|preciso|procuro|viagem|voo|hotel|villa|iate|transfer|chefe)\b/i,
];

function detectLanguage(text: string): "es" | "en" | "pt" {
  const esScore = SPANISH_HINTS.reduce((acc, re) => acc + (re.test(text) ? 1 : 0), 0);
  const enScore = ENGLISH_HINTS.reduce((acc, re) => acc + (re.test(text) ? 1 : 0), 0);
  const ptScore = PORTUGUESE_HINTS.reduce((acc, re) => acc + (re.test(text) ? 1 : 0), 0);
  if (ptScore > esScore && ptScore > enScore) return "pt";
  if (enScore > esScore) return "en";
  return "es";
}

export function classify(text: string): ClassifierResult {
  const matchedKeywords: string[] = [];
  const detected: Set<string> = new Set();

  // 1. Detección de servicios
  for (const [service, patterns] of Object.entries(SERVICE_KEYWORDS)) {
    for (const re of patterns) {
      if (re.test(text)) {
        detected.add(service);
        matchedKeywords.push(service);
        break;
      }
    }
  }

  // 2. Detección de experiencia curada
  const isExperiencia = EXPERIENCIA_CURADA_KEYWORDS.some((re) => re.test(text));

  // 3. Detección off-scope
  const isOffScope = OFF_SCOPE_KEYWORDS.some((re) => re.test(text));

  // 3b. Detección curioso (precio genérico, no es off-scope, recibe pieza de valor)
  const isCurious = CURIOUS_KEYWORDS.some((re) => re.test(text));

  // 4. Detección saludo solo
  const isGreeting = GREETING_PATTERNS.some((re) => re.test(text));

  const language = detectLanguage(text);

  // Resolución
  let service: DetectedService = null;
  let classification: Classification = "ambiguo";

  if (isOffScope && detected.size === 0 && !isExperiencia) {
    classification = "off_scope";
  } else if (isGreeting && detected.size === 0 && !isExperiencia) {
    classification = "greeting";
  } else if (isCurious) {
    // Curioso gana sobre servicio si solo menciona keywords de servicio
    // y la pregunta central es de precio. Si da datos concretos (fechas, email,
    // pasajeros con número), sigue siendo in_scope.
    const hasConcreteData = /\b\d{1,2}[\/\-]\d{1,2}\b/.test(text) || // fecha tipo 15/12
                            /\b\d+\s*(personas|pax|pasajeros|guests)\b/i.test(text) ||
                            /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i.test(text); // email
    if (!hasConcreteData) {
      classification = "curioso";
      service = null;
    } else if (isExperiencia || detected.size >= 2) {
      service = "experiencia_curada";
      classification = "in_scope";
    } else if (detected.size === 1) {
      service = detected.values().next().value as DetectedService;
      classification = "in_scope";
    } else {
      classification = "ambiguo";
    }
  } else if (isExperiencia || detected.size >= 2) {
    service = "experiencia_curada";
    classification = "in_scope";
  } else if (detected.size === 1) {
    service = detected.values().next().value as DetectedService;
    classification = "in_scope";
  } else {
    classification = "ambiguo";
  }

  return { service, classification, matchedKeywords, language };
}

// ===== lib/telegram.ts =====
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


// === Handler principal ===
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

const HISTORY_LIMIT = 10;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const clientId = getClientIdentifier(req);
  const rate = checkRateLimit(clientId);
  if (!rate.allowed) { res.status(429).json({ error: "Too many requests", reset_at: rate.resetAt }); return; }

  const body = (req.body ?? {}) as ChatRequestBody;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const clientHistory = Array.isArray(body.history) ? body.history.slice(-HISTORY_LIMIT) : [];

  if (!message) { res.status(400).json({ error: "Message is required" }); return; }
  if (message.length > 2000) { res.status(400).json({ error: "Message too long" }); return; }

  const session = getSession(req, res);
  const updatedSession = incrementTurns(session, res);
  const turnsUsed = updatedSession.turns;

  const time = getColombiaTime();
  const classification = classify(message);

  if (!time.isOpenHours) {
    const offHoursReply = getOffHoursReply(classification.language);
    const lead = { status: "fuera_de_horario", service: null, client_name: null, email: null, phone: null, data: {}, language: classification.language, turns_used: turnsUsed };
    res.status(200).json({ reply: offHoursReply, lead, meta: { turns_used: turnsUsed, is_open_hours: false, service: null, language: classification.language, sanitized: { markdown: 0, exclamations: 0, forbidden: 0, bullets: 0 }, notified: false } });
    return;
  }

  if (shouldCloseForTurnLimit(turnsUsed)) {
    const closure = getTurnLimitClosure(classification.language, null);
    res.status(200).json({ reply: closure, lead: { status: "tibio", service: classification.service, client_name: null, email: null, phone: null, data: {}, language: classification.language, turns_used: turnsUsed }, meta: { turns_used: turnsUsed, is_open_hours: true, service: classification.service, language: classification.language, sanitized: { markdown: 0, exclamations: 0, forbidden: 0, bullets: 0 }, notified: false } });
    return;
  }

  if (classification.classification === "off_scope") {
    const offScopeReply = getOffScopeReply(classification.language);
    const lead = { status: "off_scope", service: null, client_name: null, email: null, phone: null, data: {}, language: classification.language, turns_used: turnsUsed };
    res.status(200).json({ reply: offScopeReply, lead, meta: { turns_used: turnsUsed, is_open_hours: true, service: null, language: classification.language, sanitized: { markdown: 0, exclamations: 0, forbidden: 0, bullets: 0 }, notified: false } });
    return;
  }

  const messages = [
    { role: "system" as const, content: MARIA_SYSTEM_PROMPT },
    { role: "system" as const, content: buildContextBlock({ isOpenHours: time.isOpenHours, turnsUsed, colombiaTime: time.iso, history: clientHistory }) },
    ...clientHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  let rawReply: string;
  try {
    const llmResponse = await chat(messages, { temperature: 0.7, maxTokens: 700 });
    rawReply = llmResponse.text;
  } catch (err) {
    console.error("[chat] LLM error:", err);
    res.status(502).json({ error: "Upstream model error" });
    return;
  }

  const { lead: parsedLead, raw: rawAfterExtract, parseError } = extractLead(rawReply);
  const { text: visibleReply, removed } = sanitize(rawAfterExtract);

  if (parseError) console.warn("[chat] JSON parse error:", parseError);

  // Detectar email en el mensaje del cliente (por si el JSON no se parseó)
  const emailInUserMessage = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.exec(message);
  const hasEmail = !!emailInUserMessage;
  const hasService = classification.service !== null;

  // Si el JSON no se pudo parsear pero tenemos email + servicio en el mensaje,
  // promovemos a "caliente" en vez de quedar como "tibio" silencioso.
  let recoveredStatus: string | null = null;
  if (!parsedLead && hasEmail && hasService) {
    recoveredStatus = "caliente";
  }

  const finalLead: Record<string, unknown> = parsedLead ?? {
    status: recoveredStatus ?? "tibio",
    service: classification.service,
    client_name: null,
    email: emailInUserMessage ? emailInUserMessage[0] : null,
    phone: null,
    data: {},
    language: classification.language,
    turns_used: turnsUsed,
  };
  finalLead.turns_used = turnsUsed;
  finalLead.language = classification.language;
  if (!finalLead.service) finalLead.service = classification.service;

  let notified = false;
  if (finalLead.status === "caliente" || finalLead.status === "tibio") {
    const result = await notifyLead({ ...(finalLead as unknown as Parameters<typeof notifyLead>[0]), message });
    notified = result.sent;
    if (!result.sent && result.error) console.warn("[chat] Telegram notify failed:", result.error);
  }

  res.status(200).json({
    reply: visibleReply,
    lead: finalLead,
    meta: { turns_used: turnsUsed, is_open_hours: true, service: (finalLead.service as string | null) ?? null, language: classification.language, sanitized: removed, notified },
  });
}

function getOffHoursReply(lang: "es" | "en" | "pt"): string {
  switch (lang) {
    case "en": return "Thank you for reaching out. I will respond first thing tomorrow morning. Wishing you a wonderful evening.";
    case "pt": return "Obrigada por entrar em contato. Responderei primeira hora amanhã. Desejo-lhe uma excelente noite.";
    default: return "Gracias por escribirnos. Le responderé mañana a primera hora. KLO le desea una excelente noche.";
  }
}

function getOffScopeReply(lang: "es" | "en" | "pt"): string {
  switch (lang) {
    case "en": return "That falls outside what I can assist with directly. For specialized inquiries, please reach our team at hola@karibbeanluxuryoperators.lat — they will be happy to help.";
    case "pt": return "Isso está fora do que posso ajudar diretamente. Para consultas especializadas, por favor escreva para hola@karibbeanluxuryoperators.lat — a equipe terá prazer em ajudar.";
    default: return "Eso queda fuera de lo que puedo asistirle directamente. Para consultas especializadas, le sugiero escribir a hola@karibbeanluxuryoperators.lat — el equipo le responderá con gusto.";
  }
}

function getTurnLimitClosure(lang: "es" | "en" | "pt", email: string | null): string {
  const placeholder = email
    ? email
    : lang === "en"
      ? "your email"
      : lang === "pt"
        ? "seu email"
        : "su email";
  switch (lang) {
    case "en": return `Thank you for your time. To continue with your inquiry, I will write to ${placeholder} first thing tomorrow with additional details. It has been a pleasure.`;
    case "pt": return `Obrigada pelo seu tempo. Para continuar com sua consulta, escreverei para ${placeholder} amanhã primeira hora com mais detalhes. Foi um prazer.`;
    default: return `Gracias por su tiempo. Para continuar con su consulta, le escribo a ${placeholder} mañana a primera hora con más detalles. Ha sido un placer.`;
  }
}
