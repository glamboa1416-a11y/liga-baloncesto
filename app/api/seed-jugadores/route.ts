import { NextResponse, connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import { isAdmin } from "@/lib/auth";
import Team from "@/models/Team";
import Player from "@/models/Player";

type TeamDoc = {
  _id: unknown;
  name: string;
  rama: "varonil" | "femenil";
  division: 1 | 2 | 3;
  stats?: { j?: number };
};

// Pseudoaleatorio con semilla: los datos de demo siempre salen iguales
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function GET() {
  await connection();
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }
  await connectDB();

  const teams = (await Team.find({ season: SEASON, status: "activo" }).lean()) as unknown as TeamDoc[];
  const rand = rng(2026);

  await Player.deleteMany({ demo: true });

  const players = teams.flatMap((team) =>
    Array.from({ length: 12 }, (_, i) => {
      const gp = Math.max(1, (team.stats?.j ?? 12) - Math.floor(rand() * 4));
      // los primeros de la plantilla (titulares) anotan más
      const ppg = (rand() * 14 + 2) * (1 - i * 0.06);
      const t3pg = rand() * 2.2 * (1 - i * 0.05);
      const pts = Math.round(ppg * gp);
      const t3 = Math.min(Math.round(t3pg * gp), Math.floor(pts / 3));
      return {
        name: `Jugador ${i + 1} · ${team.name}`,
        number: i + 4,
        teamId: team._id,
        teamName: team.name,
        season: SEASON,
        rama: team.rama,
        division: team.division,
        demo: true,
        stats: { gp, pts, t3 },
      };
    })
  );

  await Player.insertMany(players);
  return NextResponse.json({ ok: true, insertados: players.length });
}