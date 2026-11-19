import { Suspense } from "react";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import Team from "@/models/Team";
import Player from "@/models/Player";
import Pill from "@/components/Pill";
import RosterManager, { type RosterRow } from "@/components/RosterManager";

const ROMAN = ["I", "II", "III"];

type SP = Promise<{ rama?: string; division?: string; equipo?: string }>;
type TeamDoc = { _id: unknown; name: string };
type PlayerDoc = { _id: unknown; name: string; number?: number; stats?: { gp?: number; pts?: number; t3?: number } };

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
  const teams = (await Team.find({ season: SEASON, rama, division }).sort({ name: 1 }).lean()) as unknown as TeamDoc[];
  const team = teams.find((t) => String(t._id) === params.equipo) ?? teams[0];

  const docs = team
    ? ((await Player.find({ teamId: team._id }).sort({ number: 1, name: 1 }).lean()) as unknown as PlayerDoc[])
    : [];
  const rows: RosterRow[] = docs.map((p) => ({
    id: String(p._id),
    name: p.name,
    number: p.number,
    gp: p.stats?.gp ?? 0,
    pts: p.stats?.pts ?? 0,
    t3: p.stats?.t3 ?? 0,
  }));

  const q = (r: string, d: number, t?: string) =>
    `/admin/jugadores?rama=${r}&division=${d}${t ? `&equipo=${t}` : ""}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill href={q("varonil", division)} active={rama === "varonil"}>Varonil</Pill>
        <Pill href={q("femenil", division)} active={rama === "femenil"}>Femenil</Pill>
        <span className="mx-2 text-gray-300">|</span>
        {[1, 2, 3].map((d) => (
          <Pill key={d} href={q(rama, d)} active={division === d}>
            División {ROMAN[d - 1]}
          </Pill>
        ))}
      </div>

      {teams.length === 0 ? (
        <p className="text-gray-500">No hay equipos en esta división.</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {teams.map((t) => (
              <Pill key={String(t._id)} href={q(rama, division, String(t._id))} active={String(t._id) === String(team._id)}>
                {t.name}
              </Pill>
            ))}
          </div>
          <h2 className="mb-3 text-lg font-bold text-liga-navy">{team.name}</h2>
          <RosterManager key={String(team._id)} teamId={String(team._id)} players={rows} />
        </>
      )}
    </>
  );
}

export default function AdminJugadoresPage({ searchParams }: { searchParams: SP }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Plantillas</h1>
      <p className="mb-6 text-sm text-gray-600">
        Las estadísticas se actualizan al capturar partidos.{" "}
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
