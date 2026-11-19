import { Suspense } from "react";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import { formatDate } from "@/lib/format";
import Match from "@/models/Match";
import Pill from "@/components/Pill";

const ROMAN = ["I", "II", "III"];

type SP = Promise<{ rama?: string; division?: string; jornada?: string }>;
type Line = { playerId: unknown; name: string; teamId: unknown; pts: number; t3: number };
type MatchDoc = {
  _id: unknown;
  date?: string;
  home: { teamId: unknown; teamName: string; score: number };
  away: { teamId: unknown; teamName: string; score: number };
  players: Line[];
};

function Lines({ title, lines }: { title: string; lines: Line[] }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase text-liga-navy">{title}</p>
      <ul className="text-sm text-gray-700">
        {[...lines]
          .sort((a, b) => b.pts - a.pts || b.t3 - a.t3)
          .map((l) => (
            <li key={String(l.playerId)} className="flex justify-between gap-2 tabular-nums">
              <span className="truncate">{l.name}</span>
              <span className="shrink-0 text-gray-500">
                {l.pts} pts · {l.t3} triples
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
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
  const jornada = Number.isInteger(requested) && requested >= 1 && requested <= maxJ ? requested : maxJ;

  const matches =
    maxJ === 0
      ? []
      : ((await Match.find({ season: SEASON, rama, division, jornada })
          .sort({ date: 1, createdAt: 1 })
          .lean()) as unknown as MatchDoc[]);

  const q = (r: string, d: number, j?: number) =>
    `/jornadas?rama=${r}&division=${d}${j ? `&jornada=${j}` : ""}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2 px-4">
        <Pill href={q("varonil", division)} active={rama === "varonil"}>Varonil</Pill>
        <Pill href={q("femenil", division)} active={rama === "femenil"}>Femenil</Pill>
        <span className="mx-2 text-gray-300">|</span>
        {[1, 2, 3].map((d) => (
          <Pill key={d} href={q(rama, d)} active={division === d}>
            División {ROMAN[d - 1]}
          </Pill>
        ))}
      </div>

      {maxJ === 0 ? (
        <p className="py-8 text-center text-gray-500">Aún no hay resultados en esta división.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 px-4">
            {Array.from({ length: maxJ }, (_, i) => i + 1).map((j) => (
              <Pill key={j} href={q(rama, division, j)} active={jornada === j}>
                {j}
              </Pill>
            ))}
          </div>

          <div className="bg-liga-navy py-4 text-center text-white">
            <h2 className="text-xl font-bold uppercase">Jornada {jornada}</h2>
            <p className="text-xs font-bold uppercase">
              {rama} · DIVISIÓN {ROMAN[division - 1]}
            </p>
          </div>

          <ul className="mt-4 flex flex-col gap-3 px-2">
            {matches.map((m) => {
              const homeWon = m.home.score > m.away.score;
              const side = (id: unknown) => m.players.filter((p) => String(p.teamId) === String(id));
              return (
                <li key={String(m._id)} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
                    <p className={`text-right ${homeWon ? "font-bold text-gray-900" : "text-gray-600"}`}>
                      {m.home.teamName}
                    </p>
                    <p className="rounded bg-liga-navy px-3 py-1 text-white tabular-nums">
                      {m.home.score} – {m.away.score}
                    </p>
                    <p className={homeWon ? "text-gray-600" : "font-bold text-gray-900"}>{m.away.teamName}</p>
                  </div>
                  {m.date && <p className="pb-2 text-center text-xs text-gray-500">{formatDate(m.date)}</p>}
                  {m.players.length > 0 && (
                    <details className="border-t border-gray-100 px-4 py-2">
                      <summary className="cursor-pointer text-sm text-liga-navy">Estadísticas de jugadores</summary>
                      <div className="mt-2 grid gap-4 sm:grid-cols-2">
                        <Lines title={m.home.teamName} lines={side(m.home.teamId)} />
                        <Lines title={m.away.teamName} lines={side(m.away.teamId)} />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

export default function JornadasPage({ searchParams }: { searchParams: SP }) {
  return (
    <main className="mx-auto max-w-3xl pb-12">
      <header className="px-4 py-8 text-center">
        <h1 className="text-3xl font-bold">Resultados por jornada</h1>
        <p className="mt-1 text-gray-600">Temporada {SEASON.replace("-", " - ")}</p>
      </header>
      <Suspense fallback={<p className="py-8 text-center text-gray-500">Cargando resultados...</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
