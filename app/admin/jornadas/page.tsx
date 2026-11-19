import { Suspense } from "react";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import { formatDate } from "@/lib/format";
import Team from "@/models/Team";
import Player from "@/models/Player";
import Match from "@/models/Match";
import Pill from "@/components/Pill";
import MatchForm, { type MatchFormInitial, type RosterPlayer } from "@/components/MatchForm";
import MatchDeleteButton from "@/components/MatchDeleteButton";

const ROMAN = ["I", "II", "III"];

type SP = Promise<{ rama?: string; division?: string; jornada?: string; editar?: string }>;
type TeamDoc = { _id: unknown; name: string };
type PlayerDoc = { _id: unknown; name: string; number?: number; teamId: unknown };
type MatchDoc = {
  _id: unknown;
  jornada: number;
  date?: string;
  home: { teamId: unknown; teamName: string; score: number };
  away: { teamId: unknown; teamName: string; score: number };
  players: { playerId: unknown; pts: number; t3: number }[];
};

async function Content({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  if (!(await isAdmin())) {
    return (
      <p className="text-gray-600">
        Necesitas iniciar sesión en{" "}
        <Link href="/admin" className="font-semibold text-orange-600 underline">
          /admin
        </Link>
        .
      </p>
    );
  }

  const rama = params.rama === "femenil" ? "femenil" : "varonil";
  const n = Number(params.division);
  const division = n === 2 || n === 3 ? n : 1;

  await connectDB();
  const last = (await Match.findOne({ season: SEASON, rama, division })
    .sort({ jornada: -1 })
    .select("jornada")
    .lean()) as unknown as { jornada: number } | null;
  const maxJ = last?.jornada ?? 0;

  const requested = Number(params.jornada);
  const jornada = Number.isInteger(requested) && requested >= 1 && requested <= 99 ? requested : Math.max(maxJ, 1);

  const [teams, players, matches] = await Promise.all([
    Team.find({ season: SEASON, rama, division, status: "activo" }).sort({ name: 1 }).lean() as unknown as Promise<TeamDoc[]>,
    Player.find({ season: SEASON, rama, division }).sort({ number: 1, name: 1 }).lean() as unknown as Promise<PlayerDoc[]>,
    Match.find({ season: SEASON, rama, division, jornada }).sort({ createdAt: 1 }).lean() as unknown as Promise<MatchDoc[]>,
  ]);

  const rosters: Record<string, RosterPlayer[]> = {};
  for (const p of players) {
    (rosters[String(p.teamId)] ??= []).push({ id: String(p._id), name: p.name, number: p.number });
  }

  const editing = matches.find((m) => String(m._id) === params.editar);
  const initial: MatchFormInitial | undefined = editing && {
    id: String(editing._id),
    date: editing.date ?? "",
    homeId: String(editing.home.teamId),
    awayId: String(editing.away.teamId),
    homeScore: editing.home.score,
    awayScore: editing.away.score,
    players: editing.players.map((p) => ({ playerId: String(p.playerId), pts: p.pts, t3: p.t3 })),
  };

  const played = new Set(matches.flatMap((m) => [String(m.home.teamId), String(m.away.teamId)]));
  const resting = teams.filter((t) => !played.has(String(t._id)));

  const q = (r: string, d: number, j: number) => `/admin/jornadas?rama=${r}&division=${d}&jornada=${j}`;
  const jornadas = Array.from({ length: maxJ + 1 }, (_, i) => i + 1);
  if (!jornadas.includes(jornada)) jornadas.push(jornada);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill href={q("varonil", division, jornada)} active={rama === "varonil"}>Varonil</Pill>
        <Pill href={q("femenil", division, jornada)} active={rama === "femenil"}>Femenil</Pill>
        <span className="mx-2 text-gray-300">|</span>
        {[1, 2, 3].map((d) => (
          <Pill key={d} href={q(rama, d, jornada)} active={division === d}>
            División {ROMAN[d - 1]}
          </Pill>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-gray-600">Jornada:</span>
        {jornadas.map((j) => (
          <Pill key={j} href={q(rama, division, j)} active={jornada === j}>
            {j > maxJ ? `${j} (nueva)` : j}
          </Pill>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-bold text-liga-navy">
        Jornada {jornada} · {rama} · División {ROMAN[division - 1]}
      </h2>

      {matches.length === 0 ? (
        <p className="mb-6 text-gray-500">Aún no hay partidos capturados en esta jornada.</p>
      ) : (
        <ul className="mb-6 flex flex-col gap-2">
          {matches.map((m) => (
            <li
              key={String(m._id)}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
            >
              <p className="min-w-0 flex-1 text-sm">
                <span className={m.home.score > m.away.score ? "font-bold" : ""}>{m.home.teamName}</span>{" "}
                <span className="tabular-nums">
                  {m.home.score} – {m.away.score}
                </span>{" "}
                <span className={m.away.score > m.home.score ? "font-bold" : ""}>{m.away.teamName}</span>
                {m.date && <span className="ml-2 text-xs text-gray-500">{formatDate(m.date)}</span>}
              </p>
              <Link
                href={`${q(rama, division, jornada)}&editar=${String(m._id)}`}
                className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Editar
              </Link>
              <MatchDeleteButton id={String(m._id)} />
            </li>
          ))}
        </ul>
      )}

      {resting.length > 0 && matches.length > 0 && (
        <p className="mb-6 text-sm text-gray-500">
          Sin partido en esta jornada: {resting.map((t) => t.name).join(", ")}.
        </p>
      )}

      <h2 className="mb-3 text-lg font-bold text-liga-navy">{initial ? "Editar partido" : "Nuevo partido"}</h2>
      <MatchForm
        key={initial?.id ?? `new-${rama}-${division}-${jornada}-${matches.length}`}
        rama={rama}
        division={division}
        jornada={jornada}
        teams={teams.map((t) => ({ id: String(t._id), name: t.name }))}
        rosters={rosters}
        initial={initial}
      />
    </>
  );
}

export default function AdminJornadasPage({ searchParams }: { searchParams: SP }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Resultados por jornada</h1>
      <p className="mb-6 text-sm text-gray-600">
        Al guardar un partido se actualizan automáticamente Posiciones (2 pts por ganar, 1 por perder) y Líderes.{" "}
        <Link href="/admin" className="underline">
          Volver al panel
        </Link>
      </p>
      <Suspense fallback={<p className="text-gray-500">Cargando...</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
