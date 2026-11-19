export type Row = {
  _id: string;
  name: string;
  logoUrl?: string;
  status: "activo" | "baja";
  stats: { g: number; p: number; j: number; pts: number; pf: number; pc: number };
};

const COLS = ["G", "P", "J", "Pts", "PJ", "PC", "DP"];

function Logo({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />;
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-liga-navy text-xs font-bold text-white">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function StandingsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto px-2">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr className="text-liga-navy">
            <th className="w-12 py-2 text-center font-bold">Pos</th>
            <th className="py-2 text-left font-semibold">EQUIPO</th>
            {COLS.map((c) => (
              <th key={c} className="w-14 py-2 text-center font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const s = t.stats;
            return (
              <tr key={t._id}>
                <td className="bg-liga-navy py-2 text-center text-white">{i + 1}</td>
                <td className="bg-gray-100 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Logo name={t.name} logoUrl={t.logoUrl} />
                    <span className="font-medium uppercase text-gray-800">{t.name}</span>
                  </div>
                </td>
                {t.status === "baja" ? (
                  <td colSpan={COLS.length} className="bg-white text-center font-bold tracking-widest text-gray-800">
                    BAJA
                  </td>
                ) : (
                  [s.g, s.p, s.j, s.pts, s.pf, s.pc, s.pf - s.pc].map((v, k) => (
                    <td key={k} className="bg-liga-ice py-2 text-center tabular-nums text-gray-800">
                      {v}
                    </td>
                  ))
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}