import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import Player from "@/models/Player";

const ROMAN = ["I", "II", "III"];

type Rama = "varonil" | "femenil";
type Metrica = "pts" | "t3";
type PlayerDoc = {
  _id: unknown;
  name: string;
  teamName: string;
  stats?: { gp?: number; pts?: number; t3?: number };
};

function Pill({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
        active ? "bg-liga-navy text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </Link>
  );
}

async function Leaders({
  searchParams,
}: {
  searchParams: Promise<{ rama?: string; division?: string; metrica?: string }>;
}) {
  const params = await searchParams;
  const rama: Rama = params.rama === "femenil" ? "femenil" : "varonil";
  const n = Number(params.division);
  const division = n === 2 || n === 3 ? n : 1;
  const metrica: Metrica = params.metrica === "t3" ? "t3" : "pts";

  const sort: Record<string, 1 | -1> = { [`stats.${metrica}`]: -1, "stats.gp": 1 };

  await connectDB();
  const docs = (await Player.find({ season: SEASON, rama, division })
    .sort(sort)
    .limit(10)
    .lean()) as unknown as PlayerDoc[];

  const q = (r: string, d: number, m: string) => `/lideres?rama=${r}&division=${d}&metrica=${m}`;
  const cell = "bg-liga-ice py-2 text-center tabular-nums text-gray-800";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 px-4">
        <Pill href={q("varonil", division, metrica)} active={rama === "varonil"}>Varonil</Pill>
        <Pill href={q("femenil", division, metrica)} active={rama === "femenil"}>Femenil</Pill>
        <span className="mx-2 text-gray-300">|</span>
        {[1, 2, 3].map((d) => (
          <Pill key={d} href={q(rama, d, metrica)} active={division === d}>
            División {ROMAN[d - 1]}
          </Pill>
        ))}
      </div>
      <div className="mb-4 flex justify-center gap-2 px-4">
        <Pill href={q(rama, division, "pts")} active={metrica === "pts"}>Puntos</Pill>
        <Pill href={q(rama, division, "t3")} active={metrica === "t3"}>Triples (3 pts)</Pill>
      </div>

      <div className="bg-liga-navy py-4 text-center text-white">
        <h2 className="text-xl font-bold uppercase">
          {metrica === "pts" ? "Líderes de anotación" : "Líderes de triples"}
        </h2>
        <p className="text-xs font-bold uppercase">
          {rama} · DIVISIÓN {ROMAN[division - 1]}
        </p>
      </div>

      {docs.length === 0 ? (
        <p className="py-8 text-center text-gray-500">Aún no hay jugadores registrados en esta división.</p>
      ) : (
        <div className="overflow-x-auto px-2 pt-3">
          <table className="w-full border-separate border-spacing-1 text-sm">
            <thead>
              <tr className="text-liga-navy">
                <th className="w-12 py-2 text-center font-bold">Pos</th>
                <th className="py-2 text-left font-semibold">JUGADOR</th>
                <th className="w-14 py-2 text-center font-semibold">JJ</th>
                <th className="w-14 py-2 text-center font-semibold">PTS</th>
                <th className="w-14 py-2 text-center font-semibold">PPJ</th>
                <th className="w-14 py-2 text-center font-semibold">3PT</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((p, i) => {
                const s = { gp: 0, pts: 0, t3: 0, ...p.stats };
                return (
                  <tr key={String(p._id)}>
                    <td className="bg-liga-navy py-2 text-center text-white">{i + 1}</td>
                    <td className="bg-gray-100 px-3 py-2">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs uppercase text-gray-500">{p.teamName}</p>
                    </td>
                    <td className={cell}>{s.gp}</td>
                    <td className={`${cell} ${metrica === "pts" ? "font-bold" : ""}`}>{s.pts}</td>
                    <td className={cell}>{s.gp ? (s.pts / s.gp).toFixed(1) : "0.0"}</td>
                    <td className={`${cell} ${metrica === "t3" ? "font-bold" : ""}`}>{s.t3}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function LideresPage({
  searchParams,
}: {
  searchParams: Promise<{ rama?: string; division?: string; metrica?: string }>;
}) {
  return (
    <main className="mx-auto max-w-3xl pb-12">
      <header className="px-4 py-8 text-center">
        <h1 className="text-3xl font-bold">Líderes individuales</h1>
        <p className="mt-1 text-gray-600">Anotación y triples · Temporada {SEASON.replace("-", " - ")}</p>
      </header>
      <Suspense fallback={<p className="py-8 text-center text-gray-500">Cargando líderes...</p>}>
        <Leaders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}