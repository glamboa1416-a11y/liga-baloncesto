"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="mx-auto flex max-w-sm flex-col gap-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <label className="text-sm font-semibold text-gray-700" htmlFor="password">
        Contraseña de administrador
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="rounded border border-gray-300 px-3 py-2 text-gray-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
