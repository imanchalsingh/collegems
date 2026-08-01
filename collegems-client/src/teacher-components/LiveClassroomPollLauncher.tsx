import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import {
  Loader2,
  Radio,
  Send,
  Square,
  Timer,
  Trophy,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useSocket } from "../context/SocketContext";

type PollType = "single" | "multiple" | "wordcloud";

interface LeaderRow {
  userId: string;
  name: string;
  score: number;
  correct: number;
  answered: number;
}

interface PollState {
  sessionId: string;
  code: string;
  title: string;
  status: string;
  participantCount: number;
  question: {
    id: string;
    type: PollType;
    prompt: string;
    options: string[];
    durationSec: number;
    startedAt: number;
    endsAt: number;
    status: string;
  } | null;
  results: {
    optionCounts: { index: number; label: string; count: number }[];
    wordCloud: { word: string; count: number }[];
    totalResponses: number;
  };
  leaderboard: LeaderRow[];
}

const CHART_COLORS = ["#0f766e", "#0369a1", "#b45309", "#7c3aed", "#be123c", "#15803d"];

export default function LiveClassroomPollLauncher() {
  const { socket, isConnected } = useSocket();
  const [title, setTitle] = useState("Live Lecture Poll");
  const [sessionId, setSessionId] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<PollState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [pollType, setPollType] = useState<PollType>("single");
  const [prompt, setPrompt] = useState("");
  const [optionsText, setOptionsText] = useState("Option A\nOption B\nOption C\nOption D");
  const [durationSec, setDurationSec] = useState(30);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctIndexes, setCorrectIndexes] = useState<number[]>([0]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onState = (payload: PollState) => setState(payload);
    const onResults = (payload: { results: PollState["results"]; leaderboard: LeaderRow[] }) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              results: payload.results,
              leaderboard: payload.leaderboard,
            }
          : prev
      );
    };
    const onEnded = () => {
      setError("");
      setSessionId("");
      setCode("");
      setState(null);
    };
    const onError = (payload: { message?: string }) => setError(payload.message || "Socket error");

    socket.on("live-poll:state", onState);
    socket.on("live-poll:results", onResults);
    socket.on("live-poll:question-ended", onResults);
    socket.on("live-poll:session-ended", onEnded);
    socket.on("live-poll:error", onError);

    return () => {
      socket.off("live-poll:state", onState);
      socket.off("live-poll:results", onResults);
      socket.off("live-poll:question-ended", onResults);
      socket.off("live-poll:session-ended", onEnded);
      socket.off("live-poll:error", onError);
    };
  }, [socket]);

  const remainingSec = useMemo(() => {
    if (!state?.question || state.question.status !== "open") return 0;
    return Math.max(0, Math.ceil((state.question.endsAt - now) / 1000));
  }, [state, now]);

  const chartData = useMemo(() => {
    if (!state?.results) return [];
    if (state.question?.type === "wordcloud") {
      return state.results.wordCloud.map((w) => ({ name: w.word, count: w.count }));
    }
    return state.results.optionCounts.map((o) => ({ name: o.label, count: o.count }));
  }, [state]);

  const createSession = () => {
    if (!socket || !isConnected) {
      setError("Socket not connected. Refresh and ensure you are logged in.");
      return;
    }
    setBusy(true);
    setError("");
    socket.emit(
      "live-poll:create-session",
      { title, hostName: localStorage.getItem("name") || "Teacher" },
      (res: { ok?: boolean; sessionId?: string; code?: string; message?: string }) => {
        setBusy(false);
        if (!res?.ok) {
          setError(res?.message || "Could not create session");
          return;
        }
        setSessionId(res.sessionId || "");
        setCode(res.code || "");
      }
    );
  };

  const launchQuestion = () => {
    if (!socket || !sessionId) return;
    const options =
      pollType === "wordcloud"
        ? []
        : optionsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

    setBusy(true);
    socket.emit(
      "live-poll:start-question",
      {
        sessionId,
        type: pollType,
        prompt,
        options,
        durationSec,
        correctIndex: pollType === "single" ? correctIndex : undefined,
        correctIndexes: pollType === "multiple" ? correctIndexes : undefined,
      },
      (res: { ok?: boolean; message?: string }) => {
        setBusy(false);
        if (!res?.ok) setError(res?.message || "Failed to launch question");
      }
    );
  };

  const endQuestion = () => {
    if (!socket || !sessionId) return;
    socket.emit("live-poll:end-question", { sessionId });
  };

  const endSession = () => {
    if (!socket || !sessionId) return;
    socket.emit("live-poll:end-session", { sessionId });
  };

  const toggleMultiCorrect = (idx: number) => {
    setCorrectIndexes((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
    );
  };

  const optionLines = optionsText.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Live Classroom Polls
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Launch instant polls and timed quizzes. Students answer live; results and leaderboards
            update over Socket.io.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isConnected ? "Live" : "Offline"}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {!sessionId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Session title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            />
          </label>
          <button
            type="button"
            disabled={busy || !isConnected}
            onClick={createSession}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            Start live session
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500">Join code</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-teal-700 dark:text-teal-300">
                {code}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500">Participants</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                <Users className="h-5 w-5 text-slate-500" />
                {state?.participantCount ?? 1}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500">Timer</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                <Timer className="h-5 w-5 text-slate-500" />
                {remainingSec}s
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-900 dark:text-white">Launch question</h3>

              <div className="flex flex-wrap gap-2">
                {(["single", "multiple", "wordcloud"] as PollType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPollType(t)}
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      pollType === t
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {t === "wordcloud" ? "Word cloud" : t === "multiple" ? "Multiple choice" : "Single choice"}
                  </button>
                ))}
              </div>

              <label className="block text-sm">
                Prompt
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                  placeholder="What is the capital of France?"
                />
              </label>

              {pollType !== "wordcloud" && (
                <label className="block text-sm">
                  Options (one per line)
                  <textarea
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
              )}

              {pollType === "single" && optionLines.length > 0 && (
                <label className="block text-sm">
                  Correct option (for quiz scoring)
                  <select
                    value={correctIndex}
                    onChange={(e) => setCorrectIndex(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                  >
                    {optionLines.map((opt, i) => (
                      <option key={opt} value={i}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {pollType === "multiple" && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Correct options</p>
                  {optionLines.map((opt, i) => (
                    <label key={opt} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={correctIndexes.includes(i)}
                        onChange={() => toggleMultiCorrect(i)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              <label className="block text-sm">
                Duration (seconds)
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={durationSec}
                  onChange={(e) => setDurationSec(Number(e.target.value) || 30)}
                  className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !prompt.trim()}
                  onClick={launchQuestion}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Launch
                </button>
                <button
                  type="button"
                  onClick={endQuestion}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
                >
                  <Square className="h-4 w-4" /> End question
                </button>
                <button
                  type="button"
                  onClick={endSession}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm text-rose-700 dark:border-rose-800"
                >
                  End session
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
                  Live results
                  {state?.results?.totalResponses != null && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({state.results.totalResponses} responses)
                    </span>
                  )}
                </h3>
                {state?.question && (
                  <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{state.question.prompt}</p>
                )}
                <div className="h-64">
                  {chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      Waiting for answers…
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Trophy className="h-4 w-4 text-amber-500" /> Leaderboard
                </h3>
                <ol className="space-y-2">
                  {(state?.leaderboard || []).length === 0 && (
                    <li className="text-sm text-slate-400">Scores appear as students answer correctly and quickly.</li>
                  )}
                  {(state?.leaderboard || []).map((row, idx) => (
                    <li
                      key={row.userId}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
                    >
                      <span>
                        <span className="mr-2 font-mono text-xs text-slate-400">#{idx + 1}</span>
                        {row.name}
                      </span>
                      <span className="font-semibold tabular-nums">{row.score} pts</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
