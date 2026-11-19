"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMatchAction } from "@/app/admin/actions";

export type TeamOpt = { id: string; name: string };
export type RosterPlayer = { id: string; name: string; number?: number };
export type MatchFormInitial = {
  id: string;
  date: string;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  players: { playerId: string; pts: number; t3: number }[];
};

type Line = { played: boolean; pts: string; t3: string };

const field = "rounded border border-gray-300 px-3 py-2 text-gray-900";
const small = "w-16 rounded border border-gray-300 px-2 py-1 text-center text-gray-900";
const toInt = (s: string) => (s.trim() === "" ? 0 : Number(s));

export default function MatchForm({
  rama,
  division,
  jornada,
  teams,
  rosters,
  initial,
}: {
  rama: string;
  division: number;
  jornada: number;
  teams: TeamOpt[];
  rosters: Record<string, RosterPlayer[]>;
  initial?: MatchFormInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [date, setDate] = useState(initial?.date ?? "");
  const [homeId, setHomeId] = useState(initial?.homeId ?? "");
  const [awayId, setAwayId] = useState(initial?.awayId ?? "");
  const [homeScore, setHomeScore] = useState(initial ? String(initial.homeScore) : "");
  const [awayScore, setAwayScore] = useState(initial ? String(initial.awayScore) : "");
  const [lines, setLines] = useState<Record<string, Line>>(() =>
    Object.fromEntries(
      (initial?.players ?? []).map((p) => [p.playerId, { played: true, pts: String(p.pts), t3: String(p.t3) }])
    )
  );

  const lineOf = (id: string): Line => lines[id] ?? { played: false, pts: "", t3: "" };
  function setLine(id: string, patch: Partial<Line>) {
    setLines((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { played: false, pts: "", t3: "" }), ...patch } }));
  }

  const listUrl = `/admin/jornadas?rama=${rama}&division=${division}&jornada=${jornada}`;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const players = [...(rosters[homeId] ?? []), ...(rosters[awayId] ?? [])]
      .filter((p) => lineOf(p.id).played)
      .map((p) => ({ playerId: p.id, pts: toInt(lineOf(p.id).pts), t3: toInt(lineOf(p.id).t3) }));

    startTransition(async () => {
      const res = await saveMatchAction(
        {
          rama,
          division,
          jornada,
          date,
          homeId,
          awayId,
          homeScore: toInt(homeScore),
          awayScore: toInt(awayScore),
          players,
        },
        initial?.id
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(listUrl);
      router.refresh();
    });
  }

  function renderSide({
    title,
    teamId,
    otherId,
    onTeam,
    score,
    onScore,
  }: {
    title: string;
    teamId: string;
    otherId: string;
    onTeam: (v: string) => void;
    score: string;
    onScore: (v: string) => void;
  }) {
    const roster = rosters[teamId] ?? [];
    const assigned = roster.reduce((sum, p) => sum + (lineOf(p.id).played ? toInt(lineOf(p.id).pts) : 0), 0);
    const total = toInt(score);

    return (
      <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase text-liga-navy">{title}</h3>
        <div className="flex gap-2">
          <select value={teamId} onChange={(e) => onTeam(e.target.value)} required className={`${field} min-w-0 flex-1`}>
            <option value="">Selecciona equipo</option>
            {teams
              .filter((t) => t.id !== otherId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <input
            type="number"
            min={0}
            max={300}
            inputMode="numeric"
            required
            value={score}
            onChange={(e) => onScore(e.target.value)}
            placeholder="Pts"
            aria-label={`Marcador ${title}`}
            className={`${field} w-24 text-center text-lg font-bold`}
          />
        </div>

        {teamId && roster.length === 0 && (
          <p className="text-sm text-gray-500">
            Este equipo no tiene jugadores registrados. Agrégalos en Plantillas para llevar sus estadísticas.
          </p>
        )}

        {roster.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="w-10 py-1 font-semibold">Jugó</th>
                  <th className="py-1 font-semibold">Jugador</th>
                  <th className="w-20 py-1 text-center font-semibold">PTS</th>
                  <th className="w-20 py-1 text-center font-semibold">3PT</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => {
                  const l = lineOf(p.id);
                  return (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="py-1">
                        <input
                          type="checkbox"
                          checked={l.played}
                          onChange={(e) => setLine(p.id, { played: e.target.checked })}
                          aria-label={`${p.name} jugó`}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        {p.number !== undefined && <span className="mr-1 text-gray-400">#{p.number}</span>}
                        {p.name}
                      </td>
                      <td className="py-1 text-center">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={l.pts}
                          onChange={(e) => setLine(p.id, { pts: e.target.value, ...(e.target.value !== "" && { played: true }) })}
                          className={small}
                          aria-label={`Puntos de ${p.name}`}
                        />
                      </td>
                      <td className="py-1 text-center">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={l.t3}
                          onChange={(e) => setLine(p.id, { t3: e.target.value, ...(e.target.value !== "" && { played: true }) })}
                          className={small}
                          aria-label={`Triples de ${p.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p
              className={`text-sm ${
                assigned > total ? "font-semibold text-red-600" : assigned < total ? "text-amber-600" : "text-green-600"
              }`}
            >
              Puntos de jugadores: {assigned} / {total || 0}
              {assigned < total && total > 0 && ` (faltan ${total - assigned} por asignar)`}
              {assigned > total && " (superan el marcador)"}
            </p>
          </>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-gray-700" htmlFor="fecha">
          Fecha del partido
        </label>
        <input id="fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        <span className="text-sm text-gray-500">(opcional)</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {renderSide({ title: "Local", teamId: homeId, otherId: awayId, onTeam: setHomeId, score: homeScore, onScore: setHomeScore })}
        {renderSide({ title: "Visitante", teamId: awayId, otherId: homeId, onTeam: setAwayId, score: awayScore, onScore: setAwayScore })}
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-orange-600 px-6 py-2 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {pending ? "Guardando..." : initial ? "Guardar cambios" : "Guardar partido"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={() => router.push(listUrl)}
            className="rounded border border-gray-300 px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
