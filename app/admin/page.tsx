import { Suspense } from "react";
import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { logout } from "./actions";
import AdminLogin from "@/components/AdminLogin";

const cards = [
  { href: "/admin/jornadas", title: "Resultados por jornada", text: "Captura marcadores y estadísticas de jugadores." },
  { href: "/admin/jugadores", title: "Plantillas", text: "Agrega o corrige jugadores de cada equipo." },
  { href: "/equipos", title: "Equipos", text: "Registra un equipo nuevo." },
];

async function Panel() {
  if (!(await isAdmin())) {
    return (
      <>
        {!adminConfigured() && (
          <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Falta configurar <code>ADMIN_PASSWORD</code> (mínimo 8 caracteres) en <code>.env.local</code> y reiniciar el servidor.
          </p>
        )}
        <AdminLogin />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="font-semibold text-liga-navy">{c.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.text}</p>
          </Link>
        ))}
      </div>
      <form action={logout} className="mt-8">
        <button type="submit" className="text-sm text-gray-600 underline hover:text-orange-600">
          Cerrar sesión
        </button>
      </form>
    </>
  );
}

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Administración</h1>
      <Suspense fallback={<p className="text-gray-500">Cargando...</p>}>
        <Panel />
      </Suspense>
    </main>
  );
}
