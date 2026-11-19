/**
 * Reglas de clasificación (puramente numéricas, sin base de datos):
 * - Ganar da 2 puntos, perder da 1.
 * - Cada partido suma 1 en J, y los puntos a favor (PF) y en contra (PC).
 */
export type MatchSnapshot = {
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  players: { playerId: string; pts: number; t3: number }[];
};

export type TeamInc = { g: number; p: number; j: number; pts: number; pf: number; pc: number };
export type PlayerInc = { gp: number; pts: number; t3: number };

export const POINTS_WIN = 2;
export const POINTS_LOSS = 1;

export function teamIncs(m: MatchSnapshot): Map<string, TeamInc> {
  const homeWon = m.homeScore > m.awayScore;
  const side = (won: boolean, pf: number, pc: number): TeamInc => ({
    g: won ? 1 : 0,
    p: won ? 0 : 1,
    j: 1,
    pts: won ? POINTS_WIN : POINTS_LOSS,
    pf,
    pc,
  });
  return new Map([
    [m.homeId, side(homeWon, m.homeScore, m.awayScore)],
    [m.awayId, side(!homeWon, m.awayScore, m.homeScore)],
  ]);
}

export function playerIncs(m: MatchSnapshot): Map<string, PlayerInc> {
  return new Map(m.players.map((p) => [p.playerId, { gp: 1, pts: p.pts, t3: p.t3 }]));
}

/** Diferencia (next - prev) por id. Sirve para editar o borrar un partido sin recalcular todo. */
export function diffIncs<T extends Record<string, number>>(
  prev: Map<string, T> | undefined,
  next: Map<string, T> | undefined
): Map<string, T> {
  const out = new Map<string, T>();
  const keys = new Set([...(prev?.keys() ?? []), ...(next?.keys() ?? [])]);
  for (const key of keys) {
    const a = prev?.get(key);
    const b = next?.get(key);
    const ref = (b ?? a) as T;
    const delta: Record<string, number> = {};
    let changed = false;
    for (const field of Object.keys(ref)) {
      const d = (b?.[field] ?? 0) - (a?.[field] ?? 0);
      delta[field] = d;
      if (d !== 0) changed = true;
    }
    if (changed) out.set(key, delta as T);
  }
  return out;
}

export function negate<T extends Record<string, number>>(map: Map<string, T>): Map<string, T> {
  const out = new Map<string, T>();
  for (const [key, inc] of map) {
    out.set(key, Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, -v])) as T);
  }
  return out;
}
