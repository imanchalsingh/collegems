import { useEffect, useMemo, useState } from "react";
import {
  Code2,
  RefreshCw,
  AlertTriangle,
  Grid3X3,
  Columns2,
  Search,
} from "lucide-react";
import api from "../api/axios";

type AssignmentOption = {
  _id: string;
  title: string;
  course?: { name?: string; code?: string };
  submissions?: unknown[];
};

type MatchedBlock = {
  length: number;
  left: { startLine: number; endLine: number; excerpt: string };
  right: { startLine: number; endLine: number; excerpt: string };
};

type SimilarityPair = {
  leftId: string;
  rightId: string;
  leftLabel: string;
  rightLabel: string;
  similarity: number;
  similarityPercent: number;
  flagged: boolean;
  matchedBlocks: MatchedBlock[];
  leftCode: string;
  rightCode: string;
  leftLanguage?: string;
  rightLanguage?: string;
};

type AnalysisResult = {
  assignmentId?: string;
  assignmentTitle?: string;
  submissionIds: string[];
  labels: Record<string, string>;
  matrix: number[][];
  pairs: SimilarityPair[];
  flaggedPairs: SimilarityPair[];
  threshold: number;
  engine?: string;
};

const cellColor = (score: number) => {
  if (score >= 0.7) return "bg-red-500 text-white";
  if (score >= 0.4) return "bg-amber-400 text-gray-900";
  if (score >= 0.2) return "bg-emerald-200 text-emerald-900";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
};

function highlightLines(code: string, blocks: MatchedBlock[], side: "left" | "right") {
  const lines = code.split("\n");
  const hot = new Set<number>();
  for (const block of blocks) {
    const span = side === "left" ? block.left : block.right;
    for (let i = span.startLine; i <= span.endLine; i += 1) hot.add(i);
  }
  return lines.map((line, idx) => {
    const lineNo = idx + 1;
    const active = hot.has(lineNo);
    return (
      <div
        key={lineNo}
        className={`flex font-mono text-xs leading-5 ${
          active ? "bg-amber-200/80 dark:bg-amber-900/50" : ""
        }`}
      >
        <span className="w-10 shrink-0 select-none pr-2 text-right text-gray-400">{lineNo}</span>
        <span className="whitespace-pre-wrap break-all text-gray-900 dark:text-gray-100">{line || " "}</span>
      </div>
    );
  });
}

