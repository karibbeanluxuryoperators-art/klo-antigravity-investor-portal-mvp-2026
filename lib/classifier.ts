// lib/classifier.ts
// Detección rápida de servicio y scope (antes de gastar tokens grandes).
// Heurística basada en keywords — corre en <1ms, evita un round-trip a Groq.

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
