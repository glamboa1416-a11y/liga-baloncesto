import { NextResponse, connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import { isAdmin } from "@/lib/auth";
import Team from "@/models/Team";

// [nombre, G, P, J, Pts, PJ, PC]
type Fila = [string, number, number, number, number, number, number];

const VARONIL_3: Fila[] = [
  ["CD Hidalgo", 13, 3, 16, 29, 710, 472],
  ["Esturion", 12, 3, 15, 27, 696, 451],
  ["Cuervos", 12, 3, 15, 27, 661, 562],
  ["Thunder", 11, 3, 14, 25, 669, 486],
  ["Coyotes", 10, 6, 16, 26, 648, 563],
  ["Hornets", 9, 6, 15, 24, 580, 518],
  ["Chavorrucos", 9, 5, 14, 22, 577, 469],
  ["Acutzilapan", 5, 8, 13, 18, 512, 607],
  ["Vagabun2", 4, 10, 14, 18, 462, 547],
  ["Sonic's", 4, 9, 13, 17, 462, 619],
  ["Mav's", 3, 12, 15, 18, 453, 617],
  ["Novatos Jr", 3, 12, 15, 18, 454, 733],
  ["Inter Jr", 0, 15, 15, 15, 425, 665],
];

export async function GET() {
  await connection();
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }
  await connectDB();
  await Team.deleteMany({ season: SEASON, rama: "varonil", division: 3 });
  await Team.insertMany(
    VARONIL_3.map(([name, g, p, j, pts, pf, pc]) => ({
      name,
      season: SEASON,
      rama: "varonil",
      division: 3,
      stats: { g, p, j, pts, pf, pc },
    }))
  );
  return NextResponse.json({ ok: true, insertados: VARONIL_3.length });
}