export default function CodePlagiarismReportView() {
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [threshold, setThreshold] = useState(0.35);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedPairKey, setSelectedPairKey] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingAssignments(true);
        const res = await api.get("/assignment/teacher");
        const list = Array.isArray(res.data) ? res.data : res.data?.assignments || [];
        setAssignments(list);
        if (list[0]?._id) setAssignmentId(list[0]._id);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || "Could not load assignments");
      } finally {
        setLoadingAssignments(false);
      }
    };
    void load();
  }, []);

  const selectedPair = useMemo(() => {
    if (!result || !selectedPairKey) return result?.pairs?.[0] || null;
    return result.pairs.find((p) => `${p.leftId}:${p.rightId}` === selectedPairKey) || null;
  }, [result, selectedPairKey]);

  const runAnalysis = async () => {
    setError("");
    setAnalyzing(true);
    try {
      if (demoMode) {
        const res = await api.post("/plagiarism/code/analyze", {
          threshold,
          submissions: [
            {
              id: "demo-a",
              label: "Alice",
              language: "python",
              code: `def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(6))\n`,
            },
            {
              id: "demo-b",
              label: "Bob",
              language: "python",
              code: `def fact(num):\n    if num <= 1:\n        return 1\n    return num * fact(num - 1)\n\nprint(fact(6))\n`,
            },
            {
              id: "demo-c",
              label: "Carol",
              language: "python",
              code: `def greet(name):\n    return f"Hello, {name}"\n\nprint(greet("class"))\n`,
            },
          ],
        });
        setResult(res.data);
        const top = res.data.pairs?.[0];
        setSelectedPairKey(top ? `${top.leftId}:${top.rightId}` : null);
        return;
      }

      if (!assignmentId) {
        setError("Select an assignment first");
        return;
      }
      const res = await api.post(`/plagiarism/code/check/${assignmentId}`, { threshold });
      setResult(res.data);
      const top = res.data.pairs?.[0];
      setSelectedPairKey(top ? `${top.leftId}:${top.rightId}` : null);
    } catch (err: any) {
      setResult(null);
      setError(
        err.response?.data?.message ||
          "Analysis failed. Start collegems-ml-service on port 8000.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Code plagiarism (AST + Winnowing)
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Structural similarity across Python, JavaScript, C++, and Java submissions —
                resistant to renamed variables.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_140px_auto] md:items-end">
          <label className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            Assignment
            <select
              value={assignmentId}
              disabled={loadingAssignments || demoMode}
              onChange={(e) => setAssignmentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {assignments.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.title}
                  {a.course?.code ? ` (${a.course.code})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            Threshold
            <input
              type="number"
              min={0.1}
              max={0.95}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <button
            type="button"
            disabled={analyzing}
            onClick={() => void runAnalysis()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analyzing…" : "Run AST analysis"}
          </button>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
          />
          Use demo snippets (no assignment files required)
        </label>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Grid3X3 className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold">Pairwise similarity matrix</h3>
              <span className="text-xs text-gray-500">
                {result.assignmentTitle || "Analysis"} · engine {result.engine || "ast-winnowing"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-gray-500">Student</th>
                    {result.submissionIds.map((id) => (
                      <th key={id} className="max-w-[88px] truncate p-2 text-gray-600 dark:text-gray-300">
                        {result.labels[id] || id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.matrix.map((row, i) => (
                    <tr key={result.submissionIds[i]}>
                      <td className="whitespace-nowrap p-2 font-medium text-gray-800 dark:text-gray-100">
                        {result.labels[result.submissionIds[i]] || result.submissionIds[i]}
                      </td>
                      {row.map((score, j) => (
                        <td key={`${i}-${j}`} className="p-1">
                          <button
                            type="button"
                            disabled={i === j}
                            onClick={() => {
                              const a = result.submissionIds[i];
                              const b = result.submissionIds[j];
                              const key = i < j ? `${a}:${b}` : `${b}:${a}`;
                              setSelectedPairKey(key);
                            }}
                            className={`w-full rounded px-2 py-1.5 font-semibold ${cellColor(score)} ${
                              i === j ? "cursor-default opacity-80" : "hover:ring-2 hover:ring-indigo-400"
                            }`}
                          >
                            {(score * 100).toFixed(0)}%
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.flaggedPairs?.length > 0 && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {result.flaggedPairs.length} pair(s) at or above threshold {(result.threshold * 100).toFixed(0)}%.
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Search className="h-4 w-4" /> Ranked pairs
              </div>
              <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                {result.pairs.map((pair) => {
                  const key = `${pair.leftId}:${pair.rightId}`;
                  const active = selectedPairKey === key;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setSelectedPairKey(key)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                          active
                            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                            : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {pair.leftLabel} ↔ {pair.rightLabel}
                        </div>
                        <div
                          className={`text-xs ${
                            pair.flagged ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          {pair.similarityPercent}% similar
                          {pair.flagged ? " · flagged" : ""}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Columns2 className="h-4 w-4" /> Side-by-side structural matches
              </div>
              {!selectedPair ? (
                <p className="text-sm text-gray-500">Select a pair to inspect copied blocks.</p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
                    {selectedPair.leftLabel} vs {selectedPair.rightLabel} —{" "}
                    <span className="font-semibold">{selectedPair.similarityPercent}%</span>
                    {selectedPair.matchedBlocks?.length
                      ? ` · ${selectedPair.matchedBlocks.length} matched block(s)`
                      : ""}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {selectedPair.leftLabel}
                      </div>
                      <div className="max-h-[360px] overflow-auto p-2">
                        {highlightLines(
                          selectedPair.leftCode || "",
                          selectedPair.matchedBlocks || [],
                          "left",
                        )}
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {selectedPair.rightLabel}
                      </div>
                      <div className="max-h-[360px] overflow-auto p-2">
                        {highlightLines(
                          selectedPair.rightCode || "",
                          selectedPair.matchedBlocks || [],
                          "right",
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
