import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Gochi_Hand } from "next/font/google";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import Team from "@/models/Team";
import StandingsTable, { type Row } from "@/components/StandingsTable";

const hand = Gochi_Hand({ subsets: ["latin"], weight: "400" });
const ROMAN = ["I", "II", "III"];

type Rama = "varonil" | "femenil";
type TeamDoc = {
  _id: unknown;
  name: string;
  logoUrl?: string;
  status: "activo" | "baja";
  stats?: Partial<Row["stats"]>;
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

async function Standings({
  searchParams,
}: {
  searchParams: Promise<{ rama?: string; division?: string }>;
}) {
  const params = await searchParams;
  const rama: Rama = params.rama === "femenil" ? "femenil" : "varonil";
  const n = Number(params.division);
  const division = n === 2 || n === 3 ? n : 1;

  await connectDB();
  const docs = (await Team.find({ season: SEASON, rama, division }).lean()) as unknown as TeamDoc[];

  const rows: Row[] = docs.map((t) => ({
    _id: String(t._id),
    name: t.name,
    logoUrl: t.logoUrl,
    status: t.status,
    stats: { g: 0, p: 0, j: 0, pts: 0, pf: 0, pc: 0, ...t.stats },
  }));

  // Orden: activos primero; luego ganados, puntos y diferencia (DP). Las bajas al final.
  const dp = (r: Row) => r.stats.pf - r.stats.pc;
  rows.sort((a, b) => {
    if (a.status !== b.status) return a.status === "baja" ? 1 : -1;
    return b.stats.g - a.stats.g || b.stats.pts - a.stats.pts || dp(b) - dp(a);
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2 px-4">
        <Pill href={`/posiciones?rama=varonil&division=${division}`} active={rama === "varonil"}>Varonil</Pill>
        <Pill href={`/posiciones?rama=femenil&division=${division}`} active={rama === "femenil"}>Femenil</Pill>
        <span className="mx-2 text-gray-300">|</span>
        {[1, 2, 3].map((d) => (
          <Pill key={d} href={`/posiciones?rama=${rama}&division=${d}`} active={division === d}>
            División {ROMAN[d - 1]}
          </Pill>
        ))}
      </div>

      <div className="bg-liga-navy py-4 text-center text-white">
        <h2 className="text-xl font-bold uppercase">
          Torneo {SEASON.slice(0, 4)} {rama}
        </h2>
        <p className="text-xs font-bold">DIVISIÓN {ROMAN[division - 1]}</p>
      </div>

      <p className="py-3 text-center text-sm text-liga-navy">CLASIFICACIÓN</p>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-500">No hay equipos en esta división.</p>
      ) : (
        <StandingsTable rows={rows} />
      )}
    </>
  );
}

export default function PosicionesPage({
  searchParams,
}: {
  searchParams: Promise<{ rama?: string; division?: string }>;
}) {
  return (
    <main className="mx-auto max-w-3xl pb-12">
      <header className="px-4 py-8 text-center">
        <h1 className={`${hand.className} text-4xl sm:text-5xl`}>Liga de Básquetbol de Atlacomulco</h1>
        <p className={`${hand.className} mt-2 text-2xl uppercase`}>Torneo varonil y femenil</p>
        <p className={`${hand.className} text-2xl uppercase text-liga-brown`}>
          Temporada {SEASON.replace("-", " - ")}
        </p>
      </header>

      <Suspense fallback={<p className="py-8 text-center text-gray-500">Cargando posiciones...</p>}>
        <Standings searchParams={searchParams} />
      </Suspense>
    </main>
  );
}