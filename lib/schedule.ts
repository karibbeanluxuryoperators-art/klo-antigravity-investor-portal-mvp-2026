// lib/schedule.ts
// Lógica de horario Colombia (GMT-5). KLO atiende Lun-Sáb 8am-8pm.
// Usa Intl.DateTimeFormat con timeZone explícito para evitar bugs de offset.

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

function formatISOInBogota(date: Date): string {
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
