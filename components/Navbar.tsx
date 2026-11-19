"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/posiciones", label: "Posiciones" },
  { href: "/lideres", label: "Líderes" },
  { href: "/jornadas", label: "Jornadas" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-28 max-w-5xl items-center gap-4 overflow-x-auto px-4">
        <Link href="/" className="mr-4 shrink-0 text-lg font-bold text-orange-600">
          Liga de Básquetbol de Atlacomulco
        </Link>
        {links.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-20 w-28 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white px-2 text-center text-sm font-semibold transition duration-200 hover:scale-105 hover:text-orange-600 ${
                active
                  ? "scale-105 text-orange-600 shadow-lg"
                  : "text-gray-900 shadow-sm"
              }`}
            >
              {label}
            </Link>
          );
        })}
        <Link
          href="/admin"
          className={`ml-auto shrink-0 text-xs hover:text-orange-600 ${
            pathname.startsWith("/admin") ? "font-semibold text-orange-600" : "text-gray-500"
          }`}
        >
          Admin
        </Link>
      </nav>
    </header>
  );
}
