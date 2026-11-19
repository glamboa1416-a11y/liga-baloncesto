"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMatchAction } from "@/app/admin/actions";

export default function MatchDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function remove() {
    if (!confirm("¿Eliminar este partido? Se restará de la clasificación y de las estadísticas de los jugadores.")) {
      return;
    }
    startTransition(async () => {
      const res = await deleteMatchAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Eliminando..." : "Eliminar"}
      </button>
      {error && <p className="basis-full text-sm text-red-600">{error}</p>}
    </>
  );
}
