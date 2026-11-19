"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function TeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rama, setRama] = useState("varonil");
  const [division, setDivision] = useState("1");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rama, division: Number(division) }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("No se pudo guardar (¿ya existe ese equipo en esa rama y división?)");
      return;
    }

    setSuccess(`Equipo "${name}" agregado correctamente`);
    setName("");
    
    router.refresh();
  }

  const field = "rounded border border-gray-300 px-3 py-2 text-gray-900";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap"
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del equipo" required className={`${field} flex-1`} />
      <select value={rama} onChange={(e) => setRama(e.target.value)} className={field}>
        <option value="varonil">Varonil</option>
        <option value="femenil">Femenil</option>
      </select>
      <select value={division} onChange={(e) => setDivision(e.target.value)} className={field}>
        <option value="1">División I</option>
        <option value="2">División II</option>
        <option value="3">División III</option>
      </select>
      <button type="submit" disabled={loading} className="rounded bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
        {loading ? "Guardando..." : "Agregar"}
      </button>
      {error && <p className="text-sm text-red-600 sm:basis-full">{error}</p>}
      {success && <p className="text-sm text-green-600 sm:basis-full">{success}</p>}
    </form>
  );
}