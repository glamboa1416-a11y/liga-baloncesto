"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import {
  ADMIN_COOKIE,
  SESSION_SECONDS,
  adminConfigured,
  checkPassword,
  createSessionToken,
  isAdmin,
  type LoginState,
} from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { SEASON } from "@/lib/config";
import { removeMatch, saveMatch, type MatchInput, type Result } from "@/lib/matches";
import Team from "@/models/Team";
import Player from "@/models/Player";

const NO_AUTH: Result = { ok: false, error: "Tu sesión expiró. Vuelve a entrar en /admin." };

function refreshPublicPages() {
  for (const path of ["/posiciones", "/lideres", "/jornadas", "/admin/jornadas", "/admin/jugadores"]) {
    revalidatePath(path);
  }
}

// ---------- Sesión ----------

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) {
    return { error: "Falta configurar ADMIN_PASSWORD (mínimo 8 caracteres) en .env.local" };
  }
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { error: "Contraseña incorrecta" };
  }
  (await cookies()).set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

// ---------- Partidos ----------

export async function saveMatchAction(input: MatchInput, id?: string): Promise<Result> {
  if (!(await isAdmin())) return NO_AUTH;
  const result = await saveMatch(input, id);
  if (result.ok) refreshPublicPages();
  return result;
}

export async function deleteMatchAction(id: string): Promise<Result> {
  if (!(await isAdmin())) return NO_AUTH;
  const result = await removeMatch(id);
  if (result.ok) refreshPublicPages();
  return result;
}

// ---------- Jugadores ----------

type PlayerInput = { name: string; number?: number | null };

function cleanPlayer(input: PlayerInput): { name: string; number?: number } | string {
  const name = String(input.name ?? "").trim();
  if (!name || name.length > 80) return "Escribe el nombre del jugador (máximo 80 caracteres)";
  const raw = input.number;
  if (raw === null || raw === undefined) return { name };
  if (!Number.isInteger(raw) || raw < 0 || raw > 99) return "El número debe estar entre 0 y 99";
  return { name, number: raw };
}

export async function addPlayerAction(teamId: string, input: PlayerInput): Promise<Result> {
  if (!(await isAdmin())) return NO_AUTH;
  if (!isValidObjectId(teamId)) return { ok: false, error: "Equipo inválido" };
  const clean = cleanPlayer(input);
  if (typeof clean === "string") return { ok: false, error: clean };

  await connectDB();
  const team = (await Team.findOne({ _id: teamId, season: SEASON }).lean()) as unknown as {
    _id: unknown;
    name: string;
    rama: string;
    division: number;
  } | null;
  if (!team) return { ok: false, error: "El equipo no existe" };

  const mates = (await Player.find({ teamId }).select("name").lean()) as unknown as { name: string }[];
  if (mates.some((p) => p.name.trim().toLowerCase() === clean.name.toLowerCase())) {
    return { ok: false, error: "Ya hay un jugador con ese nombre en el equipo" };
  }

  await Player.create({
    ...clean,
    teamId: team._id,
    teamName: team.name,
    season: SEASON,
    rama: team.rama,
    division: team.division,
    demo: false,
  });
  refreshPublicPages();
  return { ok: true };
}

export async function updatePlayerAction(id: string, input: PlayerInput): Promise<Result> {
  if (!(await isAdmin())) return NO_AUTH;
  if (!isValidObjectId(id)) return { ok: false, error: "Jugador inválido" };
  const clean = cleanPlayer(input);
  if (typeof clean === "string") return { ok: false, error: clean };

  await connectDB();
  const player = (await Player.findById(id).lean()) as unknown as { teamId: unknown } | null;
  if (!player) return { ok: false, error: "El jugador ya no existe" };

  const mates = (await Player.find({ teamId: player.teamId, _id: { $ne: id } })
    .select("name")
    .lean()) as unknown as { name: string }[];
  if (mates.some((p) => p.name.trim().toLowerCase() === clean.name.toLowerCase())) {
    return { ok: false, error: "Ya hay un jugador con ese nombre en el equipo" };
  }

  await Player.updateOne(
    { _id: id },
    clean.number === undefined
      ? { $set: { name: clean.name }, $unset: { number: "" } }
      : { $set: { name: clean.name, number: clean.number } }
  );
  refreshPublicPages();
  return { ok: true };
}

export async function deletePlayerAction(id: string): Promise<Result> {
  if (!(await isAdmin())) return NO_AUTH;
  if (!isValidObjectId(id)) return { ok: false, error: "Jugador inválido" };
  await connectDB();
  await Player.deleteOne({ _id: id });
  refreshPublicPages();
  return { ok: true };
}
