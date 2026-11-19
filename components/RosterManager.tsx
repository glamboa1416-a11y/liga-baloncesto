"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPlayerAction, deletePlayerAction, updatePlayerAction } from "@/app/admin/actions";

export type RosterRow = { id: string; name: string; number?: number; gp: number; pts: number; t3: number };

const field = "rounded border border-gray-300 px-3 py-1.5 text-gray-900";

function parseNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function PlayerRow({ player }: { player: RosterRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(player.name);
  const [number, setNumber] = useState(player.number === undefined ? "" : String(player.number));
  const [error, setError] = useState("");

  const dirty = name !== player.name || number !== (player.number === undefined ? "" : String(player.number));

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-1 border-t border-gray-100 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          type="number"
          min={0}
          max={99}
          placeholder="#"
          aria-label={`Número de ${player.name}`}
          className={`${field} w-16 text-center`}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del jugador"
          className={`${field} min-w-0 flex-1`}
        />
        <span className="text-xs text-gray-500 tabular-nums">
          JJ {player.gp} · PTS {player.pts} · 3PT {player.t3}
        </span>
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() => run(() => updatePlayerAction(player.id, { name, number: parseNumber(number) }))}
          className="rounded bg-liga-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Guardar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`¿Eliminar a ${player.name}? Sus estadísticas acumuladas se perderán.`)) {
              run(() => deletePlayerAction(player.id));
            }
          }}
          className="rounded border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </li>
  );
}

export default function RosterManager({ teamId, players }: { teamId: string; players: RosterRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await addPlayerAction(teamId, { name, number: parseNumber(number) });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setNumber("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          type="number"
          min={0}
          max={99}
          placeholder="#"
          aria-label="Número"
          className={`${field} w-16 text-center`}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nombre del jugador"
          className={`${field} min-w-0 flex-1`}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-orange-600 px-5 py-1.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {pending ? "Agregando..." : "Agregar jugador"}
        </button>
        {error && <p className="basis-full text-sm text-red-600">{error}</p>}
      </form>

      {players.length === 0 ? (
        <p className="text-gray-500">Este equipo aún no tiene jugadores.</p>
      ) : (
        <ul className="rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
          {players.map((p) => (
            <PlayerRow key={`${p.id}-${p.name}-${p.number}`} player={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
