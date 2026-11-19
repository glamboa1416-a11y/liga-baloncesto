import { isValidObjectId, type Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import Team from "@/models/Team";
import Player from "@/models/Player";
import Match from "@/models/Match";
import {
  diffIncs,
  negate,
  playerIncs,
  teamIncs,
  type MatchSnapshot,
  type PlayerInc,
  type TeamInc,
} from "@/lib/standings";

export type MatchInput = {
  rama: string;
  division: number;
  jornada: number;
  date?: string;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  players: { playerId: string; pts: number; t3: number }[];
};

export type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

type TeamDoc = { _id: Types.ObjectId; name: string };
type PlayerDoc = { _id: Types.ObjectId; name: string; teamId: Types.ObjectId };
type LineDoc = { playerId: Types.ObjectId; name: string; teamId: Types.ObjectId; pts: number; t3: number };
type MatchDoc = {
  _id: Types.ObjectId;
  home: { teamId: Types.ObjectId; teamName: string; score: number };
  away: { teamId: Types.ObjectId; teamName: string; score: number };
  players: LineDoc[];
};

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

function snapshotOf(m: MatchDoc): MatchSnapshot {
  return {
    homeId: String(m.home.teamId),
    awayId: String(m.away.teamId),
    homeScore: m.home.score,
    awayScore: m.away.score,
    players: m.players.map((p) => ({ playerId: String(p.playerId), pts: p.pts, t3: p.t3 })),
  };
}

const prefixed = (inc: Record<string, number>) =>
  Object.fromEntries(Object.entries(inc).map(([k, v]) => [`stats.${k}`, v]));

async function applyTeams(delta: Map<string, TeamInc>) {
  if (!delta.size) return;
  await Team.bulkWrite(
    [...delta].map(([id, inc]) => ({
      updateOne: { filter: { _id: id }, update: { $inc: prefixed(inc) } },
    }))
  );
}

async function applyPlayers(delta: Map<string, PlayerInc>) {
  if (!delta.size) return;
  await Player.bulkWrite(
    [...delta].map(([id, inc]) => ({
      updateOne: { filter: { _id: id }, update: { $inc: prefixed(inc) } },
    }))
  );
}

/** Aplica los incrementos a equipos y jugadores; si algo falla, deshace lo ya aplicado. */
async function applyDelta(teams: Map<string, TeamInc>, players: Map<string, PlayerInc>) {
  await applyTeams(teams);
  try {
    await applyPlayers(players);
  } catch (error) {
    await applyTeams(negate(teams)).catch(() => undefined);
    throw error;
  }
}

export async function saveMatch(input: MatchInput, id?: string): Promise<Result> {
  const { rama, homeId, awayId } = input;
  if (rama !== "varonil" && rama !== "femenil") return fail("Rama inválida");
  const division = input.division;
  if (division !== 1 && division !== 2 && division !== 3) return fail("División inválida");
  const jornada = input.jornada;
  if (!isInt(jornada) || jornada < 1 || jornada > 99) return fail("Jornada inválida");
  const { homeScore, awayScore } = input;
  if (!isInt(homeScore) || !isInt(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 300 || awayScore > 300) {
    return fail("Captura marcadores válidos (números enteros)");
  }
  if (!isValidObjectId(homeId) || !isValidObjectId(awayId)) return fail("Elige los dos equipos");
  if (homeId === awayId) return fail("Elige dos equipos distintos");
  if (homeScore === awayScore) return fail("En básquetbol no hay empates: revisa el marcador");
  const date = input.date ?? "";
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Fecha inválida");
  if (!Array.isArray(input.players)) return fail("Estadísticas de jugadores inválidas");

  await connectDB();

  const teams = (await Team.find({
    _id: { $in: [homeId, awayId] },
    season: SEASON,
    rama,
    division,
  }).lean()) as unknown as TeamDoc[];
  const home = teams.find((t) => String(t._id) === homeId);
  const away = teams.find((t) => String(t._id) === awayId);
  if (!home || !away) return fail("Los equipos deben ser de la misma rama y división");

  // Jugadores
  const playerIds = input.players.map((p) => p.playerId);
  if (playerIds.some((pid) => !isValidObjectId(pid))) return fail("Jugador inválido");
  if (new Set(playerIds).size !== playerIds.length) return fail("Hay un jugador repetido");
  const playerDocs = (await Player.find({
    _id: { $in: playerIds },
    season: SEASON,
    teamId: { $in: [homeId, awayId] },
  }).lean()) as unknown as PlayerDoc[];
  if (playerDocs.length !== playerIds.length) return fail("Hay jugadores que no pertenecen a estos equipos");

  const lines: LineDoc[] = [];
  const sums = { [homeId]: 0, [awayId]: 0 };
  for (const p of input.players) {
    const doc = playerDocs.find((d) => String(d._id) === p.playerId)!;
    if (!isInt(p.pts) || !isInt(p.t3) || p.pts < 0 || p.t3 < 0 || p.pts > 200) {
      return fail(`${doc.name}: captura puntos y triples válidos`);
    }
    if (p.t3 * 3 > p.pts) return fail(`${doc.name}: sus triples suman más puntos que los que anotó`);
    sums[String(doc.teamId)] += p.pts;
    lines.push({ playerId: doc._id, name: doc.name, teamId: doc.teamId, pts: p.pts, t3: p.t3 });
  }
  if (sums[homeId] > homeScore) {
    return fail(`Los jugadores de ${home.name} suman ${sums[homeId]} puntos y el marcador es ${homeScore}`);
  }
  if (sums[awayId] > awayScore) {
    return fail(`Los jugadores de ${away.name} suman ${sums[awayId]} puntos y el marcador es ${awayScore}`);
  }

  // Un equipo solo juega una vez por jornada
  const busy = await Match.findOne({
    season: SEASON,
    rama,
    division,
    jornada,
    ...(id ? { _id: { $ne: id } } : {}),
    $or: [{ "home.teamId": { $in: [homeId, awayId] } }, { "away.teamId": { $in: [homeId, awayId] } }],
  }).lean();
  if (busy) return fail(`Alguno de esos equipos ya tiene partido en la jornada ${jornada}`);

  let old: MatchDoc | null = null;
  if (id) {
    if (!isValidObjectId(id)) return fail("Partido inválido");
    old = (await Match.findById(id).lean()) as unknown as MatchDoc | null;
    if (!old) return fail("El partido ya no existe");
  }

  const doc = {
    season: SEASON,
    rama,
    division,
    jornada,
    date,
    home: { teamId: home._id, teamName: home.name, score: homeScore },
    away: { teamId: away._id, teamName: away.name, score: awayScore },
    players: lines,
  };
  const next = snapshotOf({ _id: old?._id ?? home._id, ...doc } as unknown as MatchDoc);
  const teamDelta = diffIncs(old ? teamIncs(snapshotOf(old)) : undefined, teamIncs(next));
  const playerDelta = diffIncs(old ? playerIncs(snapshotOf(old)) : undefined, playerIncs(next));

  let createdId: Types.ObjectId | null = null;
  if (old) {
    await Match.updateOne({ _id: old._id }, { $set: doc });
  } else {
    createdId = (await Match.create(doc))._id;
  }

  try {
    await applyDelta(teamDelta, playerDelta);
  } catch {
    if (old) await Match.replaceOne({ _id: old._id }, old).catch(() => undefined);
    else if (createdId) await Match.deleteOne({ _id: createdId }).catch(() => undefined);
    return fail("No se pudo actualizar la clasificación. No se guardó ningún cambio.");
  }
  return { ok: true };
}

export async function removeMatch(id: string): Promise<Result> {
  if (!isValidObjectId(id)) return fail("Partido inválido");
  await connectDB();
  const old = (await Match.findById(id).lean()) as unknown as MatchDoc | null;
  if (!old) return fail("El partido ya no existe");

  const snap = snapshotOf(old);
  await Match.deleteOne({ _id: old._id });
  try {
    await applyDelta(
      diffIncs(teamIncs(snap), undefined),
      diffIncs(playerIncs(snap), undefined)
    );
  } catch {
    await Match.create(old).catch(() => undefined);
    return fail("No se pudo revertir la clasificación. El partido no se eliminó.");
  }
  return { ok: true };
}
