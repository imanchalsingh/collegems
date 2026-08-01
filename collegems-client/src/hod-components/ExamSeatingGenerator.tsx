import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileDown,
  Loader2,
  RefreshCw,
  Send,
  Shuffle,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import HallLayoutGrid, { type HallLayoutSeat } from "./HallLayoutGrid";

interface ExamSchedule {
  _id: string;
  examName: string;
  course: string;
  examDate: string;
  startTime: string;
  endTime: string;
}

interface ExamHall {
  _id: string;
  name: string;
  building: string;
  floor?: number;
  capacity: number;
  rows: number;
  columns: number;
  isActive: boolean;
}

interface SeatAssignment {
  seatNumber: string;
  student: string;
  studentName: string;
  rollNumber: string;
  department: string;
  row?: number;
  col?: number;
}

interface HallSeatGroup {
  hall: string;
  hallName: string;
  seats: SeatAssignment[];
}

interface SeatingPlan {
  _id: string;
  strategy: string;
  status: "draft" | "published" | "archived";
  totalStudents: number;
  totalHalls: number;
  allocations: HallSeatGroup[];
  warnings: string[];
}

type Step = 1 | 2 | 3;

export default function ExamSeatingGenerator() {
  const [step, setStep] = useState<Step>(1);
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [halls, setHalls] = useState<ExamHall[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedHallIds, setSelectedHallIds] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<Record<string, { rows: number; columns: number }>>({});
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [layoutMeta, setLayoutMeta] = useState<
    Record<string, { rows: number; columns: number; gridPreview?: HallLayoutSeat[] }>
  >({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adjacencyViolations, setAdjacencyViolations] = useState(0);

  const selectedExam = useMemo(
    () => exams.find((e) => e._id === selectedExamId),
    [exams, selectedExamId]
  );

  const loadBase = async () => {
    try {
      setLoading(true);
      setError("");
      const [examRes, hallRes] = await Promise.all([
        api.get("/examschedule/all"),
        api.get("/exam-halls?active=true"),
      ]);
      setExams(extractArray(examRes.data));
      const hallList = extractArray<ExamHall>(hallRes.data);
      setHalls(hallList);
      const initialLayouts: Record<string, { rows: number; columns: number }> = {};
      for (const h of hallList) {
        initialLayouts[h._id] = { rows: h.rows, columns: h.columns };
      }
      setLayouts(initialLayouts);
    } catch (err) {
      console.error(err);
      setError("Failed to load exams or halls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  const toggleHall = (id: string) => {
    setSelectedHallIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedCapacity = useMemo(() => {
    return selectedHallIds.reduce((sum, id) => {
      const layout = layouts[id];
      if (layout) return sum + layout.rows * layout.columns;
      const hall = halls.find((h) => h._id === id);
      return sum + (hall?.capacity || 0);
    }, 0);
  }, [selectedHallIds, layouts, halls]);

  const handleGenerate = async () => {
    if (!selectedExamId || selectedHallIds.length === 0) {
      setError("Select an exam and at least one hall.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      setSuccess("");
      const payloadLayouts: Record<string, { rows: number; columns: number }> = {};
      for (const id of selectedHallIds) {
        if (layouts[id]) payloadLayouts[id] = layouts[id];
      }
      const res = await api.post("/seating-plans/generate", {
        examScheduleId: selectedExamId,
        hallIds: selectedHallIds,
        layouts: payloadLayouts,
      });
      setPlan(res.data.seatingPlan);
      setLayoutMeta(res.data.layoutMeta || {});
      setAdjacencyViolations(res.data.adjacencyViolations || 0);
      setSuccess(res.data.message || "Seating plan generated.");
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to generate seating plan.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!plan?._id) return;
    try {
      setBusy(true);
      setError("");
      const res = await api.put(`/seating-plans/${plan._id}/publish`);
      setPlan(res.data.seatingPlan);
      setSuccess(res.data.message || "Published.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to publish.");
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async (kind: "door-notice" | "invigilator") => {
    if (!plan?._id) return;
    try {
      setBusy(true);
      const res = await api.get(`/seating-plans/${plan._id}/export/${kind}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}-${plan._id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to download ${kind} PDF.`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading seating generator…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Anti-Cheat Exam Seating Generator
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Interleaves courses across the hall grid so students of the same subject are not seated
          side-by-side.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-medium">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`rounded-full px-3 py-1 ${
              step === n
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Step {n}
            {n === 1 ? " · Exam" : n === 2 ? " · Layout" : " · Plan"}
          </span>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Exam schedule
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="">Select exam…</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.examName} — {exam.course} ({exam.examDate})
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Halls to use
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {halls.map((hall) => (
                <label
                  key={hall._id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                    selectedHallIds.includes(hall._id)
                      ? "border-slate-900 bg-slate-50 dark:border-slate-200 dark:bg-slate-800"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedHallIds.includes(hall._id)}
                    onChange={() => toggleHall(hall._id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{hall.name}</span>
                    <span className="block text-xs text-slate-500">
                      {hall.building} · Floor {hall.floor ?? 0} · Default {hall.rows}×{hall.columns}{" "}
                      ({hall.capacity})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!selectedExamId || selectedHallIds.length === 0}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              Configure layouts <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Adjust rows × columns per hall. Selected capacity:{" "}
            <strong>{selectedCapacity}</strong>
            {selectedExam ? ` · Exam: ${selectedExam.examName}` : null}
          </p>

          {selectedHallIds.map((id) => {
            const hall = halls.find((h) => h._id === id);
            if (!hall) return null;
            const layout = layouts[id] || { rows: hall.rows, columns: hall.columns };
            return (
              <HallLayoutGrid
                key={id}
                title={`${hall.name} (${hall.building})`}
                rows={layout.rows}
                columns={layout.columns}
                editable
                onRowsChange={(rows) =>
                  setLayouts((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], rows, columns: prev[id]?.columns ?? hall.columns },
                  }))
                }
                onColumnsChange={(columns) =>
                  setLayouts((prev) => ({
                    ...prev,
                    [id]: { ...prev[id], columns, rows: prev[id]?.rows ?? hall.rows },
                  }))
                }
              />
            );
          })}

          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
              Generate anti-cheat plan
            </button>
          </div>
        </div>
      )}

      {step === 3 && plan && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">Students seated</p>
              <p className="text-lg font-semibold">{plan.totalStudents}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">Halls used</p>
              <p className="text-lg font-semibold">{plan.totalHalls}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">Side-by-side violations</p>
              <p className="text-lg font-semibold">{adjacencyViolations}</p>
            </div>
          </div>

          {plan.warnings?.length > 0 && (
            <ul className="list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {plan.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {plan.allocations.map((group) => {
            const meta = layoutMeta[group.hall];
            const seats: HallLayoutSeat[] =
              meta?.gridPreview ||
              group.seats
                .filter((s) => s.row != null && s.col != null)
                .map((s) => ({
                  seatNumber: s.seatNumber,
                  row: s.row!,
                  col: s.col!,
                  department: s.department,
                  studentName: s.studentName,
                  rollNumber: s.rollNumber,
                }));
            return (
              <HallLayoutGrid
                key={group.hall}
                title={`${group.hallName} · ${group.seats.length} assigned`}
                rows={meta?.rows || Math.max(...group.seats.map((s) => (s.row ?? 0) + 1), 1)}
                columns={
                  meta?.columns || Math.max(...group.seats.map((s) => (s.col ?? 0) + 1), 1)
                }
                seats={seats}
              />
            );
          })}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
            >
              <RefreshCw className="h-4 w-4" /> Adjust & regenerate
            </button>
            <button
              type="button"
              disabled={busy || plan.status === "published"}
              onClick={handlePublish}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {plan.status === "published" ? "Published" : "Publish to students"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => downloadPdf("door-notice")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
            >
              <FileDown className="h-4 w-4" /> Door notice PDF
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => downloadPdf("invigilator")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
            >
              <FileDown className="h-4 w-4" /> Invigilator master PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
