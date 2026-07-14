// lib/session.ts
// Manejo de sesión y contador de turnos vía cookie httpOnly.
// En Vercel serverless no hay estado compartido entre invocaciones,
// así que la cookie es la fuente de verdad.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const COOKIE_NAME = "klo_session";
const MAX_TURNS = 10;
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
