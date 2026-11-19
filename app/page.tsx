import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold">Liga de Básquetbol de Atlacomulco</h1>
      <p className="mt-4 text-gray-600">
        Equipos, jugadores, partidos y estadísticas.
      </p>
      <Link
        href="/posiciones"
        className="mt-8 inline-block rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
      >
        Ver posiciones
      </Link>
    </main>
  );
}