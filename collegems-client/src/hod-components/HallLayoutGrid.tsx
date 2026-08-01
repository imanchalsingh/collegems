import { useMemo } from "react";

export interface HallLayoutSeat {
  seatNumber: string;
  row: number;
  col: number;
  department?: string;
  studentName?: string;
  rollNumber?: string;
  isMine?: boolean;
}

interface HallLayoutGridProps {
  rows: number;
  columns: number;
  seats?: HallLayoutSeat[];
  editable?: boolean;
  onRowsChange?: (rows: number) => void;
  onColumnsChange?: (columns: number) => void;
  highlightMine?: boolean;
  title?: string;
}

const deptTone = (dept?: string) => {
  if (!dept) return "bg-slate-100 text-slate-600 border-slate-200";
  let hash = 0;
  for (let i = 0; i < dept.length; i++) hash = (hash * 31 + dept.charCodeAt(i)) >>> 0;
  const tones = [
    "bg-sky-50 text-sky-800 border-sky-200",
    "bg-amber-50 text-amber-800 border-amber-200",
    "bg-emerald-50 text-emerald-800 border-emerald-200",
    "bg-rose-50 text-rose-800 border-rose-200",
    "bg-indigo-50 text-indigo-800 border-indigo-200",
    "bg-teal-50 text-teal-800 border-teal-200",
  ];
  return tones[hash % tones.length];
};

const seatLabel = (row: number, col: number) => {
  let rowLabel = "";
  let idx = row;
  do {
    rowLabel = String.fromCharCode(65 + (idx % 26)) + rowLabel;
    idx = Math.floor(idx / 26) - 1;
  } while (idx >= 0);
  return `${rowLabel}${col + 1}`;
};

export default function HallLayoutGrid({
  rows,
  columns,
  seats = [],
  editable = false,
  onRowsChange,
  onColumnsChange,
  highlightMine = false,
  title,
}: HallLayoutGridProps) {
  const seatMap = useMemo(() => {
    const map = new Map<string, HallLayoutSeat>();
    for (const seat of seats) {
      map.set(`${seat.row}-${seat.col}`, seat);
    }
    return map;
  }, [seats]);

  const safeRows = Math.max(1, Math.min(20, rows || 1));
  const safeCols = Math.max(1, Math.min(20, columns || 1));

  return (
    <div className="space-y-3">
      {(title || editable) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          {title ? (
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h4>
          ) : (
            <span />
          )}
          {editable && (
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                Rows
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={safeRows}
                  onChange={(e) => onRowsChange?.(Number(e.target.value) || 1)}
                  className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
                />
              </label>
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                Columns
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={safeCols}
                  onChange={(e) => onColumnsChange?.(Number(e.target.value) || 1)}
                  className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
                />
              </label>
              <span className="self-center text-xs text-slate-500">
                Capacity {safeRows * safeCols}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
        <div
          className="mx-auto grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${safeCols}, minmax(3.25rem, 1fr))`,
            maxWidth: `${Math.min(safeCols * 4.5, 48)}rem`,
          }}
        >
          {Array.from({ length: safeRows }).map((_, r) =>
            Array.from({ length: safeCols }).map((__, c) => {
              const seat = seatMap.get(`${r}-${c}`);
              const mine = highlightMine && seat?.isMine;
              return (
                <div
                  key={`${r}-${c}`}
                  title={
                    seat
                      ? `${seat.seatNumber} · ${seat.studentName || ""} · ${seat.department || ""}`
                      : seatLabel(r, c)
                  }
                  className={[
                    "flex min-h-12 flex-col items-center justify-center rounded-md border px-1 py-1 text-center text-[10px] leading-tight",
                    mine
                      ? "border-blue-500 bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                      : seat
                        ? deptTone(seat.department)
                        : "border-dashed border-slate-300 bg-white/70 text-slate-400 dark:border-slate-600 dark:bg-slate-800/40",
                  ].join(" ")}
                >
                  <span className="font-semibold">{seat?.seatNumber || seatLabel(r, c)}</span>
                  {seat?.department && !mine && (
                    <span className="mt-0.5 line-clamp-1 max-w-full opacity-80">
                      {seat.department}
                    </span>
                  )}
                  {mine && <span className="mt-0.5 font-medium">You</span>}
                </div>
              );
            })
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Front of hall ↑ — colors group courses (same course never side-by-side when diversity allows)
        </p>
      </div>
    </div>
  );
}
