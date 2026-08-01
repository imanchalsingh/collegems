import { useMemo, useState } from "react";
import {
  CalendarClock,
  Download,
  FileDown,
  GripVertical,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { jsPDF } from "jspdf";
import api from "../api/axios";
import { useToast } from "../hooks/useToast";

type Assignment = {
  sessionId: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  roomId: string;
  roomName: string;
  slotId: string;
  day: string;
  startTime: string;
  endTime: string;
  sectionId?: string | null;
};

type GenerateResult = {
  fitness: number;
  feasible: boolean;
  conflicts: { hard: number; soft: number };
  generationTimeMs: number;
  assignments: Assignment[];
  grid?: Record<string, Record<string, Assignment[]>>;
  engine?: string;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TimetableGeneratorGrid() {
  const { toast } = useToast();
  const [name, setName] = useState("GA Department Timetable");
  const [department, setDepartment] = useState("Computer Science");
  const [demo, setDemo] = useState(true);
  const [generations, setGenerations] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dragSessionId, setDragSessionId] = useState<string | null>(null);

  const timeSlots = useMemo(() => {
    const set = new Set<string>();
    for (const a of assignments) {
      if (a.startTime) set.add(a.startTime);
    }
    return Array.from(set).sort();
  }, [assignments]);

  const cellMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const key = `${a.day}|${a.startTime}`;
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [assignments]);

  const runGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post("/timetable-generator/generate", {
        name,
        department,
        demo,
        generations,
        population_size: 40,
        save: true,
        seed: 42,
      });
      const payload = res.data.result as GenerateResult;
      setResult(payload);
      setAssignments(payload.assignments || []);
      toast.success(
        payload.feasible
          ? "Conflict-free timetable generated"
          : "Timetable generated — review remaining conflicts",
      );
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Generation failed. Is collegems-ml-service running on :8000?",
      );
    } finally {
      setLoading(false);
    }
  };

  const onDropCell = (day: string, startTime: string) => {
    if (!dragSessionId) return;
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.sessionId !== dragSessionId) return a;
        const sample = prev.find(
          (x) => x.day === day && x.startTime === startTime && x.sessionId !== dragSessionId,
        );
        return {
          ...a,
          day,
          startTime,
          endTime: sample?.endTime || a.endTime,
          slotId: sample?.slotId || `${day}-${startTime}`,
        };
      }),
    );
    setDragSessionId(null);
  };

  const exportIcs = async () => {
    try {
      const res = await api.post(
        "/timetable-generator/export/ics",
        { assignments },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "timetable.ics";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("iCal exported");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "iCal export failed");
    }
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(name || "Generated Timetable", 14, 16);
    doc.setFontSize(10);
    doc.text(
      `Fitness ${result?.fitness ?? "—"} · Hard conflicts ${result?.conflicts?.hard ?? "—"} · ${department}`,
      14,
      24,
    );

    let y = 34;
    for (const day of DAYS) {
      const dayItems = assignments.filter((a) => a.day === day);
      if (!dayItems.length) continue;
      doc.setFontSize(11);
      doc.text(day, 14, y);
      y += 6;
      doc.setFontSize(9);
      for (const a of dayItems) {
        doc.text(
          `${a.startTime}-${a.endTime}  ${a.courseName}  ·  ${a.teacherName}  ·  ${a.roomName}`,
          18,
          y,
        );
        y += 5;
        if (y > 190) {
          doc.addPage();
          y = 20;
        }
      }
      y += 4;
    }
    doc.save("timetable.pdf");
    toast.success("PDF exported");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-violet-50 p-2 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Genetic timetable generator
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conflict-free weekly schedule via mutation, crossover, and fitness evaluation in the ML service.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            Department
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            Generations
            <input
              type="number"
              min={10}
              max={200}
              value={generations}
              onChange={(e) => setGenerations(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => void runGenerate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Solving…" : "Generate with GA"}
            </button>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          Demo dataset (no DB rooms/courses required)
        </label>
      </section>

      {result && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <span className="font-medium text-gray-900 dark:text-white">
            Fitness {result.fitness}
          </span>
          <span className="text-gray-500">
            Hard {result.conflicts.hard} · Soft {result.conflicts.soft} · {result.generationTimeMs}ms
          </span>
          {!result.feasible && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Residual hard conflicts
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => void exportIcs()}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              <Download className="h-4 w-4" /> iCal
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              <FileDown className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>
      )}

      {assignments.length > 0 && (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-3 text-xs text-gray-500">
            Drag a class card onto another day/time cell to adjust the schedule.
          </p>
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-gray-200 p-2 text-left dark:border-gray-700">Time</th>
                {DAYS.map((d) => (
                  <th key={d} className="border border-gray-200 p-2 dark:border-gray-700">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time}>
                  <td className="border border-gray-200 p-2 font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">
                    {time}
                  </td>
                  {DAYS.map((day) => {
                    const cells = cellMap.get(`${day}|${time}`) || [];
                    return (
                      <td
                        key={`${day}-${time}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropCell(day, time)}
                        className="min-w-[140px] border border-gray-200 p-1 align-top dark:border-gray-700"
                      >
                        <div className="min-h-[64px] space-y-1">
                          {cells.map((a) => (
                            <div
                              key={a.sessionId}
                              draggable
                              onDragStart={() => setDragSessionId(a.sessionId)}
                              className="cursor-grab rounded-md border border-violet-200 bg-violet-50 p-1.5 text-violet-900 active:cursor-grabbing dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100"
                            >
                              <div className="flex items-start gap-1">
                                <GripVertical className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                                <div>
                                  <div className="font-semibold">{a.courseName}</div>
                                  <div className="opacity-80">{a.teacherName}</div>
                                  <div className="opacity-70">{a.roomName}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
