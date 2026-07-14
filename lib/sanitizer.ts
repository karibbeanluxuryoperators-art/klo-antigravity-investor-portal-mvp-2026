// lib/sanitizer.ts
// Limpia la respuesta del modelo antes de mostrarla al cliente.
// 5 capas de protección.

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
    /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE0F}]/gu,
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
