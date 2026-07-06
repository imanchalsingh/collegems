import React, { useEffect, useState } from "react";
import {
  ListOrdered,
  Shuffle,
  GitBranch,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileDown,
  Send,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  AlertTriangle,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface ExamSchedule {
  _id: string;
  examName: string;
  course: string;
  examDate: string;
  startTime: string;
  endTime: string;
  location: string;
}

interface ExamHall {
  _id: string;
  name: string;
  building: string;
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
}

interface HallSeatGroup {
  hall: string;
  hallName: string;
  seats: SeatAssignment[];
}

interface AllocationResult {
  _id: string;
  examSchedule: string;
  strategy: string;
  status: "draft" | "published" | "archived";
  totalStudents: number;
  totalHalls: number;
  allocations: HallSeatGroup[];
  warnings: string[];
  createdAt: string;
}

const DEPARTMENT_COLORS: Record<string, string> = {
  "Computer Science": "bg-blue-50 dark:bg-blue-950/20",
  "Electrical Engineering": "bg-amber-50 dark:bg-amber-950/20",
  "Mechanical Engineering": "bg-emerald-50 dark:bg-emerald-950/20",
  "Civil Engineering": "bg-purple-50 dark:bg-purple-950/20",
  Mathematics: "bg-rose-50 dark:bg-rose-950/20",
  Physics: "bg-cyan-50 dark:bg-cyan-950/20",
  Chemistry: "bg-orange-50 dark:bg-orange-950/20",
  Biology: "bg-teal-50 dark:bg-teal-950/20",
};

const FALLBACK_COLORS = [
  "bg-indigo-50 dark:bg-indigo-950/20",
  "bg-pink-50 dark:bg-pink-950/20",
  "bg-lime-50 dark:bg-lime-950/20",
  "bg-fuchsia-50 dark:bg-fuchsia-950/20",
  "bg-sky-50 dark:bg-sky-950/20",
  "bg-yellow-50 dark:bg-yellow-950/20",
];

const getDeptColor = (dept: string, deptMap: Map<string, string>): string => {
  if (DEPARTMENT_COLORS[dept]) return DEPARTMENT_COLORS[dept];
  if (deptMap.has(dept)) return deptMap.get(dept)!;
  const idx = deptMap.size % FALLBACK_COLORS.length;
  const color = FALLBACK_COLORS[idx];
  deptMap.set(dept, color);
  return color;
};

const STRATEGIES = [
  {
    key: "sequential",
    label: "Sequential",
    icon: ListOrdered,
    description: "Fill halls one by one in roll number order",
  },
  {
    key: "department-mixed",
    label: "Department-Mixed",
    icon: Shuffle,
    description: "Interleave departments to prevent cheating",
  },
  {
    key: "zigzag",
    label: "Zigzag",
    icon: GitBranch,
    description: "Alternate departments in adjacent rows",
  },
] as const;

const HallAllocation: React.FC = () => {
  const [step, setStep] = useState(1);

  // Step 1
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamSchedule | null>(null);
  const [loadingExams, setLoadingExams] = useState(true);

  // Step 2
  const [strategy, setStrategy] = useState("department-mixed");
  const [halls, setHalls] = useState<ExamHall[]>([]);
  const [selectedHallIds, setSelectedHallIds] = useState<string[]>([]);
  const [loadingHalls, setLoadingHalls] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Step 3
  const [allocation, setAllocation] = useState<AllocationResult | null>(null);
  const [expandedHalls, setExpandedHalls] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);

  // Global
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch exams on mount
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoadingExams(true);
      const res = await api.get("/examschedule/all");
      setExams(extractArray(res.data));
    } catch (err) {
      console.error("Error fetching exam schedules:", err);
      setErrorMsg("Failed to load exam schedules.");
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchHalls = async () => {
    try {
      setLoadingHalls(true);
      const res = await api.get("/exam-halls");
      setHalls((res.data || []).filter((h: ExamHall) => h.isActive));
    } catch (err) {
      console.error("Error fetching halls:", err);
      setErrorMsg("Failed to load examination halls.");
    } finally {
      setLoadingHalls(false);
    }
  };

  const handleNextToStep2 = () => {
    if (!selectedExam) {
      setErrorMsg("Please select an exam to proceed.");
      return;
    }
    setErrorMsg("");
    setStep(2);
    fetchHalls();
  };

  const toggleHallSelection = (hallId: string) => {
    setSelectedHallIds((prev) =>
      prev.includes(hallId) ? prev.filter((id) => id !== hallId) : [...prev, hallId]
    );
  };

  const selectedCapacity = halls
    .filter((h) => selectedHallIds.includes(h._id))
    .reduce((sum, h) => sum + h.capacity, 0);

  const handleGenerate = async () => {
    if (selectedHallIds.length === 0) {
      setErrorMsg("Please select at least one hall.");
      return;
    }

    try {
      setGenerating(true);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await api.post("/hall-allocations/generate", {
        examScheduleId: selectedExam!._id,
        strategy,
        hallIds: selectedHallIds,
      });

      setAllocation(res.data.allocation || res.data);
      setSuccessMsg("Allocation generated successfully!");
      setStep(3);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error generating allocation:", err);
      setErrorMsg(err.response?.data?.message || "Failed to generate allocation.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!allocation) return;

    try {
      setPublishing(true);
      setErrorMsg("");
      setSuccessMsg("");

      await api.put(`/hall-allocations/${allocation._id}/publish`);

      setAllocation({ ...allocation, status: "published" });
      setSuccessMsg("Allocation published successfully! Students can now view their seats.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      console.error("Error publishing allocation:", err);
      setErrorMsg(err.response?.data?.message || "Failed to publish allocation.");
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = async (format: "pdf" | "csv") => {
    if (!allocation) return;
    try {
      const res = await api.get(`/hall-allocations/${allocation._id}/export/${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `hall-allocation.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export ${format} error:`, err);
      setErrorMsg(`Failed to export as ${format.toUpperCase()}.`);
    }
  };

  const toggleExpandHall = (hallId: string) => {
    setExpandedHalls((prev) => {
      const next = new Set(prev);
      if (next.has(hallId)) next.delete(hallId);
      else next.add(hallId);
      return next;
    });
  };

  const handleRegenerate = () => {
    setAllocation(null);
    setExpandedHalls(new Set());
    setStep(2);
  };

  // Department color map for seat coloring
  const deptColorMap = new Map<string, string>();

  const stepLabels = ["Select Exam", "Configure", "Review"];

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-center">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <React.Fragment key={stepNum}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                  </div>
                  <span
                    className={`text-xs font-medium mt-2 ${
                      isCurrent
                        ? "text-blue-600 dark:text-blue-400"
                        : isCompleted
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`w-20 sm:w-32 h-0.5 mx-2 mb-5 ${
                      step > stepNum
                        ? "bg-emerald-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* ============== STEP 1: Select Exam ============== */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Select Examination
            </h2>
          </div>

          {loadingExams ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-gray-500 mt-3">Loading exam schedules...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                No exams scheduled
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Create exam schedules first before allocating halls.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <button
                  key={exam._id}
                  onClick={() => setSelectedExam(exam)}
                  className={`text-left bg-white dark:bg-gray-800 border rounded-xl p-5 hover:shadow-md transition-all ${
                    selectedExam?._id === exam._id
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 dark:border-blue-500"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {exam.examName}
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                    {exam.course}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(exam.examDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {exam.startTime} – {exam.endTime}
                    </span>
                  </div>
                  {exam.location && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {exam.location}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Next Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextToStep2}
              disabled={!selectedExam}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============== STEP 2: Configure ============== */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Selected Exam Summary */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                {selectedExam?.examName}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {selectedExam?.course} •{" "}
                {selectedExam &&
                  new Date(selectedExam.examDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                • {selectedExam?.startTime} – {selectedExam?.endTime}
              </p>
            </div>
          </div>

          {/* Strategy Selector */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Allocation Strategy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STRATEGIES.map((s) => {
                const Icon = s.icon;
                const isSelected = strategy === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setStrategy(s.key)}
                    className={`text-left p-5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-500"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`font-semibold text-sm ${
                          isSelected
                            ? "text-blue-800 dark:text-blue-300"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hall Selection */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Select Halls
            </h3>
            {loadingHalls ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                <p className="text-sm text-gray-500 mt-2">Loading halls...</p>
              </div>
            ) : halls.length === 0 ? (
              <div className="py-10 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                <Building2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No active halls available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {halls.map((hall) => {
                  const isSelected = selectedHallIds.includes(hall._id);
                  return (
                    <label
                      key={hall._id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-600"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleHallSelection(hall._id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {hall.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {hall.building} • Capacity: {hall.capacity}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {hall.capacity}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Capacity Bar */}
          {selectedHallIds.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Selected Capacity
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {selectedCapacity} seats in {selectedHallIds.length} hall
                  {selectedHallIds.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((selectedCapacity / Math.max(selectedCapacity, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || selectedHallIds.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Allocation
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============== STEP 3: Review & Publish ============== */}
      {step === 3 && allocation && (
        <div className="space-y-6">
          {/* Allocation Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Strategy",
                value: allocation.strategy.replace("-", " "),
                icon: Shuffle,
                bg: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              },
              {
                label: "Total Students",
                value: allocation.totalStudents,
                icon: Users,
                bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
              },
              {
                label: "Halls Used",
                value: allocation.totalHalls,
                icon: Building2,
                bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {card.label}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 capitalize">
                        {card.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${card.bg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Status:
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                allocation.status === "published"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                  : allocation.status === "draft"
                  ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                  : "bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600"
              }`}
            >
              {allocation.status.charAt(0).toUpperCase() + allocation.status.slice(1)}
            </span>
          </div>

          {/* Warnings */}
          {allocation.warnings && allocation.warnings.length > 0 && (
            <div className="space-y-2">
              {allocation.warnings.map((warning, i) => (
                <div
                  key={i}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-sm">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Hall Seat Cards (Expandable) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Hall Allocations
            </h3>
            {allocation.allocations.map((group) => {
              const isExpanded = expandedHalls.has(group.hall);
              return (
                <div
                  key={group.hall}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpandHall(group.hall)}
                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {group.hallName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {group.seats.length} student{group.seats.length !== 1 ? "s" : ""}{" "}
                          assigned
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              <th className="px-6 py-3">Seat #</th>
                              <th className="px-6 py-3">Name</th>
                              <th className="px-6 py-3">Roll Number</th>
                              <th className="px-6 py-3">Department</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                            {group.seats.map((seat) => (
                              <tr
                                key={seat.seatNumber}
                                className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${getDeptColor(
                                  seat.department,
                                  deptColorMap
                                )}`}
                              >
                                <td className="px-6 py-3 font-mono font-semibold text-gray-900 dark:text-white">
                                  {seat.seatNumber}
                                </td>
                                <td className="px-6 py-3 text-gray-800 dark:text-gray-300">
                                  {seat.studentName}
                                </td>
                                <td className="px-6 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                                  {seat.rollNumber}
                                </td>
                                <td className="px-6 py-3">
                                  <span className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 font-medium">
                                    {seat.department}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {allocation.status === "draft" && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleRegenerate}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>

            <button
              onClick={() => handleExport("pdf")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>

            <button
              onClick={() => handleExport("csv")}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HallAllocation;
