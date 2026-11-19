import { NextResponse, connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { isAdmin } from "@/lib/auth";
import Team from "@/models/Team";

export async function GET() {
  await connection();
  await connectDB();
  return NextResponse.json(await Team.find().sort({ name: 1 }));
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    rama?: unknown;
    division?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const rama = body?.rama;
  const division = body?.division;
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  if (rama !== "varonil" && rama !== "femenil") {
    return NextResponse.json({ error: "Rama inválida" }, { status: 400 });
  }
  if (division !== 1 && division !== 2 && division !== 3) {
    return NextResponse.json({ error: "División inválida" }, { status: 400 });
  }

  await connectDB();
  try {
    const team = await Team.create({ name, rama, division });
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    const duplicate = (error as { code?: number }).code === 11000;
    return NextResponse.json(
      { error: duplicate ? "Ese equipo ya existe" : "No se pudo guardar" },
      { status: duplicate ? 409 : 500 }
    );
  }
}
