import { Suspense } from "react";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import TeamForm from "@/components/TeamForm";

async function Content() {
  if (!(await isAdmin())) {
    return (
      <p className="text-gray-600">
        Para registrar equipos inicia sesión en{" "}
        <Link href="/admin" className="font-semibold text-orange-600 underline">
          /admin
        </Link>
        .
      </p>
    );
  }
  return <TeamForm />;
}

export default function EquiposPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Equipos</h1>
      <Suspense fallback={<p className="text-gray-500">Cargando...</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